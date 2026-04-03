// lib/contentSource/context/linkedinAnalyst.ts
/**
 * LinkedIn Analyst context builder - returns structured data with deduplication
 */

import { GENERATION_CONFIG } from '../../generation/config';
import { getRecentSatiristData } from '../../db'; // We reuse the general DB queries or create a specific one if needed, assuming the DB function gets tweets by persona/accountId generic enough or we just use recent content logic. Actually getRecentSatiristData is currently used, let's use it for dedupe since it likely just gets recent tweets for the account. Wait, let's check if it's strictly satirist. If so, we might need a generic one, but for now we can just fetch recent tweets via sql if we want, or reuse getRecentSatiristData (which is often generic across persona if we query by account).
import { sql } from '@vercel/postgres';
import { enrichArticles, extractEntities } from '../../generation/articleEnricher';
import { fetchFromRssFeeds } from '../fetchers';
import type { LinkedinAnalystContext } from '../types';

export async function getLinkedinAnalystContext(accountId?: string): Promise<LinkedinAnalystContext | null> {
  console.log('[Content Source] 📊 LinkedIn Analyst selected. Fetching deep-dive content...');

  try {
    const { feeds, headlinesToAnalyze, headlinesInPrompt } = GENERATION_CONFIG.personas.linkedinAnalyst;
    
    // Fetch headlines from RSS feeds
    // feeds for linkedinAnalyst is an object containing arrays: { business: [], reddit: [], twitter: [] }
    const allFeeds = [...(feeds.business || [])];
    const primaryHeadlines = await fetchFromRssFeeds(allFeeds, 5, headlinesToAnalyze);

    if (primaryHeadlines.length === 0) {
      console.warn('[Content Source] ⚠️ No headlines fetched from RSS feeds');
      return null;
    }

    // Deduplicate headlines by content
    const uniqueHeadlines = Array.from(
      new Map(primaryHeadlines.map((item) => [item.headline, item])).values()
    );
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines for linkedin_analyst`);

    let usedContent: string[] = [];
    let usedSourceUrls: string[] = [];
    let patterns: { text: string }[] = [];
    
    if (accountId) {
      // Basic dedupe logic
      const recentTweets = await sql`
        SELECT content, source_url
        FROM tweets
        WHERE account_id = ${accountId} AND persona = 'linkedin_analyst'
        ORDER BY created_at DESC LIMIT 10
      `;
      usedContent = recentTweets.rows.map(t => t.content);
      usedSourceUrls = recentTweets.rows.map(t => t.source_url).filter(Boolean);
      patterns = recentTweets.rows.map(t => ({ text: t.content }));
    }

    const commonWordsForAnalyst = new Set([
        "The", "But", "And", "Shows", "This", "That", "Example", "Data", 
        "It's", "They're", "Now", "New", "Key", "Big", "Major", "Their", 
        "Its", "Has", "Had", "VC", "Fund", "Startup", "Company", "Platform", 
        "App", "Tech", "CEO", "Founder", "a", "an", "the", "in", "on", "at", "to", "for", "of" 
    ]);
    const blockedEntities = new Set<string>();

    if (patterns.length > 0) {
        patterns.forEach(p => {
            const entities = extractEntities(p.text, {
                ignoreWords: commonWordsForAnalyst,
                minLength: 3,
            });
            entities.forEach((entity) => {
                blockedEntities.add(entity.trim().toLowerCase());
            });
        });
    }

    let freshHeadlinesByEntity = uniqueHeadlines.filter(h => !usedSourceUrls.includes(h.url)); // Filter by URLs first
    if (blockedEntities.size > 0) {
      freshHeadlinesByEntity = freshHeadlinesByEntity.filter(h => {
          const headlineLower = h.headline.toLowerCase();
          return !Array.from(blockedEntities).some(entity => headlineLower.includes(entity));
      });
    }
    
    const headlinesToUse = freshHeadlinesByEntity.length > 0 ? freshHeadlinesByEntity : uniqueHeadlines;
    const selectedHeadlines = headlinesToUse.slice(0, headlinesInPrompt);

    console.log(`[Content Source] 📰 Fetching full article content for ${selectedHeadlines.length} headlines...`);
    const enrichedArticles = await enrichArticles(
      selectedHeadlines, 
      GENERATION_CONFIG.enrichment.maxConcurrent
    );

    const successfulArticles = enrichedArticles.filter(article => 
      article.fullText && article.fullText.length > 100
    );
    
    if (successfulArticles.length === 0) {
      console.error('[Content Source] ❌ No articles successfully enriched');
      return null;
    }

    const sourceMetadata = successfulArticles.map((article, idx) => ({
      index: idx + 1,
      url: article.url,
      headline: article.headline
    }));

    const articlesJson = successfulArticles.map((article, idx) => {
      const articleData = {
        index: idx + 1,
        headline: article.headline,
        url: article.url,
        fullText: article.fullText,
        entities: article.entities
      };
      return `### ARTICLE ${idx + 1}\n${JSON.stringify(articleData, null, 2)}\n### END ARTICLE ${idx + 1}`;
    }).join('\n\n');

    return {
      articles: successfulArticles,
      sourceMetadata,
      headlinesInPrompt: successfulArticles.length,
      recentContent: usedContent,
      usedSourceUrls,
      articlesJson
    };
  } catch (error) {
    console.error('[Content Source] ❌ Context failure for linkedin_analyst:', error);
    return null;
  }
}
