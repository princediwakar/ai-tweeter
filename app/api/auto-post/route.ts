// app/api/auto-post/route.ts
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
import { AccountWithCredentials, Tweet } from '@/lib/types';


/**
 * Fetches an image from a URL and returns it as a Buffer.
 */
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

/**
 * Checks if a tweet is ready for posting, including image status validation
 */
function isTweetReadyForPosting(tweet: Tweet): boolean {
  // If no image is expected, tweet is ready
  if (!tweet.image_status || tweet.image_status === 'none') {
    return true;
  }
  
  // If image is expected, only post when image is completed or failed (with fallback to text)
  return tweet.image_status === 'completed' || tweet.image_status === 'failed';
}

/**
 * Handles posting a single tweet. It posts with an image if image_url is present,
 * otherwise posts as a text-only tweet. On-the-fly image generation is removed.
 */
async function postSingleTweet(tweet: Tweet, account: AccountWithCredentials) {
  const credentials = {
    apiKey: account.twitter_api_key,
    apiSecret: account.twitter_api_secret,
    accessToken: account.twitter_access_token,
    accessSecret: account.twitter_access_token_secret,
  };

  // Combine content and hashtags for the final tweet text.
  const fullContent = tweet.hashtags?.length > 0 
    ? `${tweet.content}\n\n${tweet.hashtags.map(tag => `${tag}`).join(' ')}` 
    : tweet.content;

  // If an image_url exists and image processing is complete, post with image
  if (tweet.image_url && tweet.image_status === 'completed') {
    logger.info(`🖼️ ${account.name}: Tweet has completed image. Fetching from: ${tweet.image_url}`, 'auto-post');
    try {
      const imageBuffer = await fetchImageFromUrl(tweet.image_url);
      if (imageBuffer) {
        logger.info(`🖼️ ${account.name}: Posting tweet with attached image.`, 'auto-post');
        return await postTweetWithImage(fullContent, imageBuffer, credentials);
      } else {
        logger.warn(`⚠️ ${account.name}: Failed to fetch image buffer from Cloudinary, posting as text-only.`, 'auto-post');
      }
    } catch (imageError) {
      logger.error(`⚠️ ${account.name}: Error fetching Cloudinary image, falling back to text-only.`, 'auto-post', imageError as Error);
    }
  } else if (tweet.image_status === 'failed') {
    logger.info(`⚠️ ${account.name}: Image generation failed, posting as text-only tweet.`, 'auto-post');
  }

  // Fallback for text-only tweets or if image fetching failed.
  logger.info(`📝 ${account.name}: Posting as a text-only tweet.`, 'auto-post');
  return await postTweet(fullContent, credentials);
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

    logger.info(`🔍 [GET] Multi-account posting check at ${currentHourIST}:00 IST`, 'auto-post');

    const scheduledTwitterHandles = getScheduledTwitterHandles();
    const allAccounts = await accountService.getAllAccounts();
    const activeScheduledAccounts = scheduledTwitterHandles.filter(handle => {
      const account = allAccounts.find(acc => acc.twitter_handle === handle);
      return account && isPostingScheduled(handle, nowIST);
    });

    if (activeScheduledAccounts.length === 0) {
      return NextResponse.json({ success: true, message: `⏳ No accounts scheduled for posting now.` });
    }
    
    const accountsToProcess = allAccounts.filter(acc => activeScheduledAccounts.includes(acc.twitter_handle));

    let totalPosted = 0;
    let totalErrors = 0;

    for (const account of accountsToProcess) {
      logger.info(`🏢 Processing account: ${account.name} (@${account.twitter_handle})`, 'auto-post');
      try {
        const readyTweets = await getReadyTweetsByAccount(account.id);
        const accountScheduledPersonas = getScheduledPersonasForPosting(account.twitter_handle, dayOfWeek, currentHourIST);
        const scheduledTweets = readyTweets
          .filter(tweet => accountScheduledPersonas.includes(tweet.persona))
          .filter(tweet => isTweetReadyForPosting(tweet));

        logger.info(`📝 Found ${scheduledTweets.length} scheduled tweets for ${account.name}`, 'auto-post');

        for (const tweet of scheduledTweets) {
          try {
            logger.info(`📤 ${account.name}: Posting tweet: ${tweet.content.substring(0, 50)}...`, 'auto-post');
            
            const result = await postSingleTweet(tweet, account);

            const updatedTweet: Tweet = {
              ...tweet,
              status: 'posted',
              posted_at: new Date().toISOString(),
              twitter_id: result.data.id,
              twitter_url: `https://x.com/${account.twitter_handle}/status/${result.data.id}`
            };
            
            await saveTweet(updatedTweet);
            totalPosted++;
            logger.info(`✅ ${account.name}: Posted tweet ${tweet.id}`, 'auto-post');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`❌ ${account.name}: Failed to post tweet ${tweet.id}: ${errorMsg}`, 'auto-post', error as Error);
            
            const failedTweet: Tweet = { ...tweet, status: 'failed', error_message: errorMsg };
            await saveTweet(failedTweet);
            totalErrors++;
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to process account ${account.name}`, 'auto-post', error as Error);
        totalErrors++;
      }
    }

    logger.info(`📊 [GET] Summary: ${totalPosted} posted, ${totalErrors} errors.`, 'auto-post');
    return NextResponse.json({ success: true, totalPosted, totalErrors });

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
          const credentials = {
            apiKey: account.twitter_api_key,
            apiSecret: account.twitter_api_secret,
            accessToken: account.twitter_access_token,
            accessSecret: account.twitter_access_token_secret,
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

        const readyTweets = await getReadyTweetsByAccount(account.id);
        const scheduledTweet = readyTweets.find(t => scheduledPersonas.includes(t.persona) && t.content_type === 'single_tweet');

        if (scheduledTweet) {
          logger.info(`📤 ${account.name}: No threads ready. Posting single tweet...`, 'auto-post');
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
          logger.info(`📋 ${account.name}: No ready content found.`, 'auto-post');
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