// lib/contentSource/context/satirist.ts
/**
 * Satirist context builder - returns structured data with deduplication
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentSatiristData } from '../../db';
import { enrichArticles } from '../../generation/articleEnricher';
import { fetchFromRssFeeds } from '../fetchers';
import type { SatiristContext } from '../types';

/**
 * Builds structured context for Satirist persona
 * Returns EnrichedArticle[] with source metadata and recent content for deduplication
 * ✨ MODIFIED: Now creates a pre-formatted `articlesJson` field to prevent cross-contamination.
 */
export async function getSatiristContext(accountId?: string): Promise<SatiristContext | null> {
  console.log('[Content Source] 🧐 Satirist selected. Activating Deep Dive with full article fetching...');

  try {
    const { feeds, headlinesToFetch, headlinesInPrompt } = GENERATION_CONFIG.personas.satirist;
    
    // Fetch headlines from RSS feeds
    const primaryHeadlines = await fetchFromRssFeeds(feeds, 5, headlinesToFetch);

    if (primaryHeadlines.length === 0) {
      console.warn('[Content Source] ⚠️ No headlines fetched from RSS feeds');
      return null;
    }

    // Deduplicate headlines by content
    const uniqueHeadlines = Array.from(
      new Map(primaryHeadlines.map((item) => [item.headline, item])).values()
    );
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines for satirist`);

    // Comprehensive deduplication using last 5 tweets
    let usedContent: string[] = [];
    let usedSourceUrls: string[] = [];
    
    if (accountId) {
      const recentData = await getRecentSatiristData(accountId, 5);
      usedContent = recentData.patterns.map(p => p.text);
      usedSourceUrls = recentData.usedSourceUrls;
      
      console.log(`[Content Source] 🚫 Blocking ${usedSourceUrls.length} recently used source URLs`);
      console.log(`[Content Source] 📝 Tracking ${usedContent.length} recent tweets for reference`);
    }

    // Filter out headlines from recently used source URLs
    const filteredHeadlines = uniqueHeadlines.filter(h => !usedSourceUrls.includes(h.url));
    console.log(`[Content Source] ${filteredHeadlines.length} fresh headlines after filtering used sources`);

    // Use filtered headlines, or fall back to unique if all were filtered
    const headlinesToUse = filteredHeadlines.length > 0 ? filteredHeadlines : uniqueHeadlines;
    
    // Take only what we need for the prompt
    const selectedHeadlines = headlinesToUse.slice(0, headlinesInPrompt);

    // Enrich articles with full content
    console.log(`[Content Source] 📰 Fetching full article content for ${selectedHeadlines.length} headlines...`);
    const enrichedArticles = await enrichArticles(
      selectedHeadlines, 
      GENERATION_CONFIG.enrichment.maxConcurrent
    );

    // Filter out articles that failed to enrich
    const successfulArticles = enrichedArticles.filter(article => 
      article.fullText && article.fullText.length > 100
    );
    
    if (successfulArticles.length === 0) {
      console.error('[Content Source] ❌ No articles successfully enriched');
      return null;
    }

    console.log(`[Content Source] ✅ Successfully enriched ${successfulArticles.length}/${enrichedArticles.length} articles`);

    // Build source metadata for tracking
    const sourceMetadata = successfulArticles.map((article, idx) => ({
      index: idx + 1,
      url: article.url,
      headline: article.headline
    }));

    // ✨ NEW: Create the sandboxed JSON string here, just like PatternSpotter
    // This is the "sealed envelope" that prevents cross-wiring.
    const articlesJson = successfulArticles.map((article, idx) => {
      const articleData = {
        index: idx + 1,
        headline: article.headline,
        url: article.url,
        fullText: article.fullText, // Pass the full text
        entities: article.entities
      };
      // Wrap it in the "sealed envelope"
      return `### ARTICLE ${idx + 1}\n${JSON.stringify(articleData, null, 2)}\n### END ARTICLE ${idx + 1}`;
    }).join('\n\n');


    return {
      articles: successfulArticles,
      sourceMetadata,
      headlinesInPrompt: successfulArticles.length, // Actual count after filtering
      recentContent: usedContent, // Include for prompt context
      usedSourceUrls, // Include for reference
      articlesJson // ✨ NEW: Pass the pre-formatted, safe-to-use string
    };
  } catch (error) {
    console.error('[Content Source] ❌ Context failure for satirist:', error);
    return null;
  }
}