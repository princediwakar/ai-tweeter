// lib/contentSource/fetchers/twitter.ts
/**
 * Twitter handle fetcher via Google News RSS
 * Requires config from DB (personas.config)
 */

import { fetchFromGoogle } from './google';
import type { HeadlineWithSource } from '../types';

/**
 * Fetches recent posts from Twitter handles via Google News RSS.
 */
export async function fetchFromTwitter(twitterHandles: string[], limitPerHandle: number = 5): Promise<HeadlineWithSource[]> {
  if (!twitterHandles || twitterHandles.length === 0) {
    return [];
  }
  
  console.log(`[Content Source] Twitter] 🚀 Fetching from ${twitterHandles.length} Twitter handles via Google News RSS...`);
  const allHeadlines: HeadlineWithSource[] = [];

  const fetchPromises = twitterHandles.map(async (handle) => {
    const cleanHandle = handle.replace('@', '');
    const query = `site:x.com/${cleanHandle}`;
    const results = await fetchFromGoogle(query);
    return results.slice(0, limitPerHandle).map(item => ({
      headline: `[Twitter Post from ${handle}] ${item.headline}`,
      url: item.url,
      description: item.description,
      sourceType: 'twitter' as const
    }));
  });

  const settledResults = await Promise.allSettled(fetchPromises);

  settledResults.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allHeadlines.push(...res.value);
    }
  });

  console.log(`[Content Source] Twitter] ✅ Got ${allHeadlines.length} recent posts from Twitter via Google.`);
  return allHeadlines;
}
