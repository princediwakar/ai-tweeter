// app/api/auto-post-linkedin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { postSingleContent } from '@/lib/postingService';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 5;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = Math.random().toString(36).substring(2, 8);
    logger.info(`🔍 [Session:${sessionId}] [LinkedIn] Auto-post check starting`, 'auto-post-linkedin');

    // SCALABLE NATIVE TIME RESOLUTION
    // This entirely eliminates the N+1 query problem and the IST bug.
    // It dynamically calculates local time and aggregates personas in one trip to the DB.
    const accountsDue = await sql`
      WITH current_local AS (
        SELECT 
          a.id, a.name, a.account_username,
          s.persona_id, s.start_time, s.end_time, s.days_of_week, s.timezone,
          (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC')))) as local_minutes,
          EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) as local_dow,
          p.key as persona_key
        FROM connected_accounts a
        JOIN account_schedules s ON s.connected_account_id = a.id
        LEFT JOIN personas p ON s.persona_id = p.id
        WHERE a.is_active = true
          AND a.platform = 'linkedin'
          AND s.is_active = true
      )
      SELECT 
        id, 
        name, 
        array_agg(persona_key) as personas
      FROM current_local
      WHERE local_dow = ANY(current_local.days_of_week)
        -- Window logic: Is current local time within the schedule's active bounds?
        AND local_minutes >= current_local.start_time 
        AND local_minutes <= current_local.end_time
      GROUP BY id, name
      LIMIT 50
    `;

    if (accountsDue.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No LinkedIn accounts due for posting in their local timezone.',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📋 [Session:${sessionId}] Found ${accountsDue.rows.length} LinkedIn accounts due for posting`, 'auto-post-linkedin');

    let totalPosted = 0;
    let totalErrors = 0;

    for (const account of accountsDue.rows) {
      try {
        const personas = (account.personas || []).filter(Boolean) as string[];

        if (personas.length === 0) continue;

        const result = await postSingleContent(account.id, personas, 'linkedin', BATCH_SIZE);

        totalPosted += result.posted;
        totalErrors += result.errors;
        logger.info(`📝 ${account.name}: LinkedIn posted ${result.posted}`, 'auto-post-linkedin');
      } catch (error) {
        logger.error(`❌ ${account.name}: LinkedIn posting failed`, 'auto-post-linkedin', error as Error);
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
    logger.error('[LinkedIn] Auto-post failed', 'auto-post-linkedin', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}