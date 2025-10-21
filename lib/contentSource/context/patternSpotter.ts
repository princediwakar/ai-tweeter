// lib/contentSource/context/patternSpotter.ts
import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentPatternData } from '../../db';
// MODIFIED: Import extractEntities to filter by topic
import { enrichArticles, extractEntities } from '../../generation/articleEnricher';
import { fetchHeadlinesOnly, fetchFromReddit, fetchFromTwitter } from '../fetchers';
import { selectRandomSources } from '../utils';
import type { PatternSpotterContext } from '../types';
import { RecentPattern } from '@/lib/generation';

/**
 * Builds structured context for the Pattern Spotter persona by fetching headlines,
 * filtering them for relevance, and deeply enriching the best candidates.
 */
export async function getPatternSpotterContext(accountId?: string): Promise<PatternSpotterContext | null> {
  console.log('[Context] 🔍 Pattern Spotter: Fetching and enriching articles...');

  try {
    const { feeds, subredditsToFetch, headlinesToAnalyze, twitterHandlesToFetch } = GENERATION_CONFIG.personas.patternSpotter;

    // 1. Fetch a diverse set of headlines
    const [rssHeadlines, redditHeadlines, twitterHeadlines] = await Promise.all([
      fetchHeadlinesOnly(headlinesToAnalyze),
      fetchFromReddit(selectRandomSources(feeds.reddit, subredditsToFetch)),
      fetchFromTwitter(selectRandomSources(feeds.twitter || [], twitterHandlesToFetch))
    ]);
    const allHeadlines = [...rssHeadlines, ...redditHeadlines, ...twitterHeadlines].sort(() => 0.5 - Math.random());
    console.log(`[Context] 📰 Fetched ${allHeadlines.length} total headlines.`);

    if (allHeadlines.length === 0) throw new Error('No headlines fetched.');

    // 2. Deduplicate headlines based on URL and title
    const uniqueHeadlines = Array.from(new Map(allHeadlines.map(h => [h.headline + h.url, h])).values());
    console.log(`[Context] ✨ Found ${uniqueHeadlines.length} unique headlines.`);

    // 3. MODIFIED: Filter by recently used URLs *and* recently covered entities
    let usedSourceUrls: string[] = [];
    let recentPatterns: RecentPattern[] = [];

    if (accountId) {
      // Fetch all recent data at once
      const recentData = await getRecentPatternData(accountId, 10); // Check last 10 tweets
      usedSourceUrls = recentData.usedSourceUrls;
      recentPatterns = recentData.patterns; // Get recent tweet text
      console.log(`[Context] 🚫 Blocking ${usedSourceUrls.length} recently used source URLs.`);
    }

    // Filter by URL
    const normalizeUrl = (url: string) => url.split('?')[0];
    const normalizedUsedUrls = new Set(usedSourceUrls.map(normalizeUrl));
    const freshHeadlinesByUrl = uniqueHeadlines.filter(h => !normalizedUsedUrls.has(normalizeUrl(h.url)));
    console.log(`[Context] ✅ ${freshHeadlinesByUrl.length} headlines remain after URL deduplication.`);

    // NEW: Filter by recently covered entities to prevent topic repetition
    const commonWordsForTweets = new Set(["The", "But", "And", "Shows", "This", "That", "Example", "Data", "in", "of", "for", "to", "at", "on"]);
    const blockedEntities = new Set<string>();
    recentPatterns.forEach(p => {
        const text = typeof p === 'string' ? p : p.text;
        // Only scan the hook (first line) for the main entity
        const contextText = text.split('\n')[0]; 
        const entities = extractEntities(contextText, { ignoreWords: commonWordsForTweets, minLength: 4 });
        entities.forEach(entity => blockedEntities.add(entity.toLowerCase().trim()));
    });

    let freshHeadlines = freshHeadlinesByUrl;
    if (blockedEntities.size > 0) {
      console.log(`[Context] 🚫 Blocking ${blockedEntities.size} recent entities: ${Array.from(blockedEntities).slice(0, 5).join(', ')}...`);
      freshHeadlines = freshHeadlinesByUrl.filter(h => {
          const headlineLower = h.headline.toLowerCase();
          // Check if any blocked entity is present in the new headline
          return !Array.from(blockedEntities).some(entity => headlineLower.includes(entity));
      });
      console.log(`[Context] ✅ ${freshHeadlines.length} headlines remain after entity/topic deduplication.`);
    } else {
      console.log(`[Context] ✅ No recent entities to block. Proceeding with ${freshHeadlines.length} headlines.`);
    }


    // 4. Enrich the top N fresh articles to get deep context
    const headlinesToEnrich = freshHeadlines.slice(0, GENERATION_CONFIG.personas.patternSpotter.headlinesToAnalyze);
    if (headlinesToEnrich.length === 0) throw new Error('No fresh headlines available for enrichment.');

    const enrichedArticles = await enrichArticles(
      headlinesToEnrich,
      GENERATION_CONFIG.enrichment.maxConcurrent
    );

    // 5. Filter for successfully enriched articles...
    const successfulArticles = enrichedArticles.filter(a => a.fullText && a.fullText.length > 200);
    if (successfulArticles.length === 0) throw new Error('No articles could be successfully enriched.');

    console.log(`[Context] ✅ Final context: ${successfulArticles.length} enriched articles ready for AI.`);

    // 6. Create a structured, self-contained JSON representation for EACH article.
    const articlesForPrompt = successfulArticles.map((article, idx) => ({
      index: idx + 1,
      headline: article.headline,
      url: article.url, // URL must be included for source parsing
      keyMetrics: article.keyMetrics || article.fullText?.substring(0, 1500) || '',
      entities: article.entities
    }));
    
    const articlesJson = articlesForPrompt.map(
      (a) => `### ARTICLE ${a.index}\n${JSON.stringify(a, null, 2)}\n### END ARTICLE ${a.index}`
    ).join('\n\n');
    

    // 7. MODIFIED: Get recent tweet text from the data we already fetched
    const recentContent = recentPatterns.map(p => p.text);

    return {
      articles: successfulArticles,
      sourceMetadata: successfulArticles.map((article, idx) => ({
        index: idx + 1,
        url: article.url,
        headline: article.headline
      })),
      articlesJson: articlesJson, 
      totalHeadlines: successfulArticles.length,
      recentContent, // Pass the recent content
      usedSourceUrls,
    };
  } catch (error) {
    console.error('[Context] ❌ Context failure for Pattern Spotter:', error);
    return null;
  }
}