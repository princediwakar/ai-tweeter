// lib/engagement/activityScout.ts
import { getRecentTweetCounts, searchRecentTweets, TweetV2 } from '../twitter';
import type { AccountWithCredentials } from '../types';
import { qualityFilters } from './config';
import { EngagementTarget } from './targets';

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
 * Phase 2: If the group is active, fetch the actual tweets. This costs API quota.
 */
async function fetchActiveTweets(query: string, credentials: { apiKey: string, apiSecret: string, accessToken: string, accessSecret: string }): Promise<TweetV2[]> {
  try {
    const searchResult = await searchRecentTweets(query, credentials);
    console.log(`[Scout] Fetched ${searchResult.data.length} tweet(s) from active targets.`);
    return searchResult.data || [];
  } catch (error) {
    console.error('[Scout] Error fetching active tweets:', error);
    return [];
  }
}

/**
 * Main scouting function that orchestrates the two-phase process.
 */
export async function scoutAndFetch(account: AccountWithCredentials, targets: EngagementTarget[]): Promise<TweetV2[]> {
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
  
  const query = buildTargetGroupQuery(targets);
  const isActive = await isTargetGroupActive(query, credentials);

  if (isActive) {
    return await fetchActiveTweets(query, credentials);
  }

  return [];
}