import { TwitterApi } from 'twitter-api-v2';
import { Tweet } from './types';
import { saveTweet, getThreadTweet, Thread } from './db';

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

// Hashtag priority system for smart truncation
const HASHTAG_PRIORITIES: { [key: string]: number } = {
  // Core brand/theme hashtags (highest priority)
  'FarmerFirst': 10,
  'CrisisLeadership': 10,
  'BusinessDharma': 10,
  'IndianBusiness': 9,
  
  // Geographic and cultural context
  'AndhraPradesh': 8,
  'Chennai': 8,
  'Mumbai': 8,
  'Bangalore': 8,
  'IndianStartups': 8,
  
  // Industry and business terms
  'SupplyChainJugaad': 7,
  'AgriTech': 7,
  'StartupStory': 7,
  'BusinessDecisions': 7,
  
  // Generic business categories
  'IndianAgriBusiness': 6,
  'Entrepreneurship': 6,
  'TechCommentary': 6,
  
  // Broad appeal hashtags (lowest priority)
  'StartupLife': 5,
  'Innovation': 5,
  'Business': 4
};

/**
 * Smart hashtag optimization based on character limits and priority
 */
function optimizeHashtagsForCharacterLimit(content: string, hashtags: string[]): string {
  const TWITTER_LIMIT = 280;
  const baseLength = content.length + 2; // +2 for \n\n before hashtags
  const availableChars = TWITTER_LIMIT - baseLength;
  
  if (availableChars <= 0) {
    console.log(`⚠️ Content too long without hashtags (${content.length} chars), skipping hashtags`);
    return content;
  }
  
  // Create hashtag candidates with priorities and lengths
  const candidates = hashtags.map(tag => {
    const fullTag = `#${tag}`;
    return {
      tag: fullTag,
      priority: HASHTAG_PRIORITIES[tag] || 3, // Default priority for unknown tags
      length: fullTag.length,
      efficiency: (HASHTAG_PRIORITIES[tag] || 3) / fullTag.length // Priority per character
    };
  });
  
  // Sort by priority first, then by efficiency (priority/character ratio)
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.efficiency - a.efficiency;
  });
  
  // Greedy selection: pack as many high-priority hashtags as possible
  const selectedTags: string[] = [];
  let usedChars = 0;
  
  for (const candidate of candidates) {
    const spaceNeeded = candidate.length + (selectedTags.length > 0 ? 1 : 0); // +1 for space between tags
    
    if (usedChars + spaceNeeded <= availableChars) {
      selectedTags.push(candidate.tag);
      usedChars += spaceNeeded;
    }
  }
  
  if (selectedTags.length === 0) {
    console.log(`⚠️ No hashtags fit in available ${availableChars} characters`);
    return content;
  }
  
  const finalContent = `${content}\n\n${selectedTags.join(' ')}`;
  console.log(`✅ Optimized hashtags: ${selectedTags.join(' ')} (${selectedTags.length}/${hashtags.length} tags, ${finalContent.length}/280 chars)`);
  
  return finalContent;
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
      
      // AI-generated content already includes natural thread indicators
      // No system-generated numbering needed
      let finalContent = tweet.content;
      
      // Add hashtags to the last tweet only, with smart character limit handling
      if (index === threadTweets.length - 1 && tweet.hashtags && tweet.hashtags.length > 0) {
        finalContent = optimizeHashtagsForCharacterLimit(finalContent, tweet.hashtags);
      }
      
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