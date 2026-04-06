// lib/contentSource/index.ts
/**
 * Main entry point for content source module
 * Fetches structured data and formats it into strings for prompts
 * 
 * DESIGN: All content sources are read from DB (personas.rss_sources, personas.config)
 * No hardcoded persona handlers - all personas are dynamic
 */

import { getPersona } from '../db';
import { fetchFromRssFeeds } from './fetchers';
import { enrichArticles } from '../generation/articleEnricher';
import { formatPersonaContext } from './formatters';
import type { PersonaContext, EnrichedArticle } from './types';

interface DynamicContextResult {
  articles: EnrichedArticle[];
  sourceMetadata: Array<{ index: number; url: string; headline: string }>;
  articlesJson?: string;
  headlinesInPrompt: number;
  recentContent?: string[];
  usedSourceUrls?: string[];
}

/**
 * Generic context builder that works for ANY persona with RSS sources
 * Reads config from DB - no hardcoded persona names
 */
async function buildDynamicContext(
  personaKey: string,
  accountId?: string
): Promise<DynamicContextResult | null> {
  console.log(`[Content Source] 🔄 Building dynamic context for persona: ${personaKey}`);

  // Get persona config from DB
  const dbPersona = await getPersona(personaKey);
  if (!dbPersona) {
    console.warn(`[Content Source] Persona not found in DB: ${personaKey}`);
    return null;
  }

  const rssSources = dbPersona?.rss_sources || [];
  if (rssSources.length === 0) {
    console.warn(`[Content Source] No RSS sources configured for persona: ${personaKey}`);
    return null;
  }

  // Get generation config from persona
  const config = dbPersona?.config as Record<string, unknown> || {};
  const headlinesToFetch = Number(config.headlines_to_fetch) || 20;
  const headlinesInPrompt = Number(config.headlines_in_prompt) || 5;

  // Fetch headlines from RSS
  const headlines = await fetchFromRssFeeds(rssSources, 5, headlinesToFetch);
  if (headlines.length === 0) {
    console.warn(`[Content Source] No headlines fetched from RSS feeds`);
    return null;
  }

  // Deduplicate
  const uniqueHeadlines = Array.from(
    new Map(headlines.map((item) => [item.headline, item])).values()
  );
  console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines`);

  // Select headlines for prompt
  const selectedHeadlines = uniqueHeadlines.slice(0, headlinesInPrompt);

  // Enrich articles with full content
  console.log(`[Content Source] 📰 Fetching full article content for ${selectedHeadlines.length} headlines...`);
  const enrichedArticles = await enrichArticles(selectedHeadlines, 3);

  const successfulArticles = enrichedArticles.filter(a => 
    a.fullText && a.fullText.length > 100
  );

  if (successfulArticles.length === 0) {
    console.error('[Content Source] No articles successfully enriched');
    return null;
  }

  // Build source metadata
  const sourceMetadata = successfulArticles.map((article, idx) => ({
    index: idx + 1,
    url: article.url,
    headline: article.headline
  }));

  // Create sealed JSON envelope
  const articlesJson = successfulArticles.map((article, idx) => {
    return `### ARTICLE ${idx + 1}\n${JSON.stringify({
      index: idx + 1,
      headline: article.headline,
      url: article.url,
      fullText: article.fullText,
      entities: article.entities
    }, null, 2)}\n### END ARTICLE ${idx + 1}`;
  }).join('\n\n');

  return {
    articles: successfulArticles,
    sourceMetadata,
    articlesJson,
    headlinesInPrompt: successfulArticles.length,
    recentContent: [],
    usedSourceUrls: []
  };
}

/**
 * Fetches structured context data for a given persona
 * Falls back to dynamic handler if persona not found in DB
 */
async function getStructuredContext(
  persona: string,
  topic: string,
  accountId?: string,
  personaKey?: string
): Promise<PersonaContext | null> {
  console.log(`[Content Source] 🎯 Fetching context for persona: ${persona}`);

  const effectivePersonaKey = personaKey || persona;
  
  // Try dynamic handler first - works for any persona with RSS sources in DB
  const dynamicContext = await buildDynamicContext(effectivePersonaKey, accountId);
  if (dynamicContext) {
    return dynamicContext;
  }

  // Fallback: Legacy hardcoded handlers for backward compatibility
  // TODO: Migrate all personas to DB config
  console.log(`[Content Source] ⚠️ Falling back to legacy handler for: ${persona}`);
  return null;
}

/**
 * Main entry point: Fetches context and formats it into a string for prompts
 */
export async function getDynamicContext(
  persona: string,
  topic: string,
  accountId?: string,
  personaKey?: string
): Promise<string> {
  const structuredContext = await getStructuredContext(persona, topic, accountId, personaKey);

  if (!structuredContext) {
    console.log(`[Content Source] ⚠️ No context available for persona: ${persona}`);
    return '';
  }

  const formatted = formatPersonaContext(persona, structuredContext);
  console.log(`[Content Source] ✅ Formatted context for ${persona} (${formatted.length} chars)`);
  return formatted;
}

// Re-export types for convenience
export type {
  HeadlineWithSource,
  EnrichedArticle,
  SourceMetadata,
  PersonaContext
} from './types';
