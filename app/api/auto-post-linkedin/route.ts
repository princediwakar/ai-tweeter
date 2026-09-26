// app/api/auto-post-linkedin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { postSingleContent } from '@/lib/postingService';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 1;

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
          a.id as account_id, 
          a.name, 
          a.account_username, 
          a.platform,
          s.id as schedule_id,
          s.persona_id, 
          s.posting_times,
          s.days_of_week,
          s.timezone,
          s.last_posted_at,
          (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'Asia/Kolkata'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'Asia/Kolkata')))) as local_minutes,
          EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'Asia/Kolkata'))) as local_dow,
          p.key as persona_key
        FROM connected_accounts a
        JOIN account_schedules s ON (
          s.connected_account_id = a.id 
          OR s.brand_profile_id IN (
            SELECT id FROM brand_profiles 
            WHERE twitter_account_id = a.id OR linkedin_account_id = a.id
          )
        )
        LEFT JOIN personas p ON s.persona_id = p.id
        WHERE a.is_active = true
          AND a.platform = 'linkedin'
          AND s.is_active = true
      ),
      expanded_times AS (
        SELECT 
          cl.*,
          jsonb_array_elements_text(CASE WHEN jsonb_typeof(cl.posting_times) = 'array' THEN cl.posting_times ELSE '["08:00"]'::jsonb END) as posting_time_str
        FROM current_local cl
      ),
      parsed_times AS (
        SELECT
          *,
          (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) as start_time,
          (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) + 30 as end_time
        FROM expanded_times
      )
      SELECT 
        account_id as id, 
        name, 
        array_agg(DISTINCT persona_key) as personas,
        array_agg(DISTINCT schedule_id) as schedule_ids
      FROM parsed_times
      WHERE local_dow = ANY(days_of_week)
        AND local_minutes >= start_time 
        AND local_minutes <= end_time
        AND (last_posted_at IS NULL OR (EXTRACT(EPOCH FROM (NOW() - last_posted_at)) / 60) > 45)
      GROUP BY account_id, name
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
        const scheduleIds = (account.schedule_ids || []).filter(Boolean) as string[];

        if (personas.length === 0) continue;

        const result = await postSingleContent(account.id, personas, 'linkedin', BATCH_SIZE);

        if (result.posted > 0 && scheduleIds.length > 0) {
          const pgArrayString = `{${scheduleIds.join(',')}}`;
          await sql`
            UPDATE account_schedules
            SET last_posted_at = NOW()
            WHERE id = ANY(${pgArrayString}::uuid[])
          `;
        }

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