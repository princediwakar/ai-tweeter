// lib/contentSource/fetchers/reddit.ts
/**
 * Reddit API fetcher with authentication
 */

import { GENERATION_CONFIG } from '../../generation/config';
import type { HeadlineWithSource, RedditPostData } from '../types';

const fetchFn = globalThis.fetch;

// Reddit API credentials from environment
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;

// Cache for the access token to avoid re-authenticating for every run
let accessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Authenticates with Reddit API and returns an access token
 */
async function getRedditAccessToken(): Promise<string> {
  // Return cached token if valid
  if (accessToken && Date.now() < tokenExpiryTime) {
    return accessToken;
  }

  // Validate that all required environment variables are set
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    throw new Error('Missing Reddit API credentials. Please check your environment variables.');
  }

  console.log('[Content Source] Reddit] 🔑 Authenticating with Reddit API...');
  const tokenUrl = 'https://www.reddit.com/api/v1/access_token';
  const userAgent = `NodeJS:TweetGenerator:v1.0 (by /u/${REDDIT_USERNAME})`;

  const authString = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
  const response = await fetchFn(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
    },
    body: `grant_type=password&username=${encodeURIComponent(REDDIT_USERNAME)}&password=${encodeURIComponent(REDDIT_PASSWORD)}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get Reddit access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;

  if (typeof newAccessToken === 'string' && newAccessToken.length > 0) {
    accessToken = newAccessToken;
    tokenExpiryTime = Date.now() + (data.expires_in - 60) * 1000;
    console.log('[Content Source] Reddit] ✅ Successfully authenticated.');
    return newAccessToken;
  } else {
    throw new Error('Reddit API did not return a valid access token.');
  }
}

/**
 * Fetches recent posts from specified subreddits via Reddit API
 */
export async function fetchFromReddit(subreddits: string[]): Promise<HeadlineWithSource[]> {
  console.log(`[Content Source] Reddit] 🚀 Fetching from ${subreddits.length} subreddits via official API...`);

  if (!REDDIT_USERNAME) {
    console.error("[Content Source] 🔴 Reddit username is not configured in environment variables.");
    return [];
  }

  try {
    const token = await getRedditAccessToken();
    const userAgent = `NodeJS:TweetGenerator:v1.0 (by /u/${REDDIT_USERNAME})`;

    const fetchPromises = subreddits.map(async (subreddit) => {
      const url = `https://oauth.reddit.com/r/${subreddit}/best?limit=${GENERATION_CONFIG.personas.patternSpotter.postsPerSubreddit}`;
      const headlinesForSubreddit: HeadlineWithSource[] = [];

      try {
        const response = await fetchFn(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': userAgent,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch r/${subreddit}: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const posts = data?.data?.children ?? [];
        const twentyFourHoursAgoInSeconds = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

        posts.forEach((post: { data: RedditPostData }) => {
          if (post.data.created_utc > twentyFourHoursAgoInSeconds) {
            headlinesForSubreddit.push({
              headline: `[r/${subreddit}] ${post.data.title}`,
              url: `https://www.reddit.com${post.data.permalink}`,
              description: post.data.selftext || undefined,
            });
          }
        });
        return headlinesForSubreddit;

      } catch (error) {
        console.warn(`[Content Source] ⚠️ Failed to fetch from Reddit API: r/${subreddit}. Error: ${error}`);
        return [];
      }
    });

    const settledResults = await Promise.allSettled(fetchPromises);
    const allHeadlines: HeadlineWithSource[] = [];
    settledResults.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allHeadlines.push(...res.value);
      }
    });

    console.log(`[Content Source] Reddit] ✅ Got ${allHeadlines.length} recent posts via API.`);
    return allHeadlines;

  } catch (authError) {
    console.error(`[Content Source] 🔴 Reddit API Authentication Failed: ${authError}`);
    return [];
  }
}
