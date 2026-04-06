import { NextRequest, NextResponse } from 'next/server';
import { getReadyThreads } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST, getCurrentISTHour } from '@/lib/utils';
import { getPostingBatchInfo } from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import { postCompleteThread } from '@/lib/instantThreadService';
import { postingJobQueue } from '@/lib/postingJobQueue';
import { postSingleContent } from '@/lib/postingService';

const BATCH_SIZE = 5;

async function processJob(job: { id: string; account_id: string }): Promise<{ posted: number; errors: number }> {
  const account = await accountService.getAccount(job.account_id);
  if (!account) {
    throw new Error(`Account not found: ${job.account_id}`);
  }

  const nowIST = getCurrentTimeInIST();
  const postingInfo = await getPostingBatchInfo(account.twitter_handle, nowIST);
  
  if (!postingInfo.should_post || postingInfo.personas.length === 0) {
    logger.info(`⏭️ ${account.name}: Not scheduled for posting`, 'auto-post');
    return { posted: 0, errors: 0 };
  }

  const result = await postSingleContent(account.id, postingInfo.personas, 'twitter', BATCH_SIZE);
  logger.info(`📝 ${account.name}: Posted ${result.posted}, errors ${result.errors}`, 'auto-post');
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowIST = getCurrentTimeInIST();
    const currentHourIST = getCurrentISTHour(nowIST);

    logger.info(`🔍 [GET] Auto-post check at ${currentHourIST}:00 IST`, 'auto-post');

    // 1. Process pending jobs from queue
    const claimedJobs = await postingJobQueue.claimJobs('twitter', BATCH_SIZE);
    
    if (claimedJobs.length > 0) {
      logger.info(`📦 Processing ${claimedJobs.length} jobs from queue`, 'auto-post');
      
      let totalPosted = 0;
      let totalErrors = 0;

      for (const job of claimedJobs) {
        try {
          const result = await processJob(job);
          await postingJobQueue.markCompleted(job.id, result.posted);
          totalPosted += result.posted;
          totalErrors += result.errors;
          logger.info(`✅ Job ${job.id} completed: ${result.posted} posted, ${result.errors} errors`, 'auto-post');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`❌ Job ${job.id} failed: ${errorMsg}`, 'auto-post', error as Error);
          await postingJobQueue.markFailed(job.id, errorMsg);
          totalErrors++;
        }
      }

      const stats = await postingJobQueue.getQueueStats('twitter');
      return NextResponse.json({ 
        success: true, 
        processed: claimedJobs.length,
        posted: totalPosted,
        errors: totalErrors,
        queue: stats
      });
    }

    // 2. Handle stale jobs
    const staleJobs = await postingJobQueue.getProcessingJobs('twitter', BATCH_SIZE);
    if (staleJobs.length > 0) {
      logger.info(`🔄 Reclaiming ${staleJobs.length} stale jobs`, 'auto-post');
      for (const job of staleJobs) {
        try {
          const result = await processJob(job);
          await postingJobQueue.markCompleted(job.id, result.posted);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await postingJobQueue.markFailed(job.id, errorMsg);
        }
      }
    }

    // 3. Sync scheduled jobs (run once per day with cron-job.org)
    const enqueued = await postingJobQueue.syncScheduledJobs('twitter');
    if (enqueued > 0) {
      logger.info(`📝 Enqueued ${enqueued} new accounts for Twitter posting`, 'auto-post');
    }

    const stats = await postingJobQueue.getQueueStats('twitter');
    return NextResponse.json({ 
      success: true, 
      message: stats.pending === 0 
        ? `⏳ No pending Twitter jobs.` 
        : `Queue: ${stats.pending} pending. Enqueued ${enqueued} new ones.`,
      enqueued,
      queue: stats
    });

  } catch (error) {
    logger.error('[GET] Route failed catastrophically.', 'auto-post', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json().catch(() => ({}));
    const debugMode = process.env.DEBUG_MODE === 'true' || requestBody.debug === true;
    const nowIST = getCurrentTimeInIST();
    logger.info(`🚀 [POST] Instant thread posting check${debugMode ? ' (DEBUG MODE)' : ''}`, 'auto-post');

    let accountsToProcess: any[] = [];
    if (requestBody.twitter_handle) {
      const account = await accountService.getAccountByTwitterHandle(requestBody.twitter_handle);
      if (account) accountsToProcess.push(account);
    } else if (requestBody.account_id) {
       const allAccounts = await accountService.getAllAccounts();
       const account = allAccounts.find(a => a.id === requestBody.account_id);
       if(account) accountsToProcess.push(account);
    } else {
      const allAccounts = await accountService.getAllAccounts();
      if (debugMode) {
        accountsToProcess = allAccounts.filter(acc => acc.platform === 'twitter');
      } else {
        const results = await Promise.all(allAccounts.map(async acc => {
          if (acc.platform !== 'twitter') return null;
          const postingInfo = await getPostingBatchInfo(acc.twitter_handle, nowIST);
          if (postingInfo.should_post) return acc;
          return null;
        }));
        accountsToProcess = results.filter((acc): acc is any => acc !== null);
      }
    }

    if (accountsToProcess.length === 0) {
      return NextResponse.json({ success: true, message: `⚠️ No accounts found or scheduled to process.` });
    }

    let totalPosted = 0;
    let totalErrors = 0;
    let threadsPosted = 0;

    for (const account of accountsToProcess) {
      logger.info(`🏢 Processing account: ${account.name} (@${account.twitter_handle})`, 'auto-post');
      try {
        const postingInfo = await getPostingBatchInfo(account.twitter_handle, nowIST);
        
        if (!postingInfo.should_post && !debugMode) {
          logger.info(`⏭️ ${account.name}: Already posted or not in posting window`, 'auto-post');
          continue;
        }

        let scheduledPersonas = postingInfo.personas;
        
        // In debug mode, get all personas
        if (debugMode && scheduledPersonas.length === 0) {
          const { getAllPersonas } = await import('@/lib/personas');
          const allPersonas = await getAllPersonas();
          scheduledPersonas = allPersonas.map(p => p.key).filter((k): k is string => !!k);
        }
        
        const readyThreads = await getReadyThreads(account.id);
        const scheduledThread = readyThreads.find(thread => scheduledPersonas.includes(thread.persona));

        if (scheduledThread) {
          logger.info(`🚀 ${account.name}: Posting thread "${scheduledThread.title}"`, 'auto-post');
          const credentials = {
            apiKey: account.twitter_api_key || '',
            apiSecret: account.twitter_api_secret || '',
            accessToken: account.twitter_access_token || '',
            accessSecret: account.twitter_access_token_secret || '',
          };

          const threadResult = await postCompleteThread(
            scheduledThread.id,
            account.id,
            scheduledThread.total_tweets,
            credentials,
            account.twitter_handle
          );

          if (threadResult.success) {
            totalPosted += threadResult.tweets_posted;
            threadsPosted++;
          } else {
            totalErrors++;
            logger.error(`❌ ${account.name}: Failed to post thread: ${threadResult.error}`, 'auto-post');
          }
          continue; 
        }

        // Use new atomic claiming for single tweets
        const result = await postSingleContent(account.id, scheduledPersonas, 'twitter', 1);
        
        if (result.posted > 0) {
          totalPosted += result.posted;
          logger.info(`📤 ${account.name}: Posted ${result.posted} single tweet(s)`, 'auto-post');
        } else if (result.errors > 0) {
          totalErrors += result.errors;
        } else {
          logger.info(`📋 ${account.name}: No valid tweets found for posting.`, 'auto-post');
        }
      } catch(error) {
        logger.error(`❌ Failed to process account ${account.name}`, 'auto-post', error as Error);
        totalErrors++;
      }
    }

    logger.info(`📊 [POST] Summary: ${totalPosted} tweets posted (${threadsPosted} threads), ${totalErrors} errors.`, 'auto-post');
    return NextResponse.json({ success: true, totalPosted, threadsPosted, totalErrors });
    
  } catch (error) {
    logger.error('[POST] Route failed catastrophically.', 'auto-post', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}