import { NextRequest, NextResponse } from 'next/server';
import { 
  getReadyTweetsByAccount, 
  saveTweet, 
  getReadyThreads
} from '@/lib/db';
import { postCompleteThread } from '@/lib/instantThreadService';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST, getCurrentISTHour, getCurrentISTDay } from '@/lib/utils';
import {
  getScheduledPersonasForPosting,
  getScheduledTwitterHandles,
  isPostingScheduled
} from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import { postTweet, postTweetWithImage } from '@/lib/twitter';
import { refreshAccessToken } from '@/lib/twitter-oauth';
import type { Tweet } from '@/lib/types';
import { ConnectedAccount, getConnectedAccountByAccountId, updateConnectedAccountToken } from '@/lib/connectedAccounts';
import { shouldRefreshToken } from '@/lib/twitter-oauth';
import { platformSettings } from '@/lib/platformSettings';
import { postingJobQueue } from '@/lib/postingJobQueue';

type AccountWithCredentials = ConnectedAccount;

const BATCH_SIZE = 5;

async function fetchImageFromUrl(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('❌ Failed to fetch image from URL:', error);
    return null;
  }
}

function isTweetReadyForPosting(tweet: Tweet): boolean {
  if (!tweet.image_status || tweet.image_status === 'none') {
    return true;
  }
  return tweet.image_status === 'completed' || tweet.image_status === 'failed';
}

function getFullTweetContent(tweet: Tweet): string {
  return tweet.hashtags?.length > 0 
    ? `${tweet.content}\n\n${tweet.hashtags.map(tag => `${tag}`).join(' ')}` 
    : tweet.content;
}

function isTweetValidForPosting(tweet: Tweet): boolean {
  const ready = isTweetReadyForPosting(tweet);
  if (!ready) return false;
  
  const fullContent = getFullTweetContent(tweet);
  if (fullContent.length > 280) {
    logger.info(`📋 Skipping tweet ${tweet.id}: too long (${fullContent.length} > 280 chars).`, 'auto-post');
    return false;
  }
  if (fullContent.trim().length === 0) {
    logger.info(`📋 Skipping tweet ${tweet.id}: content is empty.`, 'auto-post');
    return false;
  }
  return true;
}

async function getTwitterCredentialsForAccount(account: AccountWithCredentials) {
  return {
    apiKey: account.twitter_api_key || '',
    apiSecret: account.twitter_api_secret || '',
    accessToken: account.twitter_access_token || '',
    accessSecret: account.twitter_access_token_secret || '',
  };
}

async function postSingleTweet(tweet: Tweet, account: AccountWithCredentials) {
  const credentials = await getTwitterCredentialsForAccount(account);
  const fullContent = getFullTweetContent(tweet);

  if (tweet.image_url && tweet.image_status === 'completed') {
    logger.info(`🖼️ ${account.name}: Tweet has completed image. Fetching from: ${tweet.image_url}`, 'auto-post');
    try {
      const imageBuffer = await fetchImageFromUrl(tweet.image_url);
      if (imageBuffer) {
        logger.info(`🖼️ ${account.name}: Posting tweet with attached image.`, 'auto-post');
        return await postTweetWithImage(fullContent, imageBuffer, credentials);
      }
    } catch (imageError) {
      logger.error(`⚠️ ${account.name}: Error fetching Cloudinary image, falling back to text-only.`, 'auto-post', imageError as Error);
    }
  }

  logger.info(`📝 ${account.name}: Posting as a text-only tweet.`, 'auto-post');
  return await postTweet(fullContent, credentials);
}

