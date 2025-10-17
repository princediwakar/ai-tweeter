// lib/engagement/activityScout.ts
import { getRecentTweetCounts, getUserIdByUsername, getUserRecentTweets, TweetV2 } from '../twitter';
import type { AccountWithCredentials } from '../types';
import { qualityFilters } from './config';
import { EngagementTarget } from './targets';
/**
 * Interface to track individual target activity with their tweets
 */
interface TargetWithTweets extends EngagementTarget {
  userId?: string;
  recentTweets: TweetV2[];
}

/**
 * Constructs a Twitter search query for a group of targets.
 * Excludes retweets and replies. Allows images since we filter by text length.
 */
function buildTargetGroupQuery(targets: EngagementTarget[]): string {
  const fromClauses = targets.map(t => `from:${t.username.replace('@', '')}`).join(' OR ');
  const query = `(${fromClauses}) -is:retweet -is:reply`;
  // Note: We no longer exclude images. Text length filter handles quality.
  return query;
}

/**
 * Phase 1: Uses the free Tweet Counts API to check if any target has posted recently.
 */
async function isTargetGroupActive(query: string, credentials: { apiKey: string, apiSecret: string, accessToken: string, accessSecret: string }): Promise<boolean> {
  try {
    const lookbackDate = new Date(Date.now() - qualityFilters.lookback_minutes * 60 * 1000);
    console.log(`[Scout] Checking activity from ${lookbackDate.toISOString()} (${qualityFilters.lookback_minutes} mins ago)`);
    console.log(`[Scout] Query: "${query}"`);
    const counts = await getRecentTweetCounts(query, lookbackDate.toISOString(), credentials);
    const totalTweets = counts.total_tweet_count;
    console.log(`[Scout] Found ${totalTweets} tweet(s) for query: "${query}" in the last ${qualityFilters.lookback_minutes} mins.`);
    return totalTweets > 0;
  } catch (error) {
    console.error('[Scout] Error checking tweet counts:', error);
    return false;
  }
}

/**
 * Phase 2: Fetch tweets individually from each active target using user timeline API.
 * This is more efficient than bulk search - only pulls 1-2 tweets per target.
 */
async function fetchIndividualTargetTweets(
  targets: EngagementTarget[],
  credentials: { apiKey: string, apiSecret: string, accessToken: string, accessSecret: string }
): Promise<TargetWithTweets[]> {
  const targetsWithTweets: TargetWithTweets[] = [];

  for (const target of targets) {
    try {
      // Step 1: Get user ID from username
      const userId = await getUserIdByUsername(target.username, credentials);
      if (!userId) {
        console.log(`[Scout] Skipping ${target.username} - user not found`);
        continue;
      }

      // Step 2: Fetch their recent tweets (only 5 tweets max to save quota)
      const result = await getUserRecentTweets(userId, credentials, qualityFilters.max_tweets_per_retrieval);

      if (result.data && result.data.length > 0) {
        console.log(`[Scout] ${target.username}: Found ${result.data.length} recent tweet(s)`);
        targetsWithTweets.push({
          ...target,
          userId,
          recentTweets: result.data,
        });
      } else {
        console.log(`[Scout] ${target.username}: No recent tweets`);
      }
    } catch (error) {
      console.error(`[Scout] Error fetching tweets for ${target.username}:`, error);
      // Continue to next target instead of failing completely
    }
  }

  return targetsWithTweets;
}

/**
 * Main scouting function that orchestrates the two-phase process.
 * Returns tweets with their associated target information.
 */
export async function scoutAndFetch(
  account: AccountWithCredentials,
  targets: EngagementTarget[]
): Promise<Array<TweetV2 & { targetUsername: string; targetTier: number }>> {
  if (targets.length === 0) {
    return [];
  }

  // The account object from accountService already has decrypted keys
  const credentials = {
    apiKey: account.twitter_api_key,
    apiSecret: account.twitter_api_secret,
    accessToken: account.twitter_access_token,
    accessSecret: account.twitter_access_token_secret,
  };

  // Phase 1: Quick activity check using counts API (FREE)
  const query = buildTargetGroupQuery(targets);
  const isActive = await isTargetGroupActive(query, credentials);

  if (!isActive) {
    console.log('[Scout] No recent activity detected for target group');
    return [];
  }

  // Phase 2: Fetch tweets individually from each target (COSTS QUOTA)
  console.log('[Scout] Activity detected! Fetching individual tweets...');
  const targetsWithTweets = await fetchIndividualTargetTweets(targets, credentials);

  // Flatten all tweets and attach target metadata
  const allTweets: Array<TweetV2 & { targetUsername: string; targetTier: number }> = [];
  for (const target of targetsWithTweets) {
    for (const tweet of target.recentTweets) {
      allTweets.push({
        ...tweet,
        targetUsername: target.username,
        targetTier: target.tier,
      });
    }
  }

  console.log(`[Scout] Total tweets fetched: ${allTweets.length} from ${targetsWithTweets.length} active target(s)`);
  return allTweets;
}