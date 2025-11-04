// lib/contentSource/context/patternSpotter.ts
import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentPatternData } from '../../db';
// Need extractEntities here for the entity filtering step
import { enrichArticles, EnrichedArticle, extractEntities } from '../../generation/articleEnricher'; 
import { fetchHeadlinesOnly, fetchFromReddit, fetchFromTwitter } from '../fetchers';
import { selectRandomSources } from '../utils';
import type { PatternSpotterContext, HeadlineWithSource } from '../types';
import { RecentPattern } from '@/lib/generation';
// Import the validator
import { ArticleValidator, ValidatableArticle } from './articleValidator'; 
import { normalizeUrl } from '@/lib/utils';



export async function getPatternSpotterContext(accountId?: string): Promise<PatternSpotterContext | null> {
  console.log('[Context] 🔍 Pattern Spotter: Fetching and filtering articles...');

  try {
    const { feeds, subredditsToFetch, headlinesToAnalyze, twitterHandlesToFetch, headlinesInPrompt } = GENERATION_CONFIG.personas.patternSpotter;

    // --- STEP 1: Fetch Diverse Headlines ---
    const [rssHeadlines, redditHeadlines, twitterHeadlines] = await Promise.all([
      fetchHeadlinesOnly(headlinesToAnalyze).then(hs => hs.map(h => ({ ...h, sourceType: 'rss' as const }))),
      fetchFromReddit(selectRandomSources(feeds.reddit, subredditsToFetch)).then(hs => hs.map(h => ({ ...h, sourceType: 'reddit' as const }))),
      fetchFromTwitter(selectRandomSources(feeds.twitter || [], twitterHandlesToFetch)).then(hs => hs.map(h => ({ ...h, sourceType: 'twitter' as const })))
    ]);
    const allHeadlines = [...rssHeadlines, ...redditHeadlines, ...twitterHeadlines].sort(() => 0.5 - Math.random());
    console.log(`[Context] 📰 Fetched ${allHeadlines.length} total headlines (RSS: ${rssHeadlines.length}, Reddit: ${redditHeadlines.length}, Twitter: ${twitterHeadlines.length}).`);
    if (allHeadlines.length === 0) throw new Error('No headlines fetched.');

    // --- STEP 2: Initial Deduplication (by URL + Title) ---
    const uniqueHeadlines = Array.from(new Map(allHeadlines.map(h => [h.headline + h.url, h])).values());
    console.log(`[Context] ✨ Found ${uniqueHeadlines.length} unique headlines.`);

    // --- STEP 3: Fetch Recent Data for Deduplication ---
    let usedSourceUrls: string[] = [];
    let recentPatterns: RecentPattern[] = [];

    if (accountId) {
      // Fetch all recent data needed for filtering
      const recentData = await getRecentPatternData(accountId, 10); // Check last 10 tweets
      usedSourceUrls = recentData.usedSourceUrls;
      recentPatterns = recentData.patterns; 
      console.log(`[Context] 📊 Fetched recent data: ${usedSourceUrls.length} URLs, ${recentPatterns.length} patterns.`);
    }

    // --- STEP 4: Filter by Recently Used URLs ---
    const normalizedUsedUrls = new Set(usedSourceUrls.map(normalizeUrl));
    const freshHeadlinesByUrl = uniqueHeadlines.filter(h => !normalizedUsedUrls.has(normalizeUrl(h.url)));
    console.log(`[Context] 🚫 Filtered by URL: ${freshHeadlinesByUrl.length} headlines remain (removed ${uniqueHeadlines.length - freshHeadlinesByUrl.length}).`);

    if (freshHeadlinesByUrl.length === 0) {
        console.warn('[Context] ⚠️ No headlines remain after URL filtering.');
        return null;
    }

    // --- STEP 5: Filter by Recently Covered Entities ---
    const commonWordsForTweets = new Set([
        "The", "But", "And", "Shows", "This", "That", "Example", "Data", 
        "With", "From", "How", "Why", "What", "When", "Where", "Now","How",
        "New", "Key", "Big", "Major", "Their", "They", "Its", "Has", "Had","Indian",
        "VC", "Fund", "Startup", "Company", "Platform", "App", "Tech", "Technology", 
        "AI", "India", "Global", "CAC", "LTV", "DAU", "Active", "Users","People",
        "early", "impossible", "historical", "Payment", "Established", "Technical", "Market", "Unit",
        // Add common English words if needed
        "a", "an", "the", "in", "on", "at", "to", "for", "of" 
    ]);
    const blockedEntities = new Set<string>();
    
    if (recentPatterns.length > 0) {
        recentPatterns.forEach(p => {
            const text = typeof p === 'string' ? p : p.text;
            // Only scan the hook (first line) for the main entity
            const firstLine = text.split('\n')[0]; 
            const entities = extractEntities(firstLine, { ignoreWords: commonWordsForTweets, minLength: 4 });
            entities.forEach(entity => blockedEntities.add(entity.toLowerCase().trim()));
        });
    }

    let freshHeadlinesByEntity = freshHeadlinesByUrl; // Start with URL-filtered list
    if (blockedEntities.size > 0) {
      console.log(`[Context] 🚫 Filtering by ${blockedEntities.size} recent entities: ${Array.from(blockedEntities).slice(0, 8).join(', ')}...`);
      freshHeadlinesByEntity = freshHeadlinesByUrl.filter(h => {
          const headlineLower = h.headline.toLowerCase();
          // Check if any blocked entity is present in the new headline
          return !Array.from(blockedEntities).some(entity => headlineLower.includes(entity));
      });
      console.log(`[Context] 🚫 Filtered by Entity: ${freshHeadlinesByEntity.length} headlines remain (removed ${freshHeadlinesByUrl.length - freshHeadlinesByEntity.length}).`);
    } else {
      console.log(`[Context] ✅ No recent entities to block. Proceeding with ${freshHeadlinesByEntity.length} headlines.`);
    }
     if (freshHeadlinesByEntity.length === 0) {
        console.warn('[Context] ⚠️ No headlines remain after entity filtering.');
        return null;
    }

    // --- STEP 6: Validate Remaining Headlines with ArticleValidator ---
    // Now pass the *doubly filtered* list to the validator
    const validatableHeadlines: ValidatableArticle[] = freshHeadlinesByEntity.map(h => ({
      headline: h.headline,
      url: h.url,
      description: h.description,
      sourceType: h.sourceType,
    }));
    
    // The validator filters AND sorts by the highest score
    const validCandidates = ArticleValidator.filterAndScore(validatableHeadlines);
    if (validCandidates.length === 0) {
      console.error('[Context] ❌ No valid candidates remain after ArticleValidator.');
      return null; // Stop if validator finds nothing suitable
    }

    // --- STEP 7: Enrich the Top Valid Candidates ---
    // Take the best candidates identified by the validator for enrichment
    const headlinesToEnrich = validCandidates.slice(0, headlinesInPrompt);
    
    const rssToEnrich = headlinesToEnrich.filter(h => h.sourceType === 'rss') as HeadlineWithSource[];
    const lightweightHeadlines = headlinesToEnrich.filter(h => h.sourceType !== 'rss');

    let successfulEnrichedArticles: EnrichedArticle[] = [];
    if (rssToEnrich.length > 0) {
      console.log(`[Context] 🔄 Enriching ${rssToEnrich.length} top-scoring RSS articles...`);
      // Pass the original HeadlineWithSource objects to enrichArticles
      const originalRssHeadlines = rssToEnrich.map(vh => 
        freshHeadlinesByEntity.find(fh => fh.url === vh.url)! // Find original obj
      );
      const enrichedArticles = await enrichArticles(
        originalRssHeadlines,
        GENERATION_CONFIG.enrichment.maxConcurrent
      );
      successfulEnrichedArticles = enrichedArticles.filter(a => a.fullText && a.fullText.length > 50);
      console.log(`[Context] ✅ ${successfulEnrichedArticles.length}/${enrichedArticles.length} RSS articles successfully enriched.`);
    }

    // Create lightweight articles from the non-RSS candidates
    const lightweightArticles = lightweightHeadlines.map(h => ({
      // Map back to EnrichedArticle structure, using headline/desc as fullText
      headline: h.headline,
      url: h.url,
      description: h.description,
      sourceType: h.sourceType,
      fullText: h.description || h.headline, 
      entities: [], // No deep entity extraction for lightweight
      keyMetrics: '', // No key metrics for lightweight
    } as EnrichedArticle)); // Cast necessary for consistent type

    // Combine: Prioritize enriched RSS, append lightweight
    const finalArticlesForPrompt = [...successfulEnrichedArticles, ...lightweightArticles];
    if (finalArticlesForPrompt.length === 0) {
      console.error('[Context] ❌ No viable articles after enrichment/lightweight processing.');
      return null;
    }

    console.log(`[Context] ✅ Final context: ${finalArticlesForPrompt.length} articles ready for AI (enriched: ${successfulEnrichedArticles.length}, lightweight: ${lightweightArticles.length}).`);

    // --- STEP 8: Format for AI Prompt ---
    const articlesForJson = finalArticlesForPrompt.map((article, idx) => ({
      index: idx + 1,
      headline: article.headline,
      url: article.url,
      content: article.fullText, 
      // keyMetrics: article.keyMetrics || '',
      // entities: article.entities || [], // Use extracted entities if available
    }));
    
    // Format as delimited blocks
    const articlesJson = articlesForJson.map(
      (a) => `### ARTICLE ${a.index}\n${JSON.stringify(a, null, 2)}\n### END ARTICLE ${a.index}`
    ).join('\n\n'); 

    // --- STEP 9: Prepare Final Context Object ---
    // const recentContent = recentPatterns.map(p => typeof p === 'string' ? p : p.text);

    return {
      articles: finalArticlesForPrompt, // The actual article objects
      sourceMetadata: finalArticlesForPrompt.map((article, idx) => ({ // Metadata for tracking
        index: idx + 1,
        url: article.url,
        headline: article.headline
      })),
      articlesJson, // The formatted string for the AI prompt
      totalHeadlines: finalArticlesForPrompt.length, // Actual count passed to AI
      // recentContent, // Pass recent tweet text for AI context (optional)
      // usedSourceUrls, // Return used URLs for logging/reference
    };
  } catch (error) {
    console.error('[Context] ❌ Context failure for Pattern Spotter:', error);
    return null;
  }
}