// lib/contentSource/context/patternSpotter.ts
/**
 * Pattern Spotter context builder - returns structured data
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentPatternData } from '../../db'; // UPDATED: Use the function that gets both content and URLs
import { fetchHeadlinesOnly, fetchFromReddit, fetchFromTwitter } from '../fetchers';
import { selectRandomSources } from '../utils';
import type { PatternSpotterContext } from '../types';

/**
 * Builds structured context for Pattern Spotter persona
 * Returns HeadlineWithSource[] with source metadata instead of formatted strings
 */
export async function getPatternSpotterContext(accountId?: string): Promise<PatternSpotterContext | null> {
  console.log('[Content Source] 🔍 Pattern Spotter selected. Fetching a combined set of headlines for analysis...');

  try {
    const { feeds, subredditsToFetch, headlinesToAnalyze, twitterHandlesToFetch } = GENERATION_CONFIG.personas.patternSpotter;

    console.log('[Content Source] Strategy: Fetching from both News RSS, Reddit, and Twitter.');
    const subredditsToFetchFrom = selectRandomSources([...feeds.reddit], subredditsToFetch);
    const twitterHandlesToFetchFrom = selectRandomSources([...(feeds.twitter || [])], twitterHandlesToFetch);

    const [rssHeadlines, redditHeadlines, twitterHeadlines] = await Promise.all([
      fetchHeadlinesOnly(headlinesToAnalyze),
      fetchFromReddit(subredditsToFetchFrom),
      fetchFromTwitter(twitterHandlesToFetchFrom)
    ]);

    const allHeadlines = [...rssHeadlines, ...redditHeadlines, ...twitterHeadlines].sort(() => 0.5 - Math.random());
    console.log(`[Content Source] 📰 Fetched ${rssHeadlines.length} from RSS, 🤖 ${redditHeadlines.length} from Reddit, 🐦 ${twitterHeadlines.length} from Twitter. Total: ${allHeadlines.length}`);

    if (allHeadlines.length === 0) {
      throw new Error('No trending content could be fetched for Pattern Spotter after all attempts.');
    }

    // Filter out financial-only headlines
    const financialKeywords = [
      'revenue', 'profit', 'pat', 'raises', 'funding', 'series a', 'series b', 'series c',
      'valuation', 'crore', 'inr', 'usd', 'million', 'billion', '% up', '% yoy',
      'q1', 'q2', 'q3', 'q4', 'h1', 'h2', 'fy25', 'fy26', 'earnings'
    ];

    const actionOrientedHeadlines = allHeadlines.filter(h =>
      !financialKeywords.some(keyword => h.headline.toLowerCase().includes(keyword))
    );

    console.log(`[Content Source] ✅ Filtered out financial news. Kept ${actionOrientedHeadlines.length} of ${allHeadlines.length} action-oriented headlines.`);

    const headlinesToProcess = actionOrientedHeadlines.length > 0 ? actionOrientedHeadlines : allHeadlines;
    const uniqueHeadlines = Array.from(new Map(headlinesToProcess.map((item) => [item.headline, item])).values());
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines for pattern_spotter`);

    // ✨ NEW: Simple deduplication using last 5 tweets' content and source URLs
    let usedContent: string[] = [];
    let usedSourceUrls: string[] = [];
    
    if (accountId) {
      const recentData = await getRecentPatternData(accountId, 5);
      usedContent = recentData.patterns.map(p => p.text);
      usedSourceUrls = recentData.usedSourceUrls;
      
      console.log(`[Content Source] 🚫 Blocking ${usedSourceUrls.length} recently used source URLs`);
      console.log(`[Content Source] 📝 Tracking ${usedContent.length} recent tweet patterns for reference`);
    }
    const normalizeUrl = (url: string) => url.split('?')[0]; // Remove query params

    // Filter out headlines from recently used source URLs
    const normalizedUsedUrls = usedSourceUrls.map(normalizeUrl);
    const filteredHeadlines = uniqueHeadlines.filter(h => 
      !normalizedUsedUrls.includes(normalizeUrl(h.url))
    );
    console.log(`[Content Source] ${filteredHeadlines.length} fresh headlines after filtering used sources`);

    // Use filtered headlines, or fall back to unique if all were filtered
    const headlinesToUse = filteredHeadlines.length > 0 ? filteredHeadlines : uniqueHeadlines;
    
    // Take only what we need for analysis
    const selectedHeadlines = headlinesToUse.slice(0, headlinesToAnalyze);

    // Build source metadata for tracking
    const sourceMetadata = selectedHeadlines.map((h, idx) => ({
      index: idx + 1,
      url: h.url,
      headline: h.headline
    }));

    console.log(`[Content Source] ✅ Final selection: ${selectedHeadlines.length} headlines for pattern analysis`);

    return {
      headlines: selectedHeadlines,
      sourceMetadata,
      totalHeadlines: selectedHeadlines.length,
      // Include recent content for the prompt to avoid repetition
      recentContent: usedContent,
      usedSourceUrls
    };
  } catch (error) {
    console.error('[Content Source] ❌ Context failure for pattern_spotter:', error);
    return null;
  }
}