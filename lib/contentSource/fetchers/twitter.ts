// lib/contentSource/fetchers/twitter.ts
/**
 * Twitter handle fetcher via Google News RSS
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { fetchFromGoogle } from './google';
import type { HeadlineWithSource } from '../types';

/**
 * Fetches recent posts from Twitter handles via Google News RSS.
 */
export async function fetchFromTwitter(twitterHandles: string[]): Promise<HeadlineWithSource[]> {
  console.log(`[Content Source] Twitter] 🚀 Fetching from ${twitterHandles.length} Twitter handles via Google News RSS...`);
  const allHeadlines: HeadlineWithSource[] = [];

  const fetchPromises = twitterHandles.map(async (handle) => {
    const cleanHandle = handle.replace('@', '');
    const query = `site:x.com/${cleanHandle}`;
    const results = await fetchFromGoogle(query);
    return results.slice(0, GENERATION_CONFIG.personas.patternSpotter.postsPerTwitterHandle).map(item => ({
      headline: `[Twitter Post from ${handle}] ${item.headline}`,
      url: item.url,
      description: item.description
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
