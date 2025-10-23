// lib/contentSource/context/patternSpotter.ts
import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentPatternData } from '../../db';
// MODIFIED: Import extractEntities to filter by topic
import { enrichArticles, EnrichedArticle, extractEntities } from '../../generation/articleEnricher';
import { fetchHeadlinesOnly, fetchFromReddit, fetchFromTwitter } from '../fetchers';
import { selectRandomSources } from '../utils';
import type {  PatternSpotterContext } from '../types';
import { RecentPattern } from '@/lib/generation';

export async function getPatternSpotterContext(accountId?: string): Promise<PatternSpotterContext | null> {
  console.log('[Context] 🔍 Pattern Spotter: Fetching and enriching articles...');

  try {
    const { feeds, subredditsToFetch, headlinesToAnalyze, twitterHandlesToFetch, headlinesInPrompt } = GENERATION_CONFIG.personas.patternSpotter;

    // 1. Fetch a diverse set of headlines with source tagging
    const [rssHeadlines, redditHeadlines, twitterHeadlines] = await Promise.all([
      fetchHeadlinesOnly(headlinesToAnalyze).then(hs => hs.map(h => ({ ...h, sourceType: 'rss' as const }))),
      fetchFromReddit(selectRandomSources(feeds.reddit, subredditsToFetch)).then(hs => hs.map(h => ({ ...h, sourceType: 'reddit' as const }))),
      fetchFromTwitter(selectRandomSources(feeds.twitter || [], twitterHandlesToFetch)).then(hs => hs.map(h => ({ ...h, sourceType: 'twitter' as const })))
    ]);
    const allHeadlines = [...rssHeadlines, ...redditHeadlines, ...twitterHeadlines].sort(() => 0.5 - Math.random());

    console.log(`[Context] 📰 Fetched ${allHeadlines.length} total headlines (RSS: ${rssHeadlines.length}, Reddit: ${redditHeadlines.length}, Twitter: ${twitterHeadlines.length}).`);

    if (allHeadlines.length === 0) throw new Error('No headlines fetched.');

    // 2. Deduplicate headlines based on URL and title
    const uniqueHeadlines = Array.from(new Map(allHeadlines.map(h => [h.headline + h.url, h])).values());
    console.log(`[Context] ✨ Found ${uniqueHeadlines.length} unique headlines.`);

    // 3. Filter by recently used URLs *and* recently covered entities
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

    // Filter by recently covered entities to prevent topic repetition
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

    // 4. Separate RSS for deep enrichment; non-RSS as lightweight
    const rssHeadlinesOnly = freshHeadlines.filter(h => h.sourceType === 'rss');
    console.log(`[Context] 📄 ${rssHeadlinesOnly.length} RSS articles available for deep enrichment.`);

    let enrichedArticles: Awaited<ReturnType<typeof enrichArticles>>[number][] = [];
    if (rssHeadlinesOnly.length > 0) {
      const headlinesToEnrich = rssHeadlinesOnly.slice(0, headlinesInPrompt);
      enrichedArticles = await enrichArticles(
        headlinesToEnrich,
        GENERATION_CONFIG.enrichment.maxConcurrent
      );
      console.log(`[Context] 🔄 Enriched ${enrichedArticles.length} RSS articles.`);
    } else {
      console.warn(`[Context] ⚠️ No RSS sources for enrichment. Relying on lightweight headlines.`);
    }

    // Filter for successfully enriched RSS articles
    const successfulEnrichedArticles = enrichedArticles.filter(a => a.fullText && a.fullText.length > 50);
    console.log(`[Context] ✅ ${successfulEnrichedArticles.length}/${enrichedArticles.length} RSS articles successfully enriched.`);

    // Create lightweight articles from non-RSS sources (use description as proxy for fullText)
    const lightweightArticles = freshHeadlines
      .filter(h => h.sourceType !== 'rss')
      .slice(0, 5)  // Limit to avoid prompt bloat
      .map(h => ({
        ...h,
        fullText: h.description || h.headline,  // Fallback to description or headline
        entities: [],  // No entities for lightweight
        keyMetrics: '',  // No metrics for lightweight
      } as EnrichedArticle));  // Type assertion; align with EnrichedArticle if possible

    // Combine: Prioritize enriched RSS, append lightweight
    const allArticles = [...successfulEnrichedArticles, ...lightweightArticles];
    if (allArticles.length === 0) {
      console.error('No viable articles after source separation.');
      return null;
    }

    console.log(`[Context] ✅ Final context: ${allArticles.length} articles ready for AI (enriched: ${successfulEnrichedArticles.length}, lightweight: ${lightweightArticles.length}).`);

    // 5. Create a structured, self-contained JSON representation for EACH article.
    const articlesForPrompt = allArticles.map((article, idx) => ({
      index: idx + 1,
      headline: article.headline,
      url: article.url, // URL must be included for source parsing
      keyMetrics: article.keyMetrics || '',
      entities: article.entities || []
    }));
    
    const articlesJson = articlesForPrompt.map(
      (a) => `### ARTICLE ${a.index}\n${JSON.stringify(a, null, 2)}\n### END ARTICLE ${a.index}`
    ).join('\n\n');

    // 6. Get recent tweet text from the data we already fetched
    const recentContent = recentPatterns.map(p => typeof p === 'string' ? p : p.text);

    return {
      articles: allArticles,
      sourceMetadata: allArticles.map((article, idx) => ({
        index: idx + 1,
        url: article.url,
        headline: article.headline
      })),
      articlesJson, 
      totalHeadlines: allArticles.length,
      recentContent,
      usedSourceUrls,
    };
  } catch (error) {
    console.error('[Context] ❌ Context failure for Pattern Spotter:', error);
    return null;
  }
}