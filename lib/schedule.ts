// lib/schedule.ts
import { sql } from '@vercel/postgres';
import { connectedAccountsService } from './connectedAccounts';

export interface Schedule {
  should_generate: boolean;
  should_post: boolean;
  generation_personas: string[];
  posting_personas: string[];
  schedule_ids?: string[];
  batch_size?: number;
  reason?: string;
}

export async function getGenerationBatchInfo(
  twitterHandle: string,
  debugMode: boolean = false
): Promise<Schedule> {
  const brandPersona = 'brand_engine';

  if (debugMode) {
    return {
      should_generate: true,
      should_post: true,
      generation_personas: [brandPersona],
      posting_personas: [brandPersona],
      batch_size: 1,
      reason: 'Debug mode',
    };
  }

  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 1,
      reason: 'Account not found',
    };
  }

  const scheduleResult = await sql`
    WITH current_local AS (
      SELECT 
        id, 
        COALESCE(timezone, 'Asia/Kolkata') as tz, 
        posting_times, 
        days_of_week,
        (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(timezone, 'Asia/Kolkata'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(timezone, 'Asia/Kolkata')))) as local_minutes,
        EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(timezone, 'Asia/Kolkata'))) as local_dow
      FROM account_schedules
      WHERE (
        connected_account_id = ${account.id} 
        OR brand_profile_id IN (
          SELECT id FROM brand_profiles 
          WHERE twitter_account_id = ${account.id} OR linkedin_account_id = ${account.id}
        )
      ) AND is_active = true
    ),
    expanded_times AS (
      SELECT 
        cl.*,
        jsonb_array_elements_text(CASE WHEN jsonb_typeof(cl.posting_times) = 'array' THEN cl.posting_times ELSE '["08:00"]'::jsonb END) as posting_time_str
      FROM current_local cl
    ),
    parsed_times AS (
      SELECT
        id, 
        tz as timezone, 
        local_minutes, 
        local_dow, 
        days_of_week,
        (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) as start_time,
        (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) + 30 as end_time
      FROM expanded_times
    )
    SELECT id, timezone, start_time, end_time, local_minutes, local_dow
    FROM parsed_times
    WHERE days_of_week @> to_jsonb(local_dow::int)
      AND (
        (start_time - local_minutes + 1440) % 1440 <= 60 -- JIT GENERATION: 
        OR 
        (local_minutes - start_time + 1440) % 1440 <= 60  -- LATE-CATCH: Up to 1 hour after
      )
    ORDER BY start_time ASC
  `;

  const activeSchedules = scheduleResult.rows;

  if (activeSchedules.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 1,
      reason: 'No schedules in generation window',
    };
  }

  const tzResult = await sql`SELECT (NOW() AT TIME ZONE ${activeSchedules[0].timezone})::date as local_date`;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tzResult.rows[0].local_date);

  const schedulesToGenerate: string[] = [];

  for (const schedule of activeSchedules) {
    // Check if already generated today first
    const existingSlot = await sql`
      SELECT generation_count FROM generation_slots
      WHERE connected_account_id = ${account.id}
        AND schedule_id = ${schedule.id}
        AND slot_date = ${today}
    `;

    if (existingSlot.rows[0]?.generation_count >= 1) continue;

    // Atomic insert
    const result = await sql`
      INSERT INTO generation_slots (connected_account_id, schedule_id, slot_date, slot_hour, slot_minute, generation_count, posting_count, last_generated_at, created_at, updated_at)
      VALUES (${account.id}, ${schedule.id}, ${today}, 0, 0, 1, 0, NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING generation_count
    `;

    if (result.rows.length > 0 && result.rows[0].generation_count === 1) {
      schedulesToGenerate.push(schedule.id);
    }
  }

  if (schedulesToGenerate.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 1,
      reason: 'Already generated today',
    };
  }

  return {
    should_generate: true,
    should_post: true,
    generation_personas: [brandPersona],
    posting_personas: [brandPersona],
    schedule_ids: schedulesToGenerate,
    batch_size: 1,
  };
}

export interface PostingSchedule {
  should_post: boolean;
  personas: string[];
  reason?: string;
}

export async function getPostingBatchInfo(twitterHandle: string): Promise<PostingSchedule> {
  const brandPersona = 'brand_engine';
  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) return { should_post: false, personas: [], reason: 'Account not found' };

  const scheduleResult = await sql`
    WITH current_local AS (
      SELECT 
        id, 
        COALESCE(timezone, 'Asia/Kolkata') as tz, 
        posting_times, 
        days_of_week,
        (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(timezone, 'Asia/Kolkata'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(timezone, 'Asia/Kolkata')))) as local_minutes,
        EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(timezone, 'Asia/Kolkata'))) as local_dow
      FROM account_schedules
      WHERE (
        connected_account_id = ${account.id} 
        OR brand_profile_id IN (
          SELECT id FROM brand_profiles 
          WHERE twitter_account_id = ${account.id} OR linkedin_account_id = ${account.id}
        )
      ) AND is_active = true
    ),
    expanded_times AS (
      SELECT 
        cl.*,
        jsonb_array_elements_text(CASE WHEN jsonb_typeof(cl.posting_times) = 'array' THEN cl.posting_times ELSE '["08:00"]'::jsonb END) as posting_time_str
      FROM current_local cl
    ),
    parsed_times AS (
      SELECT
        id, 
        tz as timezone, 
        local_minutes, 
        local_dow, 
        days_of_week,
        (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) as start_time,
        (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) + 30 as end_time
      FROM expanded_times
    )
    SELECT id, timezone, start_time, end_time
    FROM parsed_times
    WHERE days_of_week @> to_jsonb(local_dow::int)
      AND (
        (local_minutes >= start_time AND local_minutes <= end_time)
        OR
        ((local_minutes - start_time + 1440) % 1440 >= 0 AND (local_minutes - start_time + 1440) % 1440 <= 60)
      )
    ORDER BY start_time
    LIMIT 1
  `;

  const activeSchedule = scheduleResult.rows[0];
  if (!activeSchedule) return { should_post: false, personas: [], reason: 'No schedule in posting window' };

  const scheduleId = activeSchedule.id;
  const tzResult = await sql`SELECT (NOW() AT TIME ZONE ${activeSchedule.timezone})::date as local_date`;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tzResult.rows[0].local_date);

  const postingResult = await sql`
    INSERT INTO generation_slots (connected_account_id, schedule_id, slot_date, slot_hour, slot_minute, posting_count, last_posted_at, created_at, updated_at)
    VALUES (${account.id}, ${scheduleId}, ${today}, 0, 0, 1, NOW(), NOW(), NOW())
    ON CONFLICT (connected_account_id, schedule_id, slot_date)
    DO UPDATE SET posting_count = generation_slots.posting_count + 1, last_posted_at = NOW()
    RETURNING posting_count
  `;

  if (postingResult.rows[0]?.posting_count > 1) {
    return { should_post: false, personas: [], reason: 'Already posted today' };
  }

  await sql`UPDATE account_schedules SET updated_at = NOW() WHERE id = ${scheduleId}`;

  return { should_post: true, personas: [brandPersona] };
}
