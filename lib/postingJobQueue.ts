// lib/postingJobQueue.ts
import { sql } from '@vercel/postgres';
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
        AND (
          attempts = 0 
          OR created_at < NOW() - (INTERVAL '1 minute' * (2 ^ attempts))
        )
      ORDER BY 
        CASE WHEN attempts = 0 THEN 0 ELSE 1 END,
        created_at ASC
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

  // FIXED: Native Database Timezone resolution. Corrected the bounds.
  async claimJobs(platform: 'twitter' | 'linkedin', limit: number = BATCH_SIZE): Promise<PostingJob[]> {
    const now = new Date().toISOString();
    
    const result = await sql`
      UPDATE posting_jobs
      SET status = 'processing', started_at = ${now}, attempts = attempts + 1
      WHERE id IN (
        SELECT pj.id FROM posting_jobs pj
        JOIN account_schedules s ON pj.schedule_id = s.id
        WHERE pj.platform = ${platform}
          AND pj.status = 'pending'
          AND pj.attempts < pj.max_attempts
          AND (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC')))) >= s.start_time
          AND (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC')))) <= s.end_time
        ORDER BY pj.created_at ASC
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

  // FIXED: Native Database Timezone resolution for scheduling.
  async syncScheduledJobs(platform: 'twitter' | 'linkedin'): Promise<number> {
    const todayDate = new Date().toISOString().split('T')[0];

    const schedulesResult = await sql`
      SELECT s.*, a.user_id
      FROM account_schedules s
      JOIN connected_accounts a ON s.connected_account_id = a.id
      WHERE s.is_active = true
        AND a.platform = ${platform}
        AND EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) = ANY(s.days_of_week)
    `;

    if (schedulesResult.rows.length === 0) return 0;

    let enqueuedCount = 0;
    const timestamp = new Date().toISOString();

    for (const schedule of schedulesResult.rows) {
      const jobId = crypto.randomUUID();

      try {
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
        // Silently ignore unique constraint violations
      }
    }

    return enqueuedCount;
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