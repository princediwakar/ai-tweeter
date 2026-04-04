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
 * Builds a Twitter search query for a single target.
 * Excludes retweets and replies.
 */
function buildSingleTargetQuery(target: EngagementTarget): string {
  const username = target.username.replace('@', '');
  return `from:${username} -is:retweet -is:reply`;
}

/**
 * Phase 1: Check counts for each target individually (free API).
 * Returns active targets (those with >0 tweets in lookback).
 */
async function getTargetActivityCounts(
  targets: EngagementTarget[],
  lookbackDate: string,
  credentials: { apiKey: string, apiSecret: string, accessToken: string, accessSecret: string }
): Promise<EngagementTarget[]> {
  console.log(`[Scout] Checking activity from ${lookbackDate} (${qualityFilters.lookback_minutes} mins ago)`);
  const activeTargets: EngagementTarget[] = [];
  for (const target of targets) {
    try {
      const query = buildSingleTargetQuery(target);
      console.log(`[Scout] Query for ${target.username}: "${query}"`);
      const counts = await getRecentTweetCounts(query, lookbackDate, credentials);
      const totalTweets = counts.total_tweet_count;
      console.log(`[Scout] ${target.username}: Found ${totalTweets} tweet(s) in last ${qualityFilters.lookback_minutes} mins`);
      if (totalTweets > 0) {
        activeTargets.push(target);
      }
    } catch (error) {
      console.error(`[Scout] Error checking counts for ${target.username}:`, error);
      // Continue; don't fail the whole scan
    }
  }
  return activeTargets;
}

/**
 * Phase 2: Fetch tweets only from active targets.
 * Now single-focus: Pick one if multiple (rotate via random for simplicity).
 */
async function fetchIndividualTargetTweets(
  activeTargets: EngagementTarget[],
  credentials: { apiKey: string, apiSecret: string, accessToken: string, accessSecret: string },
  lookbackDate: string
): Promise<TargetWithTweets[]> {
  // Single-focus: If multiple active, pick one (random; could be round-robin via DB if needed)
  const selectedTarget = activeTargets.length > 1 
    ? activeTargets[Math.floor(Math.random() * activeTargets.length)] 
    : activeTargets[0];
  
  if (!selectedTarget) return [];

  console.log(`[Scout] Focusing on active target: ${selectedTarget.username} ${activeTargets.length > 1 ? `(skipping ${activeTargets.length - 1} others)` : ''}`);
  const targetsWithTweets: TargetWithTweets[] = [];
  
  try {
    // Get user ID
    const userId = await getUserIdByUsername(selectedTarget.username, credentials);
    if (!userId) {
      console.log(`[Scout] Skipping ${selectedTarget.username} - user not found`);
      return [];
    }
    
    // Fetch recent tweets (with start_time to limit scope)
    const result = await getUserRecentTweets(userId, credentials, qualityFilters.max_tweets_per_retrieval, lookbackDate);
    let recentTweets = result.data || [];
    
// Safety filter: Ensure all are within lookback (in case API ignores start_time)
const now = new Date();
const lookbackMs = qualityFilters.lookback_minutes * 60 * 1000;
recentTweets = recentTweets.filter(tweet => {
  if (!tweet.created_at) {
    console.warn(`[Scout] Skipping tweet ${tweet.id} - missing created_at`);
    return false;
  }
  const tweetTime = new Date(tweet.created_at).getTime();
  return (now.getTime() - tweetTime) <= lookbackMs;
});
    
    if (recentTweets.length > 0) {
      console.log(`[Scout] ${selectedTarget.username}: Found ${recentTweets.length} recent tweet(s)`);
      targetsWithTweets.push({
        ...selectedTarget,
        userId,
        recentTweets,
      });
    } else {
      console.log(`[Scout] ${selectedTarget.username}: No qualifying recent tweets after filter`);
    }
  } catch (error) {
    console.error(`[Scout] Error fetching tweets for ${selectedTarget.username}:`, error);
    // Don't throw; log and continue (could retry in 15min via cron)
  }
  
  return targetsWithTweets;
}

/**
 * Main scouting function: Two-phase, quota-efficient.
 * Returns tweets with target metadata (single-focus).
 */
export async function scoutAndFetch(
  account: AccountWithCredentials,
  targets: EngagementTarget[]
): Promise<Array<TweetV2 & { targetUsername: string; targetTier: number }>> {
  if (targets.length === 0) {
    return [];
  }
  
  const credentials = {
    apiKey: account.twitter_api_key || '',
    apiSecret: account.twitter_api_secret || '',
    accessToken: account.twitter_access_token || '',
    accessSecret: account.twitter_access_token_secret || '',
  };
  
  const lookbackDate = new Date(Date.now() - qualityFilters.lookback_minutes * 60 * 1000).toISOString();
  
  // Phase 1: Free counts per target
  const activeTargets = await getTargetActivityCounts(targets, lookbackDate, credentials);
  if (activeTargets.length === 0) {
    console.log('[Scout] No recent activity detected across targets');
    return [];
  }
  
  // Phase 2: Fetch only from selected active target(s)
  console.log(`[Scout] ${activeTargets.length} active target(s) found! Fetching tweets...`);
  const targetsWithTweets = await fetchIndividualTargetTweets(activeTargets, credentials, lookbackDate);
  
  // Flatten tweets with metadata
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
  
  console.log(`[Scout] Total tweets fetched: ${allTweets.length} from ${targetsWithTweets.length} target(s)`);
  return allTweets;
}