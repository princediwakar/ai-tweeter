// lib/schedule.ts
import { sql } from '@vercel/postgres';
import { connectedAccountsService } from './connectedAccounts';
import { getAllPersonas } from './personas';
import { getPersonaById } from './db';

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
  if (debugMode) {
    const allPersonas = await getAllPersonas();
    const debugPersonas = allPersonas.length > 0 
      ? allPersonas.map(p => p.key).filter(Boolean) 
      : [];
    
    if (debugPersonas.length === 0) {
      return { should_generate: false, should_post: false, generation_personas: [], posting_personas: [], batch_size: 1, reason: 'No personas' };
    }
    return { should_generate: true, should_post: true, generation_personas: debugPersonas, posting_personas: debugPersonas, batch_size: 1, reason: 'Debug mode' };
  }

  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) {
    return { should_generate: false, should_post: false, generation_personas: [], posting_personas: [], batch_size: 1, reason: 'Account not found' };
  }

  const scheduleResult = await sql`
    WITH current_local AS (
      SELECT 
        id, COALESCE(timezone, 'UTC') as tz, start_time, end_time, persona_id, days_of_week,
        (EXTRACT(HOUR FROM timezone(COALESCE(timezone, 'UTC'), NOW())) * 60 + EXTRACT(MINUTE FROM timezone(COALESCE(timezone, 'UTC'), NOW()))) as local_minutes,
        EXTRACT(ISODOW FROM timezone(COALESCE(timezone, 'UTC'), NOW())) as local_dow
      FROM account_schedules
      WHERE connected_account_id = ${account.id} AND is_active = true
    )
    SELECT id, tz as timezone, start_time, end_time, persona_id, local_minutes, local_dow
    FROM current_local
    WHERE local_dow = ANY(days_of_week)
      AND (
        (start_time - local_minutes + 1440) % 1440 <= 60 -- JIT GENERATION: 
        OR 
        (local_minutes - start_time + 1440) % 1440 <= 60  -- LATE-CATCH: Up to 1 hour after
      )
    ORDER BY start_time ASC
  `;

  const activeSchedules = scheduleResult.rows;

  if (activeSchedules.length === 0) {
    return { should_generate: false, should_post: false, generation_personas: [], posting_personas: [], batch_size: 1, reason: 'No schedules in generation window' };
  }

  const tzResult = await sql`SELECT timezone(${activeSchedules[0].timezone}, NOW())::date as local_date`;
  const today = tzResult.rows[0].local_date.toISOString().split('T')[0];

  const schedulesToGenerate: { scheduleId: string; personaId: string | null }[] = [];

  for (const schedule of activeSchedules) {
    const existingSlot = await sql`
      SELECT generation_count FROM generation_slots
      WHERE connected_account_id = ${account.id}
        AND schedule_id = ${schedule.id}
        AND slot_date = ${today}
    `;

    if (existingSlot.rows[0]?.generation_count >= 1) continue;

    // FIX #1 IMPLEMENTED: Explicitly setting posting_count to 0
    const result = await sql`
      INSERT INTO generation_slots (connected_account_id, schedule_id, slot_date, slot_hour, slot_minute, generation_count, posting_count, last_generated_at, created_at, updated_at)
      VALUES (${account.id}, ${schedule.id}, ${today}, 0, 0, 1, 0, NOW(), NOW(), NOW())
      ON CONFLICT (connected_account_id, schedule_id, slot_date)
      DO NOTHING
      RETURNING generation_count
    `;

    if (result.rows.length > 0 && result.rows[0].generation_count === 1) {
      schedulesToGenerate.push({ scheduleId: schedule.id, personaId: schedule.persona_id || null });
    }
  }

  if (schedulesToGenerate.length === 0) {
    return { should_generate: false, should_post: false, generation_personas: [], posting_personas: [], batch_size: 1, reason: 'Already generated today' };
  }

  const personas: string[] = [];
  const scheduleIds: string[] = [];

  for (const { scheduleId, personaId } of schedulesToGenerate) {
    scheduleIds.push(scheduleId);
    if (personaId) {
      const dbPersona = await getPersonaById(personaId);
      if (dbPersona?.key) personas.push(dbPersona.key);
    }
  }

  if (personas.length === 0) {
    const allPersonas = await getAllPersonas();
    const fallbackPersonas = allPersonas.filter(p => p.is_active).map(p => p.key);
    personas.push(...fallbackPersonas);
  }

  return {
    should_generate: true,
    should_post: true,
    generation_personas: personas,
    posting_personas: personas,
    schedule_ids: scheduleIds,
    batch_size: 1, // Keep this at 1 to respect Vercel timeouts
  };
}

export interface PostingSchedule {
  should_post: boolean;
  personas: string[];
  reason?: string;
}

export async function getPostingBatchInfo(twitterHandle: string): Promise<PostingSchedule> {
  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) return { should_post: false, personas: [], reason: 'Account not found' };

  const scheduleResult = await sql`
    WITH current_local AS (
      SELECT 
        id, COALESCE(timezone, 'UTC') as tz, persona_id, start_time, end_time, days_of_week,
        (EXTRACT(HOUR FROM timezone(COALESCE(timezone, 'UTC'), NOW())) * 60 + EXTRACT(MINUTE FROM timezone(COALESCE(timezone, 'UTC'), NOW()))) as local_minutes,
        EXTRACT(ISODOW FROM timezone(COALESCE(timezone, 'UTC'), NOW())) as local_dow
      FROM account_schedules
      WHERE connected_account_id = ${account.id} AND is_active = true
    )
    SELECT id, tz as timezone, persona_id, start_time, end_time
    FROM current_local
    WHERE local_dow = ANY(days_of_week)
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
  const tzResult = await sql`SELECT timezone(${activeSchedule.timezone}, NOW())::date as local_date`;
  const today = tzResult.rows[0].local_date.toISOString().split('T')[0];

  // Because of Fix #1, this UPDATE will now properly mathematically increment 0 + 1 instead of NULL + 1
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

  await sql`UPDATE account_schedules SET last_posted_at = NOW() WHERE id = ${scheduleId}`;

  let personas: string[] = [];
  if (activeSchedule.persona_id) {
    const dbPersona = await getPersonaById(activeSchedule.persona_id);
    if (dbPersona?.key) personas = [dbPersona.key];
  } else {
    const allPersonas = await getAllPersonas();
    personas = allPersonas.filter(p => p.is_active).map(p => p.key);
  }

  return { should_post: true, personas };
}