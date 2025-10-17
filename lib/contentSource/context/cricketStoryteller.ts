// lib/contentSource/context/cricketStoryteller.ts
/**
 * Cricket Storyteller context builder - returns structured data
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentCricketStorytellerSources } from '../../db';
import { fetchFromRssFeeds, fetchFromGoogle } from '../fetchers';
import type { CricketStorytellerContext } from '../types';

/**
 * Builds structured context for Cricket Storyteller persona
 * Returns structured data about main story and enrichment context
 */
export async function getCricketStorytellerContext(accountId?: string): Promise<CricketStorytellerContext | null> {
  console.log('[Content Source] 🏏 Activating Cricket Deep Dive mode...');

  try {
    const { feeds, deduplicationDays } = GENERATION_CONFIG.personas.cricketStoryteller;
    const primaryHeadlines = await fetchFromRssFeeds(feeds, 4);

    if (!primaryHeadlines || primaryHeadlines.length === 0) {
      return null; // Signal: no content available
    }

    const uniqueHeadlines = Array.from(new Map(primaryHeadlines.map((item) => [item.headline, item])).values());
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines for cricket_storyteller`);

    // Deduplication: filter out recently used sources
    let usedSources: string[] = [];
    if (accountId) {
      usedSources = await getRecentCricketStorytellerSources(accountId, deduplicationDays);
      console.log(`[Content Source] Filtering out ${usedSources.length} recently used sources (last ${deduplicationDays} days)`);
    }

    const filteredHeadlines = uniqueHeadlines.filter(h => !usedSources.includes(h.url));
    console.log(`[Content Source] ${filteredHeadlines.length} new headlines after filtering`);

    const headlinesToUse = filteredHeadlines.length > 0 ? filteredHeadlines : uniqueHeadlines;
    const mainStory = headlinesToUse[0];
    const keyPlayer = (mainStory.headline.match(/\b[A-Z][a-z]{3,}\b/g) || ['a key player'])[0];

    // Fetch enrichment context
    const enrichmentPromises = [
      fetchFromGoogle(`"${mainStory.headline}" match turning point`),
      fetchFromGoogle(`${keyPlayer} performance stats in match`),
    ];
    const settledResults = await Promise.allSettled(enrichmentPromises);
    const enrichmentContext = settledResults
      .filter(res => res.status === 'fulfilled')
      .flatMap(res => (res.status === 'fulfilled' ? res.value : []))
      .map(item => `${item.headline}${item.description ? ` -- ${item.description}` : ''}`)
      .slice(0, 4);

    return {
      mainStory,
      keyPlayer,
      enrichmentContext,
      sourceUrl: mainStory.url
    };
  } catch (error) {
    console.error('[Content Source] ❌ Context failure for cricket_storyteller:', error);
    return null;
  }
}
