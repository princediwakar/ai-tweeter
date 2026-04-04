import { sql } from '@vercel/postgres';
import { accountService } from './accountService';

interface ScheduleRow {
  id: string;
  connected_account_id: string;
  name: string;
  timezone: string;
  schedule_config: Record<string, unknown>;
  days_of_week: number[];
  start_time: number;
  end_time: number;
  is_active: boolean;
  max_posts_per_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  should_generate: boolean;
  should_post: boolean;
  generation_personas: string[];
  posting_personas: string[];
  batch_size?: number;
}

export async function getGenerationBatchInfo(
  twitterHandle: string,
  now: Date,
  debugMode: boolean = false
): Promise<Schedule> {
  if (debugMode) {
    return {
      should_generate: true,
      should_post: true,
      generation_personas: ['satirist'],
      posting_personas: ['satirist'],
    };
  }

  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
    };
  }

  const schedules = await getActiveSchedulesForAccount(account.id);
  if (schedules.length === 0) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
    };
  }

  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const currentTimeInMinutes = hour * 60;

  const activeSchedule = schedules.find((s: ScheduleRow) => {
    if (!s.is_active) return false;
    if (!s.days_of_week.includes(dayOfWeek)) return false;
    if (currentTimeInMinutes < s.start_time || currentTimeInMinutes > s.end_time) return false;
    return true;
  });

  if (!activeSchedule) {
    return {
      should_generate: false,
      should_post: false,
      generation_personas: [],
      posting_personas: [],
    };
  }

  const personas = account.personas || [];
  return {
    should_generate: true,
    should_post: true,
    generation_personas: personas,
    posting_personas: personas,
    batch_size: activeSchedule.max_posts_per_day,
  };
}

export function isScheduledForGeneration(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number
): boolean {
  return true;
}

export function isScheduledForPosting(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number
): boolean {
  return true;
}

export async function getNextScheduledTime(
  twitterHandle: string,
  type: 'generation' | 'posting'
): Promise<Date | null> {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour;
}

export function getScheduledPersonasForPosting(
  twitterHandle: string,
  dayOfWeek?: number,
  hour?: number
): string[] {
  return [];
}

export function getScheduledTwitterHandles(dayOfWeek?: number, hour?: number): string[] {
  return [];
}

export function isPostingScheduled(
  twitterHandle: string,
  dayOfWeekOrDate?: number | Date,
  hour?: number
): boolean {
  return true;
}

export function getScheduledPersonasForLinkedInPosting(
  twitterHandle: string,
  dayOfWeek?: number,
  hour?: number
): string[] {
  return [];
}

export function isLinkedInPostingScheduled(
  twitterHandle: string,
  dayOfWeekOrDate?: number | Date,
  hour?: number
): boolean {
  return false;
}

export function isEngagementScheduled(
  twitterHandle: string,
  dayOfWeek?: number,
  hour?: number
): boolean {
  return true;
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
    max_posts_per_day: row.max_posts_per_day,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
