import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';
import { Post } from './types';
import { savePost, getThreadPost, Thread, updateThreadAfterPosting } from './db';

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

    const threadPosts: Post[] = [];
    for (let sequence = 1; sequence <= totalTweets; sequence++) {
      const post = await getThreadPost(threadId, sequence);
      if (!post) throw new Error(`Thread ${threadId} is missing post sequence ${sequence}`);
      threadPosts.push(post);
    }

    const twitterIds: string[] = [];
    let parentTweetId: string | null = null;
    
    for (let i = 0; i < threadPosts.length; i++) {
      const postContent = threadPosts[i].content;
      
      if (postContent.length > 280) {
        throw new Error(`Post ${i + 1} exceeds 280 character limit.`);
      }
      
      const tweetOptions = parentTweetId ? {
        reply: { in_reply_to_tweet_id: parentTweetId }
      } : {};
      
      try {
        // FIXED: Explicitly type the result to break circular dependency inference
        const result: TweetV2PostTweetResult = await client.v2.tweet(postContent, tweetOptions);
        
        const twitterId = result.data.id;
        if (!twitterId) throw new Error(`Twitter API returned no ID for tweet ${i + 1}`);
        
        twitterIds.push(twitterId);
        parentTweetId = twitterId;
        
        // Respect rate limits with a short delay
        if (i < threadPosts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        throw new Error(`Failed to post post ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Update Database records
    for (let i = 0; i < twitterIds.length; i++) {
      await savePost({
        ...threadPosts[i],
        status: 'posted',
        posted_at: new Date(),
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