import { sql } from '@vercel/postgres';
import { accountService } from './accountService';
import { getAllPersonas } from './personas';
import { getPersonaById } from './db';
import { getCurrentISTHour, getCurrentISTDay, getCurrentISTMinute, getCurrentTimeInIST } from './utils';

const GENERATION_WINDOW_MINUTES = 10;  // ±10 minutes from scheduled time (broader to catch more cron runs)
const POSTING_WINDOW_MINUTES = 10;     // end_time - 10 to end_time

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
  reason?: string; // For debugging why generation/posting was skipped
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

  // Generate signature for current time slot (hour:minute)
  const currentHour = new Date().getUTCHours();
  const currentMinute = new Date().getUTCMinutes();
  const today = new Date().toISOString().split('T')[0];

  // Atomically claim generation slot - only allow ONCE per account/date/hour/minute
  const result = await sql`
    INSERT INTO generation_slots (connected_account_id, slot_date, slot_hour, slot_minute, generation_count, last_generated_at, created_at, updated_at)
    VALUES (${account.id}, ${today}, ${currentHour}, ${currentMinute}, 1, NOW(), NOW(), NOW())
    ON CONFLICT (connected_account_id, slot_date, slot_hour, slot_minute)
    DO NOTHING
    RETURNING generation_count
  `;

  // If no row returned, slot already exists - generation already attempted
  if (result.rows.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: 'Generation already attempted for this slot today',
    };
  }

  // Find active schedule that matches current time window
  const scheduleResult = await sql`
    SELECT s.*
    FROM account_schedules s
    WHERE s.connected_account_id = ${account.id}
      AND s.is_active = true
      AND s.start_time IS NOT NULL
      AND (
        EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE s.timezone)) * 60 +
        EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE s.timezone))
        BETWEEN s.start_time - ${GENERATION_WINDOW_MINUTES}
        AND s.start_time + ${GENERATION_WINDOW_MINUTES}
      )
      AND EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE s.timezone)) = ANY(s.days_of_week)
    ORDER BY s.start_time
    LIMIT 1
  `;

  if (scheduleResult.rows.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
      batch_size: 5,
      reason: 'No schedule matches current time window',
    };
  }

  const claimedSchedule = scheduleResult.rows[0];
  
  const personas: string[] = [];
  if (claimedSchedule.persona_id) {
    const dbPersona = await getPersonaById(claimedSchedule.persona_id);
    if (dbPersona?.key) {
      personas.push(dbPersona.key);
    }
  } else {
    personas.push(...(account.personas?.filter(Boolean) || []));
  }

  const scheduleConfig = claimedSchedule.schedule_config as Record<string, unknown> || {};
  return {
    should_generate: true,
    should_post: true,
    generation_personas: personas,
    posting_personas: personas,
    batch_size: typeof scheduleConfig.batch_size === 'number' ? scheduleConfig.batch_size : undefined,
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

  const currentHour = new Date().getUTCHours();
  const currentMinute = new Date().getUTCMinutes();
  const today = new Date().toISOString().split('T')[0];

  // Atomically claim posting slot - only allow ONCE per account/date/hour/minute
  const postingResult = await sql`
    INSERT INTO generation_slots (connected_account_id, slot_date, slot_hour, slot_minute, posting_count, last_posted_at, created_at, updated_at)
    VALUES (${account.id}, ${today}, ${currentHour}, ${currentMinute}, 1, NOW(), NOW(), NOW())
    ON CONFLICT (connected_account_id, slot_date, slot_hour, slot_minute)
    DO NOTHING
    RETURNING posting_count
  `;

  // If no row returned, slot already exists - posting already attempted
  if (postingResult.rows.length === 0) {
    return { 
      should_post: false, 
      personas: [], 
      reason: 'Posting already attempted for this slot today' 
    };
  }

  const result = await sql`
    UPDATE account_schedules
    SET last_posted_at = NOW()
    WHERE id IN (
      SELECT s.id FROM account_schedules s
      WHERE s.connected_account_id = ${account.id}
        AND s.is_active = true
        AND EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE s.timezone)) = ANY(s.days_of_week)
        AND (
          EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE s.timezone)) * 60 +
          EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE s.timezone))
          BETWEEN s.end_time - ${POSTING_WINDOW_MINUTES}
          AND s.end_time
        )
        AND (s.last_posted_at IS NULL OR
             (s.last_posted_at AT TIME ZONE s.timezone)::date !=
             (CURRENT_TIMESTAMP AT TIME ZONE s.timezone)::date)
      ORDER BY s.start_time
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;

  if (result.rows.length === 0) {
    return { 
      should_post: false, 
      personas: [], 
      reason: 'No posting schedule matches current time window' 
    };
  }

  const claimedSchedule = result.rows[0];
  let personas: string[] = [];
  if (claimedSchedule.persona_id) {
    const dbPersona = await getPersonaById(claimedSchedule.persona_id);
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

export async function isScheduledForPosting(
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
    return currentTimeInMinutes >= s.end_time - POSTING_WINDOW_MINUTES && currentTimeInMinutes <= s.end_time;
  });
}

export async function getNextScheduledTime(
  twitterHandle: string,
  type: 'generation' | 'posting'
): Promise<Date | null> {
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) return null;

  const schedules = await getActiveSchedulesForAccount(account.id);
  if (schedules.length === 0) return null;

  // Simple implementation: next hour for now
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour;
}

export async function getScheduledPersonasForPosting(
  twitterHandle: string,
  dayOfWeek?: number,
  hour?: number,
  minute?: number
): Promise<string[]> {
  const now = new Date();
  const d = dayOfWeek ?? getCurrentISTDay(now);
  const h = hour ?? getCurrentISTHour(now);
  const m = minute ?? getCurrentISTMinute(now);
  
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) return [];

  const schedules = await getActiveSchedulesForAccount(account.id);
  const currentTimeInMinutes = h * 60 + m;
  
  const activeSchedule = schedules.find(s => {
    if (!s.is_active || !s.days_of_week.includes(d)) return false;
    return currentTimeInMinutes >= s.end_time - POSTING_WINDOW_MINUTES && currentTimeInMinutes <= s.end_time;
  });

  return activeSchedule ? (account.personas?.filter(Boolean) || []) : [];
}

export async function getScheduledTwitterHandles(dayOfWeek?: number, hour?: number, minute?: number): Promise<string[]> {
  const now = new Date();
  const d = dayOfWeek ?? getCurrentISTDay(now);
  const h = hour ?? getCurrentISTHour(now);
  const m = minute ?? getCurrentISTMinute(now);
  
  const accounts = await accountService.getAllAccounts();
  const twitterAccounts = accounts.filter(a => a.platform === 'twitter');
  
  const scheduledHandles: string[] = [];
  for (const account of twitterAccounts) {
    const isScheduled = await isScheduledForPosting(account.twitter_handle, d, h, m);
    if (isScheduled) {
      scheduledHandles.push(account.twitter_handle);
    }
  }
  
  return scheduledHandles;
}

export async function getScheduledLinkedInAccounts(dayOfWeek?: number, hour?: number, minute?: number): Promise<any[]> {
  const now = new Date();
  const d = dayOfWeek ?? getCurrentISTDay(now);
  const h = hour ?? getCurrentISTHour(now);
  const m = minute ?? getCurrentISTMinute(now);
  
  const accounts = await accountService.getAllAccounts();
  const linkedinAccounts = accounts.filter(a => a.linkedin_enabled && a.linkedin_access_token);
  
  const scheduledAccounts: any[] = [];
  for (const account of linkedinAccounts) {
    const isScheduled = await isLinkedInPostingScheduled(account.twitter_handle, d, h, m);
    if (isScheduled) {
      scheduledAccounts.push(account);
    }
  }
  
  return scheduledAccounts;
}

export async function isPostingScheduled(
  twitterHandle: string,
  dayOfWeekOrDate?: number | Date,
  hour?: number
): Promise<boolean> {
  const now = new Date();
  let d: number;
  let h: number;

  if (dayOfWeekOrDate instanceof Date) {
    d = getCurrentISTDay(dayOfWeekOrDate);
    h = getCurrentISTHour(dayOfWeekOrDate);
  } else {
    d = dayOfWeekOrDate ?? getCurrentISTDay(now);
    h = hour ?? getCurrentISTHour(now);
  }

  return isScheduledForPosting(twitterHandle, d, h);
}

export async function getScheduledPersonasForLinkedInPosting(
  twitterHandle: string,
  dayOfWeek?: number,
  hour?: number,
  minute?: number
): Promise<string[]> {
  const now = new Date();
  const d = dayOfWeek ?? getCurrentISTDay(now);
  const h = hour ?? getCurrentISTHour(now);
  const m = minute ?? getCurrentISTMinute(now);
  
  const account = await accountService.getAccountByUsername(twitterHandle, 'linkedin');
  if (!account) return [];

  const schedules = await getActiveSchedulesForAccount(account.id);
  const currentTimeInMinutes = h * 60 + m;
  
  const activeSchedule = schedules.find(s => {
    if (!s.is_active || !s.days_of_week.includes(d)) return false;
    return currentTimeInMinutes >= s.end_time - POSTING_WINDOW_MINUTES && currentTimeInMinutes <= s.end_time;
  });

  return activeSchedule ? (account.personas?.filter(Boolean) || []) : [];
}

export async function isLinkedInPostingScheduled(
  twitterHandle: string,
  dayOfWeekOrDate?: number | Date,
  hour?: number,
  minute?: number
): Promise<boolean> {
  const now = new Date();
  let d: number;
  let h: number;
  let m: number;

  if (dayOfWeekOrDate instanceof Date) {
    d = getCurrentISTDay(dayOfWeekOrDate);
    h = getCurrentISTHour(dayOfWeekOrDate);
    m = getCurrentISTMinute(dayOfWeekOrDate);
  } else {
    d = dayOfWeekOrDate ?? getCurrentISTDay(now);
    h = hour ?? getCurrentISTHour(now);
    m = minute ?? getCurrentISTMinute(now);
  }

  const account = await accountService.getAccountByUsername(twitterHandle, 'linkedin');
  if (!account || !account.linkedin_enabled) return false;
  
  const schedules = await getActiveSchedulesForAccount(account.id);
  const currentTimeInMinutes = h * 60 + m;
  
  return schedules.some(s => {
    if (!s.is_active || !s.days_of_week.includes(d)) return false;
    return currentTimeInMinutes >= s.end_time - POSTING_WINDOW_MINUTES && currentTimeInMinutes <= s.end_time;
  });
}

export async function isEngagementScheduled(
  twitterHandle: string,
  dayOfWeek?: number,
  hour?: number
): Promise<boolean> {
  const now = new Date();
  const d = dayOfWeek ?? getCurrentISTDay(now);
  const h = hour ?? getCurrentISTHour(now);
  return isScheduledForPosting(twitterHandle, d, h);
}

async function getActiveSchedulesForAccount(accountId: string): Promise<ScheduleRow[]> {
  const result = await sql<ScheduleRow>`
    SELECT * FROM account_schedules
    WHERE connected_account_id = ${accountId} AND is_active = true
    ORDER BY created_at DESC
  `;

  return result.rows.map((row: ScheduleRow) => ({
    id: row.id,
    connected_account_id: row.connected_account_id,
    name: row.name,
    timezone: row.timezone,
    schedule_config: row.schedule_config,
    days_of_week: row.days_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
