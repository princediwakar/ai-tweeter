// lib/contentSource/context/satirist.ts
/**
 * Satirist context builder - returns structured data with deduplication
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentSatiristData } from '../../db';
// --- MODIFIED: Import extractEntities ---
import { enrichArticles, extractEntities } from '../../generation/articleEnricher';
import { fetchFromRssFeeds } from '../fetchers';
import type { SatiristContext } from '../types';
import { RecentPattern } from '@/lib/generation';

/**
 * Builds structured context for Satirist persona
 * Returns EnrichedArticle[] with source metadata and recent content for deduplication
 * ✨ MODIFIED: Now creates a pre-formatted `articlesJson` field to prevent cross-contamination.
 * ✨ MODIFIED: Added entity-based pre-filtering for deduplication.
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
    // --- MODIFIED: Store the full 'patterns' array ---
    let usedContent: string[] = [];
    let usedSourceUrls: string[] = [];
    let patterns: RecentPattern[] = []; // Store RecentPattern objects
    
    if (accountId) {
      const recentData = await getRecentSatiristData(accountId, 5);
      patterns = recentData.patterns; // Keep the full pattern objects
      usedContent = recentData.patterns.map(p => p.text);
      usedSourceUrls = recentData.usedSourceUrls;
      
      console.log(`[Content Source] 🚫 Blocking ${usedSourceUrls.length} recently used source URLs`);
      console.log(`[Content Source] 📝 Tracking ${usedContent.length} recent tweets for reference`);
    }

    // Filter out headlines from recently used source URLs
    const filteredHeadlines = uniqueHeadlines.filter(h => !usedSourceUrls.includes(h.url));
    console.log(`[Content Source] ${filteredHeadlines.length} fresh headlines after filtering used sources`);

    // --- NEW: STEP 5: Filter by Recently Covered Entities (ported from PatternSpotter) ---
    const commonWordsForSatirist = new Set([
        "The", "But", "And", "Shows", "This", "That", "Example", "Data", 
        "It's", "They're", "Now", "New", "Key", "Big", "Major", "Their", 
        "Its", "Has", "Had", "VC", "Fund", "Startup", "Company", "Platform", 
        "App", "Tech", "CEO", "Founder",
        "a", "an", "the", "in", "on", "at", "to", "for", "of" 
    ]);
    const blockedEntities = new Set<string>();

    if (patterns.length > 0) {
        patterns.forEach(p => {
            const text = p.text;
            // Extract company from "Company:" pattern (from satirist prompt)
            const match = text.match(/^([a-zA-Z0-9\s&'-]+):/);
            if (match && match[1]) {
                blockedEntities.add(match[1].trim().toLowerCase());
            }
            
            // Extract other entities
            const entities = extractEntities(text, {
                ignoreWords: commonWordsForSatirist,
                minLength: 3,
            });
            entities.forEach((entity) => {
                blockedEntities.add(entity.trim().toLowerCase());
            });
        });
    }

    let freshHeadlinesByEntity = filteredHeadlines; // Start with URL-filtered list
    if (blockedEntities.size > 0) {
      console.log(`[Content Source] 🚫 Filtering by ${blockedEntities.size} recent entities: ${Array.from(blockedEntities).slice(0, 5).join(', ')}...`);
      freshHeadlinesByEntity = filteredHeadlines.filter(h => {
          const headlineLower = h.headline.toLowerCase();
          // Check if any blocked entity is present in the new headline
          return !Array.from(blockedEntities).some(entity => headlineLower.includes(entity));
      });
      console.log(`[Content Source] 🚫 Filtered by Entity: ${freshHeadlinesByEntity.length} headlines remain (removed ${filteredHeadlines.length - freshHeadlinesByEntity.length}).`);
    } else {
      console.log(`[Content Source] ✅ No recent entities to block. Proceeding with ${freshHeadlinesByEntity.length} headlines.`);
    }
    
    if (freshHeadlinesByEntity.length === 0) {
        console.warn('[Content Source] ⚠️ No headlines remain after entity filtering. Falling back to URL-filtered list.');
    }
    // --- END NEW STEP ---

    // --- MODIFIED: Use the doubly-filtered list ---
    // Use filtered headlines, or fall back to URL-filtered list if entity filter was too aggressive
    const headlinesToUse = freshHeadlinesByEntity.length > 0 ? freshHeadlinesByEntity : filteredHeadlines;
    
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