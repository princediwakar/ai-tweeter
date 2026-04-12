import { schedules, logger } from "@trigger.dev/sdk";
import { sql } from '@vercel/postgres';
import { generateAccountContent } from './generate-content';

export const scheduledGenerator = schedules.task({
  id: "scheduled-generator",
  cron: "*/5 * * * *",
  run: async (payload, { ctx }) => {
    logger.info("Running scheduled generator", { timestamp: payload.timestamp });

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
      LEFT JOIN generation_slots gs 
        ON gs.connected_account_id = cl.id 
        AND gs.schedule_id = cl.schedule_id 
        AND gs.slot_date = CURRENT_DATE
      WHERE cl.local_dow = ANY(cl.days_of_week)
        AND (
          (cl.start_time - cl.local_minutes + 1440) % 1440 <= 60 
        )
        AND gs.id IS NULL
      GROUP BY cl.id
    `;

    if (accountsWithSchedules.rows.length === 0) {
      logger.info("No accounts due for generation");
      return { success: true, message: 'No accounts due.' };
    }

    logger.info(`Found ${accountsWithSchedules.rows.length} accounts due for generation`);

    for (const account of accountsWithSchedules.rows) {
      await generateAccountContent.trigger({ accountId: account.id });
    }

    return { 
      success: true, 
      message: `Dispatched ${accountsWithSchedules.rows.length} jobs to Trigger.dev.` 
    };
  },
});