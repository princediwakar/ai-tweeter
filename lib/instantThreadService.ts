import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';
import { Tweet } from './types';
import { saveTweet, getThreadTweet, Thread, updateThreadAfterPosting } from './db';

interface TwitterCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessSecret?: string;
  oauth2AccessToken?: string;
}

export interface ThreadPostResult {
  success: boolean;
  thread_id: string;
  tweets_posted: number;
  twitter_ids: string[];
  error?: string;
}

/**
 * Post complete thread instantly using twitter-api-v2
 */
export async function postCompleteThread(
  threadId: string,
  _accountId: string,
  totalTweets: number,
  credentials: TwitterCredentials,
  twitterHandle: string
): Promise<ThreadPostResult> {
  try {
    const client = new TwitterApi({
      appKey: credentials.apiKey || '',
      appSecret: credentials.apiSecret || '',
      accessToken: credentials.accessToken || '',
      accessSecret: credentials.accessSecret || '',
    });

    const threadTweets: Tweet[] = [];
    for (let sequence = 1; sequence <= totalTweets; sequence++) {
      const tweet = await getThreadTweet(threadId, sequence);
      if (!tweet) throw new Error(`Thread ${threadId} is missing tweet sequence ${sequence}`);
      threadTweets.push(tweet);
    }

    const twitterIds: string[] = [];
    let parentTweetId: string | null = null;
    
    for (let i = 0; i < threadTweets.length; i++) {
      const tweetContent = threadTweets[i].content;
      
      if (tweetContent.length > 280) {
        throw new Error(`Tweet ${i + 1} exceeds 280 character limit.`);
      }
      
      const tweetOptions = parentTweetId ? {
        reply: { in_reply_to_tweet_id: parentTweetId }
      } : {};
      
      try {
        // FIXED: Explicitly type the result to break circular dependency inference
        const result: TweetV2PostTweetResult = await client.v2.tweet(tweetContent, tweetOptions);
        
        const twitterId = result.data.id;
        if (!twitterId) throw new Error(`Twitter API returned no ID for tweet ${i + 1}`);
        
        twitterIds.push(twitterId);
        parentTweetId = twitterId;
        
        // Respect rate limits with a short delay
        if (i < threadTweets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        throw new Error(`Failed to post tweet ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update Database records
    for (let i = 0; i < twitterIds.length; i++) {
      await saveTweet({
        ...threadTweets[i],
        status: 'posted',
        posted_at: new Date().toISOString(),
        twitter_id: twitterIds[i],
        twitter_url: `https://x.com/${twitterHandle.replace('@', '')}/status/${twitterIds[i]}`,
        parent_twitter_id: i === 0 ? null : twitterIds[i - 1]
      });
    }

    await updateThreadAfterPosting(threadId, twitterIds[0], true);
    
    return {
      success: true,
      thread_id: threadId,
      tweets_posted: twitterIds.length,
      twitter_ids: twitterIds
    };

  } catch (error) {
    return {
      success: false,
      thread_id: threadId,
      tweets_posted: 0,
      twitter_ids: [],
      error: String(error)
    };
  }
}

export function isThreadReadyForInstantPosting(thread: Thread): boolean {
  return thread.status === 'ready' && thread.total_tweets > 0;
}

const instantThreadService = {
  postCompleteThread,
  isThreadReadyForInstantPosting
};

export default instantThreadService;