import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST, getCurrentISTHour, getCurrentISTDay } from '@/lib/utils';
import {
  getScheduledPersonasForLinkedInPosting,
  isLinkedInPostingScheduled
} from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import {
  postToLinkedIn,
  refreshAccessToken,
  shouldRefreshToken,
  LinkedInCredentials
} from '@/lib/linkedin';
import { Tweet } from '@/lib/types';
import { postingJobQueue } from '@/lib/postingJobQueue';

const BATCH_SIZE = 5;

async function processLinkedInJob(job: { id: string; account_id: string }): Promise<{ posted: number; errors: number }> {
  const account = await accountService.getAccount(job.account_id);
  if (!account || !account.linkedin_enabled || !account.linkedin_access_token) {
    throw new Error(`LinkedIn not enabled for account: ${job.account_id}`);
  }

  const nowIST = getCurrentTimeInIST();
  const dayOfWeek = getCurrentISTDay(nowIST);
  const currentHourIST = getCurrentISTHour(nowIST);

  if (!isLinkedInPostingScheduled(account.twitter_handle, nowIST)) {
    logger.info(`⏳ ${account.name}: Not scheduled for LinkedIn posting at this hour`, 'auto-post-linkedin');
    return { posted: 0, errors: 0 };
  }

  const scheduledPersonas = getScheduledPersonasForLinkedInPosting(account.twitter_handle, dayOfWeek, currentHourIST);
  if (scheduledPersonas.length === 0) {
    logger.info(`⏳ ${account.name}: No personas scheduled for LinkedIn posting`, 'auto-post-linkedin');
    return { posted: 0, errors: 0 };
  }

  if (account.linkedin_refresh_token && account.linkedin_token_expires_at && shouldRefreshToken(new Date(account.linkedin_token_expires_at))) {
    logger.info(`🔄 ${account.name}: Refreshing LinkedIn token`, 'auto-post-linkedin');
    try {
      const { accessToken, refreshToken, expiresAt } = await refreshAccessToken(account.linkedin_refresh_token);
      await accountService.updateAccount(account.id, {
        linkedin_access_token: accessToken,
        linkedin_refresh_token: refreshToken,
        linkedin_token_expires_at: expiresAt,
      } as never);
      account.linkedin_access_token = accessToken;
      account.linkedin_refresh_token = refreshToken;
      account.linkedin_token_expires_at = expiresAt.toISOString();
    } catch (error) {
      throw new Error(`Failed to refresh LinkedIn token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const result = await sql<Tweet>`
    SELECT * FROM tweets
    WHERE account_id = ${account.id}
    AND status IN ('ready', 'posted')
    AND linkedin_id IS NULL
    AND content_type = 'single_tweet'
    ORDER BY created_at ASC
  `;

  const eligibleTweets = result.rows.filter(tweet => scheduledPersonas.includes(tweet.persona));
  
  if (eligibleTweets.length === 0) {
    logger.info(`📋 ${account.name}: No tweets ready for LinkedIn posting`, 'auto-post-linkedin');
    return { posted: 0, errors: 0 };
  }

  const linkedinCredentials: LinkedInCredentials = {
    accessToken: account.linkedin_access_token!,
    refreshToken: account.linkedin_refresh_token,
    expiresAt: account.linkedin_token_expires_at ? new Date(account.linkedin_token_expires_at) : undefined,
    userId: account.linkedin_user_id,
    orgId: account.linkedin_org_id,
  };

  let posted = 0;
  let errors = 0;

  for (const tweet of eligibleTweets) {
    try {
      const contentForLinkedIn = tweet.content.replace(/@/g, '');
      const fullContent = tweet.hashtags?.length > 0
        ? `${contentForLinkedIn}\n\n${tweet.hashtags.map(tag => `${tag}`).join(' ')}`
        : contentForLinkedIn;

      const linkedinResult = await postToLinkedIn(fullContent, linkedinCredentials, tweet.image_url);

      await sql`
        UPDATE tweets
        SET
          linkedin_id = ${linkedinResult.id},
          posted_at = COALESCE(posted_at, NOW()),
          status = CASE
            WHEN persona = 'linkedin_analyst' THEN 'posted'
            WHEN twitter_id IS NOT NULL THEN 'posted'
            ELSE status
          END
        WHERE id = ${tweet.id}
      `;

      posted++;
      logger.info(`✅ ${account.name}: Posted to LinkedIn: ${tweet.content.substring(0, 30)}...`, 'auto-post-linkedin');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ ${account.name}: Failed to post to LinkedIn: ${errorMsg}`, 'auto-post-linkedin', error as Error);
      await sql`UPDATE tweets SET error_message = ${`LinkedIn: ${errorMsg}`} WHERE id = ${tweet.id}`;
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
    const dayOfWeek = getCurrentISTDay(nowIST);

    logger.info(`🔍 [LinkedIn] Auto-post check at ${currentHourIST}:00 IST${debugMode ? ' (DEBUG MODE)' : ''}`, 'auto-post-linkedin');

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

    const allAccounts = await accountService.getAllAccounts();
    const linkedinAccounts = allAccounts.filter(a => a.linkedin_enabled && a.linkedin_access_token);
    
    const accountsToQueue = linkedinAccounts.filter(account => {
      const hash = (account.account_username || account.twitter_handle || '').split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
      }, 0);
      const scheduledHour = Math.abs(hash) % 24;
      return scheduledHour === currentHourIST;
    });

    if (accountsToQueue.length > 0) {
      await postingJobQueue.enqueueAccountsForPlatform(
        accountsToQueue.map(a => ({ 
          id: a.id, 
          twitter_handle: a.twitter_handle,
          account_username: a.account_username 
        })),
        'linkedin',
        currentHourIST,
        dayOfWeek
      );
      logger.info(`📝 Enqueued ${accountsToQueue.length} accounts for LinkedIn posting`, 'auto-post-linkedin');
    }

    const stats = await postingJobQueue.getQueueStats('linkedin');
    return NextResponse.json({ 
      success: true, 
      message: accountsToQueue.length === 0 && stats.pending === 0 
        ? `⏳ No LinkedIn accounts scheduled for posting now.` 
        : `Enqueued ${accountsToQueue.length} accounts. Queue: ${stats.pending} pending`,
      enqueued: accountsToQueue.length,
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