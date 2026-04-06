// lib/schedule.ts
import { sql } from '@vercel/postgres';
import { connectedAccountsService } from './connectedAccounts';
import { getAllPersonas } from './personas';
import { getPersonaById } from './db';

const GENERATION_WINDOW_MINUTES = 60;

interface ScheduleRow {
  id: string;
  connected_account_id: string;
  name: string;
  persona_id?: string | null;
  timezone: string;
  schedule_config: Record<string, unknown>;
  days_of_week: number[];
  start_time: number;
  end_time: number;
  is_active: boolean;
  last_generated_at?: Date | null;
  last_posted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  should_generate: boolean;
  should_post: boolean;
  generation_personas: string[];
  posting_personas: string[];
  schedule_ids?: string[]; // IDs of schedules that need generation this run
  batch_size?: number;
  reason?: string;
}

export async function getGenerationBatchInfo(
  twitterHandle: string,
  debugMode: boolean = false
): Promise<Schedule> {
  if (debugMode) {
    const allPersonas = await getAllPersonas();
    const debugPersonas = allPersonas.length > 0 
      ? allPersonas.map(p => p.key).filter(Boolean) 
      : [];
    
    if (debugPersonas.length === 0) {
      return {
        should_generate: false,
        should_post: false,
        generation_personas: [],
        posting_personas: [],
        batch_size: 5,
        reason: 'No personas available for debug mode',
      };
    }
    
    return {
      should_generate: true,
      should_post: true,
      generation_personas: debugPersonas,
      posting_personas: debugPersonas,
      batch_size: 5,
    };
  }

  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: 'Account not found',
    };
  }

  // Use Postgres to calculate exact local time and day of week natively
  // Fetch ALL matching schedules (not just LIMIT 1) so each gets its own generation slot
  const scheduleResult = await sql`
    WITH current_local AS (
      SELECT 
        id, timezone, start_time, end_time, persona_id, days_of_week,
        (EXTRACT(HOUR FROM timezone(timezone, NOW())) * 60 + EXTRACT(MINUTE FROM timezone(timezone, NOW()))) as local_minutes,
        EXTRACT(DOW FROM timezone(timezone, NOW())) as local_dow
      FROM account_schedules
      WHERE connected_account_id = ${account.id} AND is_active = true
    )
    SELECT id, timezone, start_time, end_time, persona_id, local_minutes, local_dow
    FROM current_local
    WHERE local_dow = ANY(days_of_week)
      AND (local_minutes - start_time + 1440) % 1440 >= 0
      AND (local_minutes - start_time + 1440) % 1440 < ${GENERATION_WINDOW_MINUTES}
    ORDER BY start_time ASC
  `;

  const activeSchedules = scheduleResult.rows;

  if (activeSchedules.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: 'No schedule matches current generation window in local timezone',
    };
  }

  // Get today's date in the account's local timezone (use first schedule's timezone)
  const tzResult = await sql`SELECT timezone(${activeSchedules[0].timezone}, NOW())::date as local_date`;
  const today = tzResult.rows[0].local_date.toISOString().split('T')[0];

  // Process each schedule independently — create one generation_slots row per schedule
  const schedulesToGenerate: { scheduleId: string; personaId: string | null }[] = [];

  for (const schedule of activeSchedules) {
    const result = await sql`
      INSERT INTO generation_slots (connected_account_id, schedule_id, slot_date, slot_hour, slot_minute, generation_count, last_generated_at, created_at, updated_at)
      VALUES (${account.id}, ${schedule.id}, ${today}, 0, 0, 1, NOW(), NOW(), NOW())
      ON CONFLICT (connected_account_id, schedule_id, slot_date)
      DO UPDATE SET generation_count = generation_slots.generation_count + 1, last_generated_at = NOW()
      RETURNING generation_count
    `;

    // Only generate if this is the FIRST run for this schedule today (count == 1)
    if (result.rows[0]?.generation_count === 1) {
      schedulesToGenerate.push({ scheduleId: schedule.id, personaId: schedule.persona_id || null });
    }
  }

  if (schedulesToGenerate.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: 'Generation already completed for all matching schedules today',
    };
  }

  // Resolve personas for each schedule that needs generation
  const personas: string[] = [];
  const scheduleIds: string[] = [];

  for (const { scheduleId, personaId } of schedulesToGenerate) {
    scheduleIds.push(scheduleId);
    if (personaId) {
      const dbPersona = await getPersonaById(personaId);
      if (dbPersona?.key) {
        personas.push(dbPersona.key);
      }
    }
  }

  // Fall back to account-level personas if no schedule-level personas resolved
  if (personas.length === 0) {
    const fallbackPersonas = account.personas?.filter(Boolean) || [];
    personas.push(...fallbackPersonas);
  }

  return {
    should_generate: true,
    should_post: true,
    generation_personas: personas,
    posting_personas: personas,
    schedule_ids: scheduleIds,
    batch_size: 5,
  };
}

export interface PostingSchedule {
  should_post: boolean;
  personas: string[];
  reason?: string;
}

export async function getPostingBatchInfo(
  twitterHandle: string
): Promise<PostingSchedule> {
  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) {
    return { should_post: false, personas: [], reason: 'Account not found' };
  }

  const scheduleResult = await sql`
    WITH current_local AS (
      SELECT 
        id, timezone, persona_id, start_time, end_time, days_of_week,
        (EXTRACT(HOUR FROM timezone(timezone, NOW())) * 60 + EXTRACT(MINUTE FROM timezone(timezone, NOW()))) as local_minutes,
        EXTRACT(DOW FROM timezone(timezone, NOW())) as local_dow
      FROM account_schedules
      WHERE connected_account_id = ${account.id} AND is_active = true
    )
    SELECT id, timezone, persona_id, start_time, end_time
    FROM current_local
    WHERE local_dow = ANY(days_of_week)
      AND start_time <= local_minutes
      AND end_time >= local_minutes
    ORDER BY start_time
    LIMIT 1
  `;

  const activeSchedule = scheduleResult.rows[0];
  if (!activeSchedule) {
    return { should_post: false, personas: [], reason: 'No schedule in posting window' };
  }

  const scheduleId = activeSchedule.id;
  const tzResult = await sql`SELECT timezone(${activeSchedule.timezone}, NOW())::date as local_date`;
  const today = tzResult.rows[0].local_date.toISOString().split('T')[0];

  const postingResult = await sql`
    INSERT INTO generation_slots (connected_account_id, schedule_id, slot_date, slot_hour, slot_minute, posting_count, last_posted_at, created_at, updated_at)
    VALUES (${account.id}, ${scheduleId}, ${today}, 0, 0, 1, NOW(), NOW(), NOW())
    ON CONFLICT (connected_account_id, schedule_id, slot_date)
    DO UPDATE SET posting_count = generation_slots.posting_count + 1, last_posted_at = NOW()
    RETURNING posting_count
  `;

  if (postingResult.rows[0]?.posting_count > 1) {
    return { 
      should_post: false, 
      personas: [], 
      reason: 'Posting already completed for this schedule today' 
    };
  }

  await sql`
    UPDATE account_schedules
    SET last_posted_at = NOW()
    WHERE id = ${scheduleId}
  `;

  let personas: string[] = [];
  if (activeSchedule.persona_id) {
    const dbPersona = await getPersonaById(activeSchedule.persona_id);
    if (dbPersona?.key) {
      personas = [dbPersona.key];
    }
  } else {
    personas = account.personas?.filter(Boolean) || [];
  }

  return { should_post: true, personas };
}

// Ensure the rest of your helper functions match standard UTC or Db-driven logic if necessary.