// lib/contentSource/context/businessStoryteller.ts
/**
 * Business Storyteller context builder - returns structured data
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentBusinessStorytellerSources } from '../../db';
import { fetchFromRssFeeds, fetchFromGoogle } from '../fetchers';
import type { BusinessStorytellerContext } from '../types';

/**
 * Builds structured context for Business Storyteller persona
 * Returns structured data about main story and enrichment context
 */
export async function getBusinessStorytellerContext(accountId?: string): Promise<BusinessStorytellerContext | null> {
  console.log('[Content Source] 🧠 Activating Indian-First Deep Dive mode for Business Storyteller...');

  try {
    const { feeds, deduplicationDays } = GENERATION_CONFIG.personas.businessStoryteller;

    const [primaryHeadlines, usedSources] = await Promise.all([
      fetchFromRssFeeds(feeds, 5),
      accountId ? getRecentBusinessStorytellerSources(accountId, deduplicationDays) : Promise.resolve([] as string[])
    ]);

    if (!primaryHeadlines || primaryHeadlines.length === 0) {
      return null; // Signal: no content available
    }

    if (accountId) {
      console.log(`[Neon] Found ${usedSources.length} recently used business_storyteller sources for account ${accountId} (last ${deduplicationDays} days)`);
    }

    const uniqueHeadlines = Array.from(new Map(primaryHeadlines.map(item => [item.headline, item])).values());
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines for business_storyteller`);

    const filteredHeadlines = uniqueHeadlines.filter(h => !usedSources.includes(h.url));
    console.log(`[Content Source] ${filteredHeadlines.length} new headlines after filtering`);

    const headlinesToUse = filteredHeadlines.length > 0 ? filteredHeadlines : uniqueHeadlines;
    if (headlinesToUse.length === 0) return null;

    const mainStory = headlinesToUse[0];
    const mainEntity = (mainStory.headline.match(/\b[A-Z][a-zA-Z]+\b/g) || ['Indian Startups'])[0];

    // Fetch enrichment context
    const enrichmentPromises = [
      fetchFromGoogle(`${mainEntity} competitors analysis India`),
      fetchFromGoogle(`${mainEntity} business model explained`),
    ];
    const settledResults = await Promise.allSettled(enrichmentPromises);
    const enrichmentContext = settledResults
      .filter(res => res.status === 'fulfilled')
      .flatMap(res => (res.status === 'fulfilled' ? res.value : []))
      .map(item => `${item.headline}${item.description ? ` -- ${item.description}` : ''}`)
      .slice(0, 4);

    return {
      mainStory,
      mainEntity,
      enrichmentContext,
      sourceUrl: mainStory.url
    };
  } catch (error) {
    console.error('[Content Source] ❌ Context failure for business_storyteller:', error);
    return null;
  }
}
