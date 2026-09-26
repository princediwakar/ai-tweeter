import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const result = await sql`
    WITH current_local AS (
      SELECT 
        a.id,
        s.id as schedule_id,
        s.posting_times,
        s.days_of_week,
        (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'Asia/Kolkata'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'Asia/Kolkata')))) as local_minutes,
        EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'Asia/Kolkata'))) as local_dow
      FROM connected_accounts a
      JOIN account_schedules s ON s.connected_account_id = a.id
      WHERE a.is_active = true AND s.is_active = true
    ),
    expanded_times AS (
      SELECT 
        cl.id,
        cl.schedule_id,
        cl.local_minutes,
        cl.local_dow,
        cl.days_of_week,
        jsonb_array_elements_text(cl.posting_times) as posting_time_str
      FROM current_local cl
    ),
    parsed_times AS (
      SELECT
        id,
        schedule_id,
        local_minutes,
        local_dow,
        days_of_week,
        (split_part(posting_time_str, ':', 1)::int * 60 + split_part(posting_time_str, ':', 2)::int) as start_time
      FROM expanded_times
    )
    SELECT pt.id
    FROM parsed_times pt
    LEFT JOIN generation_slots gs 
      ON gs.connected_account_id = pt.id 
      AND gs.schedule_id = pt.schedule_id 
      AND gs.slot_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
    WHERE pt.days_of_week @> to_jsonb(pt.local_dow::int)
      AND (
        (pt.start_time - pt.local_minutes + 1440) % 1440 <= 60 
      )
      AND gs.id IS NULL
    GROUP BY pt.id
  `;
  console.log(result.rows);
}
main().catch(console.error);
