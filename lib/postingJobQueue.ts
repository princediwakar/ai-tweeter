import { sql } from '@vercel/postgres';
import { getCurrentISTDay, getCurrentISTHour, getCurrentISTMinute } from './utils';
import crypto from 'crypto';

export interface PostingJob {
  id: string;
  user_id: string | null;
  account_id: string;
  schedule_id: string | null;
  scheduled_date: string | null;
  platform: 'twitter' | 'linkedin';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  batch_index: number;
  tweets_count: number;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  account_id: string;
  platform: 'twitter' | 'linkedin';
  batch_index?: number;
  tweets_count?: number;
}

const BATCH_SIZE = 5;

class PostingJobQueue {
  async createJob(input: CreateJobInput): Promise<PostingJob> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await sql`
      INSERT INTO posting_jobs (
        id, account_id, platform, status, batch_index, tweets_count,
        attempts, max_attempts, created_at, updated_at
      ) VALUES (
        ${id}, ${input.account_id}, ${input.platform}, 'pending',
        ${input.batch_index ?? 0}, ${input.tweets_count ?? 0},
        0, 3, ${now}, ${now}
      )
      RETURNING *
    `;

    return this.mapRow(result.rows[0]);
  }

  async createJobsBatch(jobs: CreateJobInput[]): Promise<PostingJob[]> {
    if (jobs.length === 0) return [];

    const now = new Date().toISOString();
    const createdJobs: PostingJob[] = [];

    for (const job of jobs) {
      const id = crypto.randomUUID();
      const result = await sql`
        INSERT INTO posting_jobs (
          id, account_id, platform, status, batch_index, tweets_count,
          attempts, max_attempts, created_at, updated_at
        ) VALUES (
          ${id}, ${job.account_id}, ${job.platform}, 'pending',
          ${(job.batch_index ?? 0).toString()}, ${(job.tweets_count ?? 0).toString()},
          '0', '3', ${now}, ${now}
        )
        RETURNING *
      `;
      createdJobs.push(this.mapRow(result.rows[0]));
    }

    return createdJobs;
  }

  async getPendingJobs(platform: 'twitter' | 'linkedin', limit: number = BATCH_SIZE): Promise<PostingJob[]> {
    const result = await sql`
      SELECT * FROM posting_jobs
      WHERE platform = ${platform}
        AND status = 'pending'
        AND attempts < max_attempts
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    return result.rows.map(this.mapRow);
  }

  async getProcessingJobs(platform: 'twitter' | 'linkedin', limit: number = BATCH_SIZE): Promise<PostingJob[]> {
    const result = await sql`
      SELECT * FROM posting_jobs
      WHERE platform = ${platform}
        AND status = 'processing'
        AND started_at < NOW() - INTERVAL '10 minutes'
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    return result.rows.map(this.mapRow);
  }

  async claimJobs(platform: 'twitter' | 'linkedin', limit: number = BATCH_SIZE): Promise<PostingJob[]> {
    const now = new Date().toISOString();
    
    const result = await sql`
      UPDATE posting_jobs
      SET status = 'processing', started_at = ${now}, attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM posting_jobs
        WHERE platform = ${platform}
          AND status = 'pending'
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    return result.rows.map(this.mapRow);
  }

  async markCompleted(jobId: string, tweetsPosted: number = 0): Promise<void> {
    const now = new Date().toISOString();
    await sql`
      UPDATE posting_jobs
      SET status = 'completed', completed_at = ${now}, tweets_count = ${tweetsPosted}
      WHERE id = ${jobId}
    `;
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await sql`
      UPDATE posting_jobs
      SET status = 'failed', error_message = ${errorMessage}
      WHERE id = ${jobId}
    `;
  }

  async getQueueStats(platform: 'twitter' | 'linkedin'): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const result = await sql`
      SELECT status, COUNT(*) as count
      FROM posting_jobs
      WHERE platform = ${platform}
      GROUP BY status
    `;

    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    result.rows.forEach(row => {
      if (row.status in stats) {
        stats[row.status as keyof typeof stats] = parseInt(row.count);
      }
    });

    return stats;
  }

  async clearOldCompleted(daysOld: number = 7): Promise<number> {
    const result = await sql`
      DELETE FROM posting_jobs
      WHERE status = 'completed'
        AND completed_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING id
    `;

    return result.rowCount ?? 0;
  }

  /**
   * Synchronizes scheduled jobs for a specific platform.
   * Checks all active schedules and enqueues missing jobs for the current day.
   */
  async syncScheduledJobs(platform: 'twitter' | 'linkedin'): Promise<number> {
    const now = new Date();
    const dayOfWeek = getCurrentISTDay(now);
    const hour = getCurrentISTHour(now);
    const minute = getCurrentISTMinute(now);
    const currentMinutes = hour * 60 + minute;
    const todayDate = now.toISOString().split('T')[0];

    // 1. Fetch active schedules for the platform that are currently due
    const schedulesResult = await sql`
      SELECT s.*, a.user_id
      FROM account_schedules s
      JOIN connected_accounts a ON s.connected_account_id = a.id
      WHERE s.is_active = true
        AND a.platform = ${platform}
        AND ${dayOfWeek} = ANY(s.days_of_week)
        AND s.start_time <= ${currentMinutes}
    `;

    if (schedulesResult.rows.length === 0) return 0;

    let enqueuedCount = 0;

    for (const schedule of schedulesResult.rows) {
      const jobId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      try {
        // 2. Insert into posting_jobs with unique constraint check
        // The unique constraint (account_id, platform, schedule_id, scheduled_date)
        // ensures we only enqueue one job per schedule per day.
        const result = await sql`
          INSERT INTO posting_jobs (
            id, user_id, account_id, platform, schedule_id, scheduled_date,
            status, batch_index, tweets_count, attempts, max_attempts,
            created_at, updated_at
          ) VALUES (
            ${jobId}, ${schedule.user_id}, ${schedule.connected_account_id}, ${platform}, ${schedule.id}, ${todayDate},
            'pending', 0, 0, 0, 3,
            ${timestamp}, ${timestamp}
          )
          ON CONFLICT ON CONSTRAINT unique_posting_job_per_schedule_day DO NOTHING
          RETURNING id
        `;
        
        if (result.rowCount && result.rowCount > 0) {
          enqueuedCount++;
        }
      } catch (error) {
        // Silently ignore or log if needed, as ON CONFLICT handles most duplicates
      }
    }

    return enqueuedCount;
  }

  /** @deprecated Use syncScheduledJobs instead */
  async enqueueAccountsForPlatform(
    accounts: { id: string; twitter_handle?: string; account_username?: string }[],
    platform: 'twitter' | 'linkedin',
    currentHourIST: number,
    dayOfWeek: number
  ): Promise<number> {
    if (accounts.length === 0) return 0;

    const now = new Date().toISOString();
    const jobs: CreateJobInput[] = [];

    const accountsToQueue = accounts.filter(acc => {
      const handle = platform === 'twitter' ? acc.twitter_handle : acc.account_username;
      return this.isAccountScheduledForHour(handle, currentHourIST, dayOfWeek);
    });

    for (const account of accountsToQueue) {
      jobs.push({
        account_id: account.id,
        platform,
        batch_index: 0,
        tweets_count: 0
      });
    }

    if (jobs.length === 0) return 0;

    let inserted = 0;
    for (const job of jobs) {
      await sql`
        INSERT INTO posting_jobs (account_id, platform, status, batch_index, tweets_count, attempts, max_attempts, created_at, updated_at)
        VALUES (${job.account_id}, ${job.platform}, 'pending', 0, 0, '0', '3', ${now}, ${now})
        ON CONFLICT DO NOTHING
      `;
      inserted++;
    }

    return inserted;
  }

  private isAccountScheduledForHour(
    handle: string | undefined,
    currentHourIST: number,
    dayOfWeek: number
  ): boolean {
    if (!handle) return false;
    const hash = this.hashString(handle);
    const scheduledHour = hash % 24;
    return scheduledHour === currentHourIST;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private mapRow(row: Record<string, unknown>): PostingJob {
    return {
      id: row.id as string,
      user_id: row.user_id as string | null,
      account_id: row.account_id as string,
      schedule_id: row.schedule_id as string | null,
      scheduled_date: row.scheduled_date as string | null,
      platform: row.platform as 'twitter' | 'linkedin',
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      batch_index: row.batch_index as number,
      tweets_count: row.tweets_count as number,
      attempts: row.attempts as number,
      max_attempts: row.max_attempts as number,
      error_message: row.error_message as string | null,
      started_at: row.started_at as string | null,
      completed_at: row.completed_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string
    };
  }
}

export const postingJobQueue = new PostingJobQueue();