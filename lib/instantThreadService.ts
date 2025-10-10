// lib/instantThreadService.ts
import { TwitterApi } from 'twitter-api-v2';
import { Tweet } from './types';
import { saveTweet, getThreadTweet, Thread, updateThreadAfterPosting } from './db';

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface ThreadPostResult {
  success: boolean;
  thread_id: string;
  tweets_posted: number;
  twitter_ids: string[];
  error?: string;
}

/**
 * Post complete thread instantly using twitter-api-v2 tweetThread method
 */
export async function postCompleteThread(
  threadId: string,
  _accountId: string,
  totalTweets: number,
  credentials: TwitterCredentials,
  twitterHandle: string
): Promise<ThreadPostResult> {
  try {
    console.log(`🚀 Starting instant thread posting for thread ${threadId} (${totalTweets} tweets)`);
    
    // Initialize Twitter API client
    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });

    // Get all tweets for the thread in sequence order
    const threadTweets: Tweet[] = [];
    for (let sequence = 1; sequence <= totalTweets; sequence++) {
      const tweet = await getThreadTweet(threadId, sequence);
      if (!tweet) {
        throw new Error(`Missing tweet ${sequence} in thread ${threadId}`);
      }
      threadTweets.push(tweet);
    }

    console.log(`✅ Retrieved ${threadTweets.length} tweets for thread ${threadId}`);

    // Prepare and validate thread content with proper formatting
    const threadContent: string[] = [];
    const validationErrors: string[] = [];
    
    for (let index = 0; index < threadTweets.length; index++) {
      const tweet = threadTweets[index];

      // AI-generated content already includes natural thread indicators and hashtags
      // No post-processing needed - post exactly as generated
      const finalContent = tweet.content;

      // Pre-validate character limits
      const sequenceNum = index + 1;
      if (finalContent.length > 280) {
        validationErrors.push(`Tweet ${sequenceNum} exceeds 280 characters (${finalContent.length} chars)`);
        console.error(`❌ Tweet ${sequenceNum} validation failed: ${finalContent.length} characters`);
      } else {
        console.log(`✅ Tweet ${sequenceNum} validated: ${finalContent.length}/280 characters`);
      }

      threadContent.push(finalContent);
    }
    
    // Abort if any validation errors
    if (validationErrors.length > 0) {
      throw new Error(`Thread validation failed: ${validationErrors.join('; ')}`);
    }

    console.log(`📝 All ${threadContent.length} tweets validated and formatted for posting`);
    console.log(`📝 First tweet preview: ${threadContent[0].substring(0, 100)}...`);

    // All tweets pre-validated - now post sequentially
    const twitterIds: string[] = [];
    let parentTweetId: string | null = null;
    
    for (let i = 0; i < threadContent.length; i++) {
      console.log(`📤 Posting tweet ${i + 1}/${threadContent.length}...`);
      
      const tweetOptions = parentTweetId ? {
        reply: { in_reply_to_tweet_id: parentTweetId }
      } : {};
      
      try {
        const result = await client.v2.tweet(threadContent[i], tweetOptions);
        const twitterId: string = result.data?.id;
        
        if (!twitterId) {
          throw new Error('Twitter API returned no tweet ID');
        }
        
        twitterIds.push(twitterId);
        parentTweetId = twitterId;
        
        console.log(`✅ Posted tweet ${i + 1}/${threadContent.length} - ID: ${twitterId}`);
        
        // Add delay between tweets to respect rate limits (except for last tweet)
        if (i < threadContent.length - 1) {
          console.log(`⏳ Waiting 3 seconds before next tweet...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to post tweet ${i + 1}/${threadContent.length}:`, error);
        throw new Error(`Thread posting failed at tweet ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`✅ Successfully posted complete thread: ${twitterIds.length}/${threadContent.length} tweets`);

    // Update all posted tweets in database with Twitter IDs and URLs
    let previousTwitterId: string | null = null;
    
    for (let i = 0; i < twitterIds.length; i++) {
      const tweet = threadTweets[i];
      const twitterId = twitterIds[i];
      
      const updatedTweet = {
        ...tweet,
        status: 'posted' as const,
        posted_at: new Date().toISOString(),
        twitter_id: twitterId,
        twitter_url: `https://x.com/${twitterHandle.replace('@', '')}/status/${twitterId}`,
        parent_twitter_id: previousTwitterId
      };
      
      await saveTweet(updatedTweet);
      console.log(`💾 Updated tweet ${tweet.id} (sequence ${i + 1}) with Twitter ID: ${twitterId}`);
      
      previousTwitterId = twitterId;
    }

    // Update thread status to completed
    await updateThreadAfterPosting(threadId, twitterIds[0], true);
    console.log(`✅ Updated thread ${threadId} status to 'completed'`);

    // Log thread URLs for easy access
    if (twitterIds.length > 0) {
      const threadUrl = `https://x.com/${twitterHandle.replace('@', '')}/status/${twitterIds[0]}`;
      console.log(`🔗 Thread posted: ${threadUrl} (${twitterIds.length}/${threadContent.length} tweets)`);
    }
    
    return {
      success: true,
      thread_id: threadId,
      tweets_posted: twitterIds.length,
      twitter_ids: twitterIds
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to post complete thread ${threadId}:`, errorMsg);
    
    return {
      success: false,
      thread_id: threadId,
      tweets_posted: 0,
      twitter_ids: [],
      error: errorMsg
    };
  }
}

/**
 * Check if a thread is ready for instant posting
 */
export function isThreadReadyForInstantPosting(thread: Thread): boolean {
  return thread.status === 'ready' && thread.total_tweets > 0;
}

/**
 * Format thread preview for logging
 */
export function getThreadPreview(threadId: string, title: string, totalTweets: number): string {
  return `Thread "${title}" (${threadId}) - ${totalTweets} tweets`;
}

const instantThreadService = {
  postCompleteThread,
  isThreadReadyForInstantPosting,
  getThreadPreview
};

export default instantThreadService;