// lib/contentSource/fetchers/google.ts
/**
 * Google News RSS search fetcher
 */

import { parseStringPromise } from 'xml2js';
import { GENERATION_CONFIG } from '../../generation/config';
import { getRandomUserAgent, cleanDescription } from '../utils';
import type { HeadlineWithSource, RssItem } from '../types';

const fetchFn = globalThis.fetch;

/**
 * Fetches headlines from Google News RSS search for a given query
 */
export async function fetchFromGoogle(query: string): Promise<HeadlineWithSource[]> {
  const userAgent = getRandomUserAgent();
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await fetchFn(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(GENERATION_CONFIG.fetching.apiTimeout)
    });

    if (!response.ok) throw new Error(`Google News responded with status: ${response.status}`);

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);
    const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 4) ?? [];

    const headlines: HeadlineWithSource[] = [];
    for (const item of items) {
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
    console.warn(`[Content Source] ⚠️ Failed to fetch from Google News for query "${query}":`, error);
    return [];
  }
}
