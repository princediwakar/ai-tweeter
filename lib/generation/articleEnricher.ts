// lib/generation/articleEnricher.ts
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { GENERATION_CONFIG } from './config';

// Create a virtual console to suppress CSS parsing warnings
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', () => {
  // Suppress errors silently
});

// Simple in-memory cache for article content
const articleCache = new Map<string, EnrichedArticle>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export interface EnrichedArticle {
  headline: string;
  url: string;
  description?: string;
  fullText?: string; // Article body text
  keyMetrics?: string; // NEW: Extracted metric-heavy paragraphs
  entities: string[]; // Company/person names mentioned
  cached?: boolean; // NEW: Flag for cached results
}

/**
 * Extracts paragraphs that contain metrics/numbers
 */
function extractKeyMetrics(fullText: string): string {
  const paragraphs = fullText.split(/\n\n+/);
  
  const metricParagraphs = paragraphs.filter(p => {
    // Must have numbers
    const hasNumbers = /\d+[,.]?\d*/.test(p);
    
    // Prefer paragraphs with growth indicators or currency
    const hasMetrics = 
      p.includes('%') || 
      p.includes('Cr') || 
      p.includes('crore') ||
      p.includes('million') || 
      p.includes('billion') ||
      p.includes('growth') ||
      p.includes('revenue') ||
      p.includes('profit') ||
      /YoY|QoQ|MoM/i.test(p);
    
    return hasNumbers && hasMetrics && p.length > 50;
  });
  
  // Return top 3 metric-heavy paragraphs
  return metricParagraphs.slice(0, 3).join('\n\n');
}

/**
 * Detects if article is behind paywall
 */
function detectPaywall(text: string): boolean {
  const paywallIndicators = [
    'subscribe to read',
    'premium members only',
    'sign in to continue',
    'this article is for subscribers',
    'become a member to',
    'subscription required',
    'exclusive to subscribers',
    'register to read'
  ];
  
  const lowerText = text.toLowerCase();
  return paywallIndicators.some(indicator => lowerText.includes(indicator));
}

/**
 * Extracts entity names (companies, people) from text using capitalization patterns.
 */
function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:'s)?)\b/g;
  let match;
  
  while ((match = entityPattern.exec(text)) !== null) {
    const entity = match[1];
    // Filter out common words that start sentences but aren't entities
    const commonWords = ['The', 'A', 'An', 'This', 'That', 'These', 'Those', 'When', 'Where', 'Why', 'How'];
    if (entity.length > 2 && !commonWords.includes(entity)) {
      entities.add(entity.replace(/'s$/, '')); // Remove possessive 's
    }
  }
  
  return Array.from(entities).slice(0, GENERATION_CONFIG.enrichment.maxEntities);
}

/**
 * Fetches and enriches a single article by extracting metadata
 */
export async function enrichArticle(
  headline: string,
  url: string,
  description?: string
): Promise<EnrichedArticle> {
  const baseResult: EnrichedArticle = { 
    headline, 
    url, 
    description, 
    entities: [] 
  };

  // Check cache first
  const cached = articleCache.get(url);
  if (cached) {
    console.log(`📰 [Cache Hit] ${url.substring(0, 60)}...`);
    return { ...cached, cached: true };
  }

  try {
    console.log(`📰 Fetching: ${url.substring(0, 60)}...`);
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(GENERATION_CONFIG.fetching.articlePageTimeout || 12000),
    });

    if (!response.ok) {
      console.warn(`📰 Failed to fetch (${response.status}): ${url}`);
      return baseResult;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url, virtualConsole });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn(`📰 Could not extract readable text: ${url}`);
      return baseResult;
    }

    const fullText = article.textContent;
    
    // Check for paywall
    if (detectPaywall(fullText)) {
      console.warn(`📰 Article appears paywalled: ${url}`);
      return baseResult;
    }
    
    // Check minimum length
    if (fullText.length < 200) {
      console.warn(`📰 Article too short (${fullText.length} chars): ${url}`);
      return baseResult;
    }

    // Extract entities and key metrics
    const entities = extractEntities(fullText);
    const keyMetrics = extractKeyMetrics(fullText);

    const enrichedResult: EnrichedArticle = {
      headline,
      url,
      description,
      fullText: fullText.substring(0, GENERATION_CONFIG.enrichment.fullTextLimit || 8000),
      keyMetrics: keyMetrics || fullText.substring(0, 1000), // Fallback to first 1000 chars
      entities,
    };

    // Cache the result
    articleCache.set(url, enrichedResult);
    
    // Clear old cache entries after 1 hour
    setTimeout(() => articleCache.delete(url), CACHE_TTL);

    console.log(`📰 ✅ Enriched: ${entities.length} entities, ${keyMetrics.length} chars of metrics`);
    return enrichedResult;

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn(`📰 Timeout fetching article: ${url}`);
    } else {
      console.warn(`📰 Enrichment failed: ${url}`, error instanceof Error ? error.message : 'unknown');
    }
    return baseResult;
  }
}

/**
 * Batch enriches multiple articles with rate limiting
 */
export async function enrichArticles(
  articles: Array<{ headline: string; url: string; description?: string }>,
  maxConcurrent: number = 3
): Promise<EnrichedArticle[]> {
  const results: EnrichedArticle[] = [];
  const batches = Math.ceil(articles.length / maxConcurrent);
  
  console.log(`\n🔄 Enriching ${articles.length} articles in ${batches} batches...`);
  
  for (let i = 0; i < articles.length; i += maxConcurrent) {
    const batch = articles.slice(i, i + maxConcurrent);
    const batchNum = Math.floor(i / maxConcurrent) + 1;
    
    console.log(`\n📦 Batch ${batchNum}/${batches}...`);
    
    const batchResults = await Promise.allSettled(
      batch.map(article => enrichArticle(article.headline, article.url, article.description))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`📰 Failed to enrich article ${i + idx + 1}: ${result.reason}`);
      }
    });

    // Add delay between batches (except for last batch)
    if (i + maxConcurrent < articles.length) {
      const delay = GENERATION_CONFIG.enrichment.batchDelay || 1000;
      console.log(`⏳ Waiting ${delay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  const successful = results.filter(r => r.fullText && r.fullText.length > 200);
  console.log(`\n✅ Successfully enriched ${successful.length}/${articles.length} articles`);
  
  return results;
}

/**
 * Clear the article cache (useful for testing)
 */
export function clearArticleCache(): void {
  articleCache.clear();
  console.log('🗑️ Article cache cleared');
}