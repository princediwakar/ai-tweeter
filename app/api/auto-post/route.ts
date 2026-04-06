import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getCurrentTimeInIST, getCurrentISTHour, getCurrentISTMinute } from '@/lib/utils';
import { postSingleContent } from '@/lib/postingService';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowIST = getCurrentTimeInIST();
    const currentHourIST = getCurrentISTHour(nowIST);
    const currentMinuteIST = getCurrentISTMinute(nowIST);
    const currentMinutes = currentHourIST * 60 + currentMinuteIST;
    const dayOfWeek = Math.floor((nowIST.getDay() + 6) % 7) + 1; // 1=Mon, 7=Sun

    logger.info(`🔍 [GET] Auto-post check at ${currentHourIST}:${currentMinuteIST} IST`, 'auto-post');

    // SCALABLE: Query accounts in posting window (±60 min around current time)
    const accountsDue = await sql`
      SELECT a.id, a.name, a.account_username as twitter_handle, a.platform
      FROM connected_accounts a
      JOIN account_schedules s ON s.connected_account_id = a.id
      WHERE a.is_active = true
        AND a.platform = 'twitter'
        AND s.is_active = true
        AND ${dayOfWeek} = ANY(s.days_of_week)
        AND s.start_time >= ${currentMinutes - 60}
        AND s.start_time <= ${currentMinutes + 60}
      GROUP BY a.id
      LIMIT 50
    `;

    if (accountsDue.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No accounts due for posting',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📋 Found ${accountsDue.rows.length} accounts due for posting`, 'auto-post');

    let totalPosted = 0;
    let totalErrors = 0;

    for (const account of accountsDue.rows) {
      try {
        // Get personas from the schedule(s) that match this time
        const scheduleResult = await sql`
          SELECT s.persona_id, p.key as persona_key
          FROM account_schedules s
          LEFT JOIN personas p ON s.persona_id = p.id
          WHERE s.connected_account_id = ${account.id}
            AND s.is_active = true
            AND ${dayOfWeek} = ANY(s.days_of_week)
            AND s.start_time <= ${currentMinutes}
            AND s.end_time > ${currentMinutes}
        `;

        const personas = scheduleResult.rows
          .map(r => r.persona_key)
          .filter(Boolean) as string[];

        if (personas.length === 0) continue;

        const result = await postSingleContent(account.id, personas, 'twitter', BATCH_SIZE);
        
        // Update last_posted_at for the schedules
        if (result.posted > 0) {
          await sql`
            UPDATE account_schedules
            SET last_posted_at = NOW()
            WHERE connected_account_id = ${account.id}
              AND is_active = true
              AND ${dayOfWeek} = ANY(days_of_week)
              AND start_time <= ${currentMinutes}
              AND end_time > ${currentMinutes}
          `;
        }

        totalPosted += result.posted;
        totalErrors += result.errors;
        logger.info(`📝 ${account.name}: Posted ${result.posted}`, 'auto-post');
      } catch (error) {
        logger.error(`❌ ${account.name}: Posting failed`, 'auto-post', error as Error);
        totalErrors++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      posted: totalPosted,
      errors: totalErrors,
      accountsProcessed: accountsDue.rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[GET] Auto-post failed', 'auto-post', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}