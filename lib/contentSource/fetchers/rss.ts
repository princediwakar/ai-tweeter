// lib/contentSource/fetchers/rss.ts
/**
 * Generic RSS feed fetcher
 */

import { parseStringPromise } from 'xml2js';
import { GENERATION_CONFIG } from '../../generation/config';
import { getRandomUserAgent, cleanDescription } from '../utils';
import type { HeadlineWithSource, RssItem } from '../types';

const fetchFn = globalThis.fetch;

/**
 * Generic RSS fetcher that processes a list of feed URLs.
 * @param feeds - Array of RSS feed URLs to fetch.
 * @param headlinesPerFeed - Number of headlines to retrieve from each feed.
 * @param totalLimit - Optional maximum number of headlines to return in total.
 * @returns A promise that resolves to an array of headlines.
 */
export async function fetchFromRssFeeds(
  feeds: readonly string[],
  headlinesPerFeed: number,
  totalLimit?: number
): Promise<HeadlineWithSource[]> {
  const userAgent = getRandomUserAgent();

  const fetchPromises = feeds.map(async (feed) => {
    try {
      const response = await fetchFn(feed, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(GENERATION_CONFIG.fetching.apiTimeout)
      });
      if (!response.ok) return [];

      const xml = await response.text();
      const parsed = await parseStringPromise(xml);
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item ?? [];

      const headlines: HeadlineWithSource[] = [];
      for (const item of items.slice(0, headlinesPerFeed)) {
        const title = item.title?.[0];
        const link = item.link?.[0];
        if (title && link) {
          headlines.push({
            headline: title,
            url: link,
            description: cleanDescription(item.description?.[0])
          });
        }
      }
      return headlines;
    } catch (error) {
      console.warn(`[Content Source] ⚠️ Failed to fetch from RSS feed: ${feed}`, error);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const allHeadlines = results.flat().sort(() => 0.5 - Math.random()); // Shuffle for variety
  console.log(`[Content Source] 📰 Fetched ${allHeadlines.length} headlines from ${feeds.length} RSS feeds`);
  return totalLimit ? allHeadlines.slice(0, totalLimit) : allHeadlines;
}

/**
 * Convenience function for fetching headlines only (used by Pattern Spotter)
 */
export async function fetchHeadlinesOnly(limit = 20): Promise<HeadlineWithSource[]> {
  console.log(`[Content Source] 📰 Fetching ${limit} headlines (no enrichment)...`);

  try {
    const headlines = await fetchFromRssFeeds(
      GENERATION_CONFIG.personas.patternSpotter.feeds.business,
      5,
      limit
    );

    if (headlines.length === 0) {
      console.warn('[Content Source] ⚠️ No headlines fetched');
      return [];
    }

    const uniqueHeadlines = Array.from(
      new Map(headlines.map((item) => [item.headline, item])).values()
    );
    console.log(`[Content Source] ✅ Fetched ${uniqueHeadlines.length} unique headlines`);
    return uniqueHeadlines.slice(0, limit).map(h => ({ ...h, sourceType: 'rss' as const }));
  } catch (error) {
    console.error('[Content Source] ❌ Failed to fetch headlines:', error);
    return [];
  }
}