async function processJob(job: { id: string; account_id: string }): Promise<{ posted: number; errors: number }> {
  const account = await accountService.getAccount(job.account_id);
  if (!account) {
    throw new Error(`Account not found: ${job.account_id}`);
  }

  const nowIST = getCurrentTimeInIST();
  const dayOfWeek = getCurrentISTDay(nowIST);
  const currentHourIST = getCurrentISTHour(nowIST);

  const readyTweets = await getReadyTweetsByAccount(account.id);
  const accountScheduledPersonas = getScheduledPersonasForPosting(account.twitter_handle, dayOfWeek, currentHourIST);
  
  const scheduledTweets = readyTweets
    .filter(tweet => accountScheduledPersonas.includes(tweet.persona))
    .filter(tweet => isTweetValidForPosting(tweet));

  logger.info(`📝 Found ${scheduledTweets.length} valid tweets for ${account.name}`, 'auto-post');

  let posted = 0;
  let errors = 0;

  for (const tweet of scheduledTweets) {
    try {
      await postSingleTweet(tweet, account);
      const updatedTweet: Tweet = {
        ...tweet,
        status: 'posted',
        posted_at: new Date().toISOString()
      };
      await saveTweet(updatedTweet);
      posted++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to post tweet ${tweet.id}: ${errorMsg}`, 'auto-post', error as Error);
      const failedTweet: Tweet = { ...tweet, status: 'failed', error_message: errorMsg };
      await saveTweet(failedTweet);
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

    const nowIST = getCurrentTimeInIST();
    const currentHourIST = getCurrentISTHour(nowIST);
    const dayOfWeek = getCurrentISTDay(nowIST);

    logger.info(`🔍 [GET] Auto-post check at ${currentHourIST}:00 IST`, 'auto-post');

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

    const allAccounts = await accountService.getAllAccounts();
    const twitterAccounts = allAccounts.filter(a => a.platform === 'twitter');
    
    const accountsToQueue = twitterAccounts.filter(account => {
      const hash = account.twitter_handle.split('').reduce((acc, char) => {
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
        'twitter',
        currentHourIST,
        dayOfWeek
      );
      logger.info(`📝 Enqueued ${accountsToQueue.length} accounts for Twitter posting`, 'auto-post');
    }

    const stats = await postingJobQueue.getQueueStats('twitter');
    return NextResponse.json({ 
      success: true, 
      message: accountsToQueue.length === 0 && stats.pending === 0 
        ? `⏳ No accounts scheduled for posting now.` 
        : `Enqueued ${accountsToQueue.length} accounts. Queue: ${stats.pending} pending`,
      enqueued: accountsToQueue.length,
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

    let accountsToProcess: AccountWithCredentials[] = [];
    if (requestBody.twitter_handle) {
      const account = await accountService.getAccountByTwitterHandle(requestBody.twitter_handle);
      if (account) accountsToProcess.push(account);
    } else if (requestBody.account_id) {
       const allAccounts = await accountService.getAllAccounts();
       const account = allAccounts.find(a => a.id === requestBody.account_id);
       if(account) accountsToProcess.push(account);
    } else {
      const scheduledTwitterHandles = getScheduledTwitterHandles();
      const allAccounts = await accountService.getAllAccounts();
      if (debugMode) {
        accountsToProcess = allAccounts.filter(acc => scheduledTwitterHandles.includes(acc.twitter_handle));
        logger.info(`🔍 [POST] Debug mode: Processing ${accountsToProcess.length} accounts regardless of schedule`, 'auto-post');
      } else {
        accountsToProcess = allAccounts.filter(acc => scheduledTwitterHandles.includes(acc.twitter_handle) && isPostingScheduled(acc.twitter_handle, nowIST));
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
        let scheduledPersonas = getScheduledPersonasForPosting(account.twitter_handle, getCurrentISTDay(nowIST), getCurrentISTHour(nowIST));
        
        if (debugMode && scheduledPersonas.length === 0) {
          if (account.twitter_handle.includes('gibbi')) {
            scheduledPersonas = ['english_vocab_builder'];
          } else {
            scheduledPersonas = ['business_storyteller', 'cricket_storyteller', 'satirist', 'pattern_spotter'];
          }
          logger.info(`🔍 [POST] Debug mode: Using default personas for ${account.name}: ${scheduledPersonas.join(', ')}`, 'auto-post');
        }
        
        const readyThreads = await getReadyThreads(account.id);
        const scheduledThread = readyThreads.find(thread => scheduledPersonas.includes(thread.persona));

        if (scheduledThread) {
          logger.info(`🚀 ${account.name}: Posting thread "${scheduledThread.title}"`, 'auto-post');
          const credentials = await getTwitterCredentialsForAccount(account);

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

        const readyTweets = await getReadyTweetsByAccount(account.id);
        
        const scheduledTweet = readyTweets.find(t => 
          scheduledPersonas.includes(t.persona) && 
          t.content_type === 'single_tweet' &&
          isTweetValidForPosting(t)
        );

        if (scheduledTweet) {
          logger.info(`📤 ${account.name}: No threads ready. Posting valid single tweet (<= 280 chars)...`, 'auto-post');
          try {
            const result = await postSingleTweet(scheduledTweet, account);
            const updatedTweet: Tweet = {
              ...scheduledTweet,
              status: 'posted',
              posted_at: new Date().toISOString(),
              twitter_id: result.data.id,
              twitter_url: `https://x.com/${account.twitter_handle}/status/${result.data.id}`
            };
            await saveTweet(updatedTweet);
            totalPosted++;
          } catch(error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              logger.error(`❌ ${account.name}: Failed to post single tweet ${scheduledTweet.id}: ${errorMsg}`, 'auto-post', error as Error);
              const failedTweet: Tweet = { ...scheduledTweet, status: 'failed', error_message: errorMsg };
              await saveTweet(failedTweet);
              totalErrors++;
          }
        } else {
          logger.info(`📋 ${account.name}: No ready threads or valid single tweets (<= 280 chars) found.`, 'auto-post');
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