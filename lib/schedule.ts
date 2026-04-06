import { sql } from '@vercel/postgres';
import { accountService } from './accountService';
import { getAllPersonas } from './personas';
import { getPersonaById } from './db';
import { getCurrentISTHour, getCurrentISTDay, getCurrentISTMinute, getCurrentTimeInIST } from './utils';

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
  batch_size?: number;
  reason?: string;
}

export async function getGenerationBatchInfo(
  twitterHandle: string,
  now: Date,
  debugMode: boolean = false
): Promise<Schedule> {
  if (debugMode) {
    const allPersonas = await getAllPersonas();
    const debugPersonas = allPersonas.length > 0 ? allPersonas.map(p => p.key).filter(Boolean) : ['satirist'];
    return {
      should_generate: true,
      should_post: true,
      generation_personas: debugPersonas,
      posting_personas: debugPersonas,
      batch_size: 5,
    };
  }

  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
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

  // Get current time in account's timezone
  const tzResult = await sql`
    SELECT timezone FROM account_schedules 
    WHERE connected_account_id = ${account.id} AND is_active = true 
    LIMIT 1
  `;
  const tz = tzResult.rows[0]?.timezone || 'Asia/Kolkata';
  const currentInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const currentMinutes = currentInTz.getHours() * 60 + currentInTz.getMinutes();
  const dayOfWeek = currentInTz.getDay();

  console.log(`[DEBUG] Account ${account.id}:`);
  console.log(`[DEBUG]   Current time: ${currentInTz.getHours()}:${currentInTz.getMinutes()} (${currentMinutes} min)`);
  console.log(`[DEBUG]   Day of week: ${dayOfWeek}`);
  console.log(`[DEBUG]   Timezone: ${tz}`);

  // Find schedules within 60 min window around current time
  const scheduleResult = await sql`
    SELECT s.id, s.timezone, s.start_time, s.end_time, s.persona_id, s.days_of_week
    FROM account_schedules s
    WHERE s.connected_account_id = ${account.id} 
      AND s.is_active = true
      AND s.start_time >= ${currentMinutes - 60}
      AND s.start_time <= ${currentMinutes + 60}
      AND ${dayOfWeek} = ANY(s.days_of_week)
    ORDER BY s.start_time DESC
    LIMIT 1
  `;

  console.log(`[DEBUG] Found ${scheduleResult.rows.length} schedules in window [${currentMinutes - 60}, ${currentMinutes + 60}]`);
  if (scheduleResult.rows.length > 0) {
    console.log(`[DEBUG] Schedule: start_time=${scheduleResult.rows[0].start_time}, days_of_week=${JSON.stringify(scheduleResult.rows[0].days_of_week)}`);
  }
  
  const activeSchedule = scheduleResult.rows[0];
  
  if (!activeSchedule) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: `No schedule in window [${currentMinutes - 60}, ${currentMinutes + 60}]. Current: ${currentMinutes}, day: ${dayOfWeek}`,
    };
  }
  
  console.log(`[Schedule] Matched schedule: start_time=${activeSchedule.start_time}, timezone=${activeSchedule.timezone}`);
  
  const scheduleId = activeSchedule.id;
  const accountTime = new Date(new Date().toLocaleString('en-US', { timeZone: activeSchedule.timezone }));
  const today = accountTime.toISOString().split('T')[0];

  // Deduplication: Use (account, schedule_id, date) as unique slot
  const result = await sql`
    INSERT INTO generation_slots (connected_account_id, schedule_id, slot_date, slot_hour, slot_minute, generation_count, last_generated_at, created_at, updated_at)
    VALUES (${account.id}, ${scheduleId}, ${today}, 0, 0, 1, NOW(), NOW(), NOW())
    ON CONFLICT (connected_account_id, schedule_id, slot_date)
    DO UPDATE SET generation_count = generation_slots.generation_count + 1, last_generated_at = NOW()
    RETURNING generation_count
  `;

  if (result.rows[0]?.generation_count > 1) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: 'Generation already completed for this schedule today',
    };
  }

  let personas: string[] = [];
  if (activeSchedule.persona_id) {
    const dbPersona = await getPersonaById(activeSchedule.persona_id);
    if (dbPersona?.key) {
      personas = [dbPersona.key];
    }
  } else {
    personas = account.personas?.filter(Boolean) || [];
  }

  return {
    should_generate: true,
    should_post: true,
    generation_personas: personas,
    posting_personas: personas,
    batch_size: 5,
  };
}

export interface PostingSchedule {
  should_post: boolean;
  personas: string[];
  reason?: string;
}

export async function getPostingBatchInfo(
  twitterHandle: string,
  now: Date
): Promise<PostingSchedule> {
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) {
    return { should_post: false, personas: [], reason: 'Account not found' };
  }

  const tzResult = await sql`
    SELECT timezone FROM account_schedules 
    WHERE connected_account_id = ${account.id} AND is_active = true 
    LIMIT 1
  `;
  const tz = tzResult.rows[0]?.timezone || 'Asia/Kolkata';
  const currentInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const currentMinutes = currentInTz.getHours() * 60 + currentInTz.getMinutes();
  const dayOfWeek = currentInTz.getDay();

  const scheduleResult = await sql`
    SELECT s.id, s.timezone, s.persona_id, s.start_time, s.end_time
    FROM account_schedules s
    WHERE s.connected_account_id = ${account.id}
      AND s.is_active = true
      AND ${dayOfWeek} = ANY(s.days_of_week)
      AND s.end_time >= ${currentMinutes}
      AND s.start_time <= ${currentMinutes}
    ORDER BY s.start_time
    LIMIT 1
  `;

  const activeSchedule = scheduleResult.rows[0];
  if (!activeSchedule) {
    return { should_post: false, personas: [], reason: 'No schedule in posting window' };
  }

  const scheduleId = activeSchedule.id;
  const today = currentInTz.toISOString().split('T')[0];

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

export async function isScheduledForGeneration(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number,
  minute: number = 0
): Promise<boolean> {
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) return false;
  
  const schedules = await getActiveSchedulesForAccount(account.id);
  const currentTimeInMinutes = hour * 60 + minute;
  
  return schedules.some(s => {
    if (!s.is_active || !s.days_of_week.includes(dayOfWeek)) return false;
    return currentTimeInMinutes >= s.start_time && currentTimeInMinutes <= s.start_time + GENERATION_WINDOW_MINUTES;
  });
}

export async function getActiveSchedulesForAccount(accountId: string): Promise<ScheduleRow[]> {
  const result = await sql<ScheduleRow>`
    SELECT * FROM account_schedules
    WHERE connected_account_id = ${accountId}
      AND is_active = true
    ORDER BY start_time
  `;
  return result.rows;
}

export async function getScheduledPersonasForPosting(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number,
  minute: number = 0
): Promise<string[]> {
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) return [];
  
  const schedules = await getActiveSchedulesForAccount(account.id);
  const currentTimeInMinutes = hour * 60 + minute;
  
  const matchingSchedules = schedules.filter(s => {
    if (!s.is_active || !s.days_of_week.includes(dayOfWeek)) return false;
    return currentTimeInMinutes >= s.start_time && currentTimeInMinutes <= s.end_time;
  });
  
  const personas: string[] = [];
  for (const schedule of matchingSchedules) {
    if (schedule.persona_id) {
      const dbPersona = await getPersonaById(schedule.persona_id);
      if (dbPersona?.key) {
        personas.push(dbPersona.key);
      }
    }
  }
  
  return [...new Set(personas)];
}

export async function getScheduledTwitterHandles(): Promise<string[]> {
  const now = getCurrentTimeInIST();
  const hour = getCurrentISTHour(now);
  const minute = getCurrentISTMinute(now);
  const dayOfWeek = getCurrentISTDay(now);
  const currentMinutes = hour * 60 + minute;
  
  const result = await sql`
    SELECT DISTINCT a.account_username
    FROM connected_accounts a
    JOIN account_schedules s ON s.connected_account_id = a.id
    WHERE a.is_active = true
      AND s.is_active = true
      AND ${dayOfWeek} = ANY(s.days_of_week)
      AND s.start_time <= ${currentMinutes}
      AND s.start_time > ${currentMinutes - 15}
  `;
  
  return result.rows.map(row => row.account_username);
}

export async function isPostingScheduled(twitterHandle: string): Promise<boolean> {
  const now = getCurrentTimeInIST();
  const d = getCurrentISTDay(now);
  const h = getCurrentISTHour(now);
  const m = getCurrentISTMinute(now);
  return (await getScheduledPersonasForPosting(twitterHandle, d, h, m)).length > 0;
}

export async function isLinkedInPostingScheduled(twitterHandle: string, dayOfWeek: number, hour: number, minute: number): Promise<boolean> {
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account || !account.linkedin_enabled) return false;
  
  const personas = await getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour, minute);
  return personas.length > 0;
}

export async function getScheduledPersonasForLinkedInPosting(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number,
  minute: number
): Promise<string[]> {
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account || !account.linkedin_enabled) return [];
  
  return getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour, minute);
}

export async function isEngagementScheduled(twitterHandle: string): Promise<boolean> {
  return isPostingScheduled(twitterHandle);
}