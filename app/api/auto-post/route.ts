// app/api/auto-post/route.ts
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
    logger.info(`🔍 [Session:${sessionId}] [Twitter] Auto-post check starting`, 'auto-post');

    // SCALABLE NATIVE TIME RESOLUTION
    // Eliminates N+1 queries and the IST timezone bug.
    // Dynamically calculates local time, aggregates personas, and collects schedule IDs.
    const accountsDue = await sql`
      WITH current_local AS (
        SELECT 
          a.id as account_id, 
          a.name, 
          a.account_username as twitter_handle, 
          a.platform,
          s.id as schedule_id,
          s.persona_id, 
          s.start_time, 
          s.end_time, 
          s.days_of_week,
          (EXTRACT(HOUR FROM timezone(s.timezone, NOW())) * 60 + EXTRACT(MINUTE FROM timezone(s.timezone, NOW()))) as local_minutes,
          EXTRACT(DOW FROM timezone(s.timezone, NOW())) as local_dow,
          p.key as persona_key
        FROM connected_accounts a
        JOIN account_schedules s ON s.connected_account_id = a.id
        LEFT JOIN personas p ON s.persona_id = p.id
        WHERE a.is_active = true
          AND a.platform = 'twitter'
          AND s.is_active = true
      )
      SELECT 
        account_id as id, 
        name, 
        array_agg(DISTINCT persona_key) as personas,
        array_agg(DISTINCT schedule_id) as schedule_ids
      FROM current_local
      WHERE local_dow = ANY(days_of_week)
        -- Window logic: Is current local time within the schedule's active bounds?
        AND local_minutes >= start_time 
        AND local_minutes <= end_time
      GROUP BY account_id, name
      LIMIT 50
    `;

    if (accountsDue.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No Twitter accounts due for posting in their local timezone.',
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📋 [Session:${sessionId}] Found ${accountsDue.rows.length} Twitter accounts due for posting`, 'auto-post');

    let totalPosted = 0;
    let totalErrors = 0;

    for (const account of accountsDue.rows) {
      try {
        // Unpack the aggregated arrays, filtering out nulls
        const personas = (account.personas || []).filter(Boolean) as string[];
        const scheduleIds = (account.schedule_ids || []).filter(Boolean) as string[];

        if (personas.length === 0) continue;

        const result = await postSingleContent(account.id, personas, 'twitter', BATCH_SIZE);
        
        // Efficient targeted update using the exact schedule IDs we already fetched
        if (result.posted > 0 && scheduleIds.length > 0) {
          // Serialize JS array to Postgres array literal string: '{id1,id2}'
          // This satisfies Vercel's Primitive type requirement.
          const pgArrayString = `{${scheduleIds.join(',')}}`;
          
          await sql`
            UPDATE account_schedules
            SET last_posted_at = NOW()
            WHERE id = ANY(${pgArrayString}::uuid[])
          `;
        }

        totalPosted += result.posted;
        totalErrors += result.errors;
        logger.info(`📝 [Session:${sessionId}] ${account.name}: Twitter posted ${result.posted}`, 'auto-post');
      } catch (error) {
        logger.error(`❌ [Session:${sessionId}] ${account.name}: Twitter posting failed`, 'auto-post', error as Error);
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
    logger.error('[Twitter] Auto-post failed', 'auto-post', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}