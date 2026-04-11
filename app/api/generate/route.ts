// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { tasks } from "@trigger.dev/sdk";
// Import the task definition from your trigger folder
import { generateAccountContent } from '@/trigger/generate-content'; 

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find all accounts that have a schedule coming up in the next 60 minutes
  const accountsWithSchedules = await sql`
    WITH current_local AS (
      SELECT 
        a.id,
        s.id as schedule_id,
        s.start_time,
        s.days_of_week,
        (EXTRACT(HOUR FROM timezone(COALESCE(s.timezone, 'UTC'), NOW())) * 60 + EXTRACT(MINUTE FROM timezone(COALESCE(s.timezone, 'UTC'), NOW()))) as local_minutes,
        EXTRACT(ISODOW FROM timezone(COALESCE(s.timezone, 'UTC'), NOW())) as local_dow
      FROM connected_accounts a
      JOIN account_schedules s ON s.connected_account_id = a.id
      WHERE a.is_active = true AND s.is_active = true
    )
    SELECT cl.id
    FROM current_local cl
    -- Left join to see if a slot already exists for today
    LEFT JOIN generation_slots gs 
      ON gs.connected_account_id = cl.id 
      AND gs.schedule_id = cl.schedule_id 
      AND gs.slot_date = CURRENT_DATE
    WHERE cl.local_dow = ANY(cl.days_of_week)
      AND (
        (cl.start_time - cl.local_minutes + 1440) % 1440 <= 60 
      )
      -- ONLY select accounts that DO NOT have a generation slot today
      AND gs.id IS NULL
    GROUP BY cl.id
  `;

  if (accountsWithSchedules.rows.length === 0) {
    return NextResponse.json({ success: true, message: 'No accounts due.' });
  }

  // FIRE AND FORGET. Hand the work over to Trigger.dev.
  console.log("Trigger Key Prefix:", process.env.TRIGGER_SECRET_KEY ? process.env.TRIGGER_SECRET_KEY.substring(0, 10) : "UNDEFINED");
  for (const account of accountsWithSchedules.rows) {
    await tasks.trigger<typeof generateAccountContent>("generate-account-content", {
      accountId: account.id,
    });
  }

  // Vercel container closes immediately. 1-second execution time.
  return NextResponse.json({
    success: true,
    message: `Dispatched ${accountsWithSchedules.rows.length} jobs to Trigger.dev.`,
  }, { status: 200 });
}