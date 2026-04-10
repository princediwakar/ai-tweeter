// lib/contentSource/fetchers/rss.ts

import { parseStringPromise } from 'xml2js';
import { GENERATION_CONFIG } from '../../generation/config';
import { getRandomUserAgent, cleanDescription } from '../utils';
import type { HeadlineWithSource, RssItem } from '../types';

const fetchFn = globalThis.fetch;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const rssCache = new Map<string, CacheEntry<HeadlineWithSource[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

function getCacheKey(feed: string, headlinesPerFeed: number, totalLimit?: number): string {
  return `${feed}:${headlinesPerFeed}:${totalLimit ?? 'all'}`;
}

function getCachedOrNull(key: string): HeadlineWithSource[] | null {
  const entry = rssCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    rssCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: HeadlineWithSource[]): void {
  rssCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Generic RSS fetcher that processes a list of feed URLs with caching.
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
  if (!feeds || feeds.length === 0) {
    console.warn('[Content Source] ⚠️ No feeds provided to fetchFromRssFeeds');
    return [];
  }

  const cacheKey = getCacheKey(feeds.join(','), headlinesPerFeed, totalLimit);
  const cached = getCachedOrNull(cacheKey);
  
  if (cached) {
    console.log(`[Content Source] 📰 Cache hit for RSS feeds (${cached.length} headlines)`);
    return cached;
  }

  const userAgent = getRandomUserAgent();

  const fetchPromises = feeds.map(async (feed) => {
    try {
      const response = await fetchFn(feed, {
        headers: { 'User-Agent': userAgent },
        // Hard limit to 3 seconds to prevent Vercel timeouts on dead domains
        signal: AbortSignal.timeout(3000) 
      });
      
      if (!response.ok) {
        return []; // Silently fail on bad HTTP status
      }

      const contentType = response.headers.get('content-type') || '';
      
      // DEFENSIVE CHECK 1: Reject HTML headers immediately
      if (contentType.includes('text/html')) {
        console.log(`[Content Source] 🚫 Rejected: URL returned HTML headers instead of XML (${feed})`);
        return [];
      }

      const xml = await response.text();
      const trimmedXml = xml.trim();

      // DEFENSIVE CHECK 2: Reject HTML body content masquerading as XML
      if (
        trimmedXml.toLowerCase().startsWith('<!doctype html') ||
        trimmedXml.toLowerCase().startsWith('<html') ||
        trimmedXml.length === 0
      ) {
        console.log(`[Content Source] 🚫 Rejected: URL returned HTML body instead of XML (${feed})`);
        return [];
      }

      let parsed;
      try {
        // Tell xml2js to be forgiving with poorly formatted RSS feeds
        parsed = await parseStringPromise(trimmedXml, { 
          strict: false, 
          normalizeTags: true 
        });
      } catch (parseError) {
        console.log(`[Content Source] ⚠️ Malformed XML at ${feed} - skipping.`);
        return []; // Silently skip unparseable XML
      }

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
      // Clean one-liner error logging. NO stack traces.
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`[Content Source] ⚠️ Failed to fetch from RSS feed: ${feed} (${msg})`);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const allHeadlines = results.flat().sort(() => 0.5 - Math.random());
  
  const limited = totalLimit ? allHeadlines.slice(0, totalLimit) : allHeadlines;
  
  setCache(cacheKey, limited);
  console.log(`[Content Source] 📰 Fetched and cached ${limited.length} headlines from ${feeds.length} RSS feeds`);
  
  return limited;
}

/**
 * Convenience function for fetching headlines only (used by Pattern Spotter)
 * NOTE: Feeds should be passed as parameter - caller must provide from DB
 */
export async function fetchHeadlinesOnly(feeds: string[], limit = 20): Promise<HeadlineWithSource[]> {
  console.log(`[Content Source] 📰 Fetching ${limit} headlines from ${feeds?.length || 0} feeds...`);

  if (!feeds || feeds.length === 0) {
    console.warn('[Content Source] ⚠️ No feeds provided for fetchHeadlinesOnly');
    return [];
  }

  try {
    const headlines = await fetchFromRssFeeds(
      feeds,
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