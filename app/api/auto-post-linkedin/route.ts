import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST, getCurrentISTHour } from '@/lib/utils';
import { getPostingBatchInfo } from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import { postingJobQueue } from '@/lib/postingJobQueue';
import { postSingleContent } from '@/lib/postingService';

const BATCH_SIZE = 5;

async function processLinkedInJob(job: { id: string; account_id: string }): Promise<{ posted: number; errors: number }> {
  const account = await accountService.getAccount(job.account_id);
  if (!account || !account.linkedin_enabled || !account.linkedin_access_token) {
    throw new Error(`LinkedIn not enabled for account: ${job.account_id}`);
  }

  const nowIST = getCurrentTimeInIST();
  const postingInfo = await getPostingBatchInfo(account.twitter_handle, nowIST);
  
  if (!postingInfo.should_post || postingInfo.personas.length === 0) {
    logger.info(`⏳ ${account.name}: Not scheduled for LinkedIn posting`, 'auto-post-linkedin');
    return { posted: 0, errors: 0 };
  }

  const personas = postingInfo.personas as string[];
  
  // Use new atomic claiming for LinkedIn
  const result = await postSingleContent(account.id, personas, 'linkedin', BATCH_SIZE);
  
  // For cross-posting (tweets already posted to Twitter but not LinkedIn)
  if (result.posted === 0 && result.errors === 0) {
    const crossPostResult = await processLinkedInCrossPost(account, postingInfo.personas);
    return crossPostResult;
  }
  
  return result;
}

async function processLinkedInCrossPost(account: any, personas: string[]): Promise<{ posted: number; errors: number }> {
  if (personas.length === 0) {
    return { posted: 0, errors: 0 };
  }

  // Find tweets already posted to Twitter but not yet cross-posted to LinkedIn
  const result = await sql.query(
    `SELECT * FROM tweets
     WHERE connected_account_id = $1
       AND status = 'posted'
       AND linkedin_id IS NULL
       AND content_type = 'single_tweet'
       AND persona = ANY($2::text[])
     ORDER BY posted_at ASC
     LIMIT $3`,
    [account.id, personas, BATCH_SIZE]
  );

  if (result.rows.length === 0) {
    return { posted: 0, errors: 0 };
  }

  const { postToLinkedIn } = await import('@/lib/linkedin');
  
  const linkedinCredentials = {
    accessToken: account.linkedin_access_token!,
    refreshToken: account.linkedin_refresh_token,
    expiresAt: account.linkedin_token_expires_at ? new Date(account.linkedin_token_expires_at) : undefined,
    userId: account.linkedin_user_id,
    orgId: account.linkedin_org_id,
  };

  let posted = 0;
  let errors = 0;

  for (const tweet of result.rows) {
    try {
      const contentForLinkedIn = tweet.content.replace(/@/g, '');
      const fullContent = tweet.hashtags?.length > 0
        ? `${contentForLinkedIn}\n\n${tweet.hashtags.map((tag: string) => `${tag}`).join(' ')}`
        : contentForLinkedIn;

      const linkedinResult = await postToLinkedIn(fullContent, linkedinCredentials, tweet.image_url);

      await sql`
        UPDATE tweets
        SET linkedin_id = ${linkedinResult.id}
        WHERE id = ${tweet.id}
      `;

      posted++;
      logger.info(`✅ ${account.name}: Cross-posted to LinkedIn: ${tweet.content.substring(0, 30)}...`, 'auto-post-linkedin');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ ${account.name}: Failed to cross-post to LinkedIn: ${errorMsg}`, 'auto-post-linkedin', error as Error);
      errors++;
    }
  }

  return { posted, errors };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const debugMode = process.env.DEBUG_MODE === 'true';
    const nowIST = getCurrentTimeInIST();
    const currentHourIST = getCurrentISTHour(nowIST);

    logger.info(`🔍 [LinkedIn] Auto-post check at ${currentHourIST}:00 IST${debugMode ? ' (DEBUG MODE)' : ''}`, 'auto-post-linkedin');

    // 1. Process pending jobs from queue
    const claimedJobs = await postingJobQueue.claimJobs('linkedin', BATCH_SIZE);
    
    if (claimedJobs.length > 0) {
      logger.info(`📦 Processing ${claimedJobs.length} LinkedIn jobs from queue`, 'auto-post-linkedin');
      
      let totalPosted = 0;
      let totalErrors = 0;

      for (const job of claimedJobs) {
        try {
          const result = await processLinkedInJob(job);
          await postingJobQueue.markCompleted(job.id, result.posted);
          totalPosted += result.posted;
          totalErrors += result.errors;
          logger.info(`✅ LinkedIn Job ${job.id} completed: ${result.posted} posted, ${result.errors} errors`, 'auto-post-linkedin');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`❌ LinkedIn Job ${job.id} failed: ${errorMsg}`, 'auto-post-linkedin', error as Error);
          await postingJobQueue.markFailed(job.id, errorMsg);
          totalErrors++;
        }
      }

      const stats = await postingJobQueue.getQueueStats('linkedin');
      return NextResponse.json({ 
        success: true, 
        processed: claimedJobs.length,
        posted: totalPosted,
        errors: totalErrors,
        queue: stats
      });
    }

    // 2. Handle stale jobs
    const staleJobs = await postingJobQueue.getProcessingJobs('linkedin', BATCH_SIZE);
    if (staleJobs.length > 0) {
      logger.info(`🔄 Reclaiming ${staleJobs.length} stale LinkedIn jobs`, 'auto-post-linkedin');
      for (const job of staleJobs) {
        try {
          const result = await processLinkedInJob(job);
          await postingJobQueue.markCompleted(job.id, result.posted);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await postingJobQueue.markFailed(job.id, errorMsg);
        }
      }
    }

    // 3. Sync scheduled jobs (run once per day with cron-job.org)
    const enqueued = await postingJobQueue.syncScheduledJobs('linkedin');
    if (enqueued > 0) {
      logger.info(`📝 Enqueued ${enqueued} new accounts for LinkedIn posting`, 'auto-post-linkedin');
    }

    const stats = await postingJobQueue.getQueueStats('linkedin');
    return NextResponse.json({ 
      success: true, 
      message: stats.pending === 0 
        ? `⏳ No pending LinkedIn jobs.` 
        : `Queue: ${stats.pending} pending. Enqueued ${enqueued} new ones.`,
      enqueued,
      queue: stats
    });

  } catch (error) {
    logger.error('[LinkedIn] Auto-post failed', 'auto-post-linkedin', error as Error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}