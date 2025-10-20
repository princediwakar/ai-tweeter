
// lib/contentSource/context/patternSpotter.ts
import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentPatternData } from '../../db';
import { enrichArticles } from '../../generation/articleEnricher';
import { fetchHeadlinesOnly, fetchFromReddit, fetchFromTwitter } from '../fetchers';
import { selectRandomSources } from '../utils';
import type { PatternSpotterContext } from '../types';

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

    // 3. Filter out recently used source URLs to ensure freshness
    let usedSourceUrls: string[] = [];
    if (accountId) {
      const recentData = await getRecentPatternData(accountId, 10); // Check last 10 tweets
      usedSourceUrls = recentData.usedSourceUrls;
      console.log(`[Context] 🚫 Blocking ${usedSourceUrls.length} recently used source URLs.`);
    }
    const normalizeUrl = (url: string) => url.split('?')[0];
    const normalizedUsedUrls = new Set(usedSourceUrls.map(normalizeUrl));
    const freshHeadlines = uniqueHeadlines.filter(h => !normalizedUsedUrls.has(normalizeUrl(h.url)));
    console.log(`[Context] ✅ ${freshHeadlines.length} fresh headlines remain after deduplication.`);

    // 4. Enrich the top N fresh articles to get deep context
    const headlinesToEnrich = freshHeadlines.slice(0, 3);
    if (headlinesToEnrich.length === 0) throw new Error('No fresh headlines available for enrichment.');

    const enrichedArticles = await enrichArticles(
      headlinesToEnrich,
      GENERATION_CONFIG.enrichment.maxConcurrent
    );

    // 5. Filter for successfully enriched articles...
    const successfulArticles = enrichedArticles.filter(a => a.fullText && a.fullText.length > 200);
    if (successfulArticles.length === 0) throw new Error('No articles could be successfully enriched.');

    console.log(`[Context] ✅ Final context: ${successfulArticles.length} enriched articles ready for AI.`);

    // 6. Create a structured JSON representation of the articles
    // This prevents the AI from mixing up metrics between articles.
    const articlesForJson = successfulArticles.map((article, idx) => ({
      index: idx + 1,
      headline: article.headline,
      url: article.url,
      // Only include keyMetrics/entities to keep the context focused and clean
      keyMetrics: article.keyMetrics || article.fullText?.substring(0, 1000) || '', 
      entities: article.entities
    }));
    const articlesJson = JSON.stringify(articlesForJson, null, 2);

    // 7. Get recent tweet text for the AI to avoid repeating patterns
    const recentContent = accountId ? (await getRecentPatternData(accountId, 5)).patterns.map(p => p.text) : [];

    return {
      articles: successfulArticles,
      sourceMetadata: successfulArticles.map((article, idx) => ({
        index: idx + 1,
        url: article.url,
        headline: article.headline
      })),
      articlesJson: articlesJson, // ✨ POPULATE THE JSON FIELD
      totalHeadlines: successfulArticles.length,
      recentContent,
      usedSourceUrls,
    };
  } catch (error) {
    console.error('[Context] ❌ Context failure for Pattern Spotter:', error);
    return null;
  }
}
