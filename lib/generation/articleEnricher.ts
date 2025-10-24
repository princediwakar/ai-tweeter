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
  keyMetrics?: string; // Extracted metric-heavy paragraphs
  entities: string[]; // Company/person names mentioned
  cached?: boolean; // Flag for cached results
}

interface ExtractEntitiesOptions {
	ignoreWords?: Set<string>;
	minLength?: number;
}

/**
 * --- NEW (V5 FIX) ---
 * Cleans raw text from Readability to remove common junk/boilerplate
 * that confuses the AI (e.g., newsletter popups, privacy policies).
 */
function cleanArticleText(text: string): string {
  if (!text) return '';
  
  const paragraphs = text.split(/\n\n+/);

  // Regex to match common junk patterns, case-insensitive
  const junkPattern = /^(subscribe|newsletter|privacy|cookie|related|follow us|also read|log in|sign up|advertisement|share this|terms of use|all rights reserved)/i;
  // Regex to match bylines or metadata lines
  const metaPattern = /^(By |Updated: |Published: |Read more: |Edited by:)/i;

  const cleanedParagraphs = paragraphs.filter(p => {
    const trimmed = p.trim();
    if (trimmed.length === 0) return false;

    // 1. Check for specific junk patterns
    if (junkPattern.test(trimmed) || metaPattern.test(trimmed)) {
      return false;
    }

    // 2. Check for "list-like" junk (e.g., "Related Links" section)
    if (trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      return false;
    }

    // 3. Check for short, "floating" lines that aren't full sentences
    // (e.g., "Advertisement" or "Source: Inc42")
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 5 && !/[.!?]$/.test(trimmed)) {
      return false;
    }
    
    return true;
  });

  // Re-join, normalize whitespace, and trim
  return cleanedParagraphs.join('\n\n').replace(/\s+\n/g, '\n').trim();
}


/**
 * Extracts the most data-heavy paragraphs from the article text to focus the AI's analysis.
 */
function extractKeyMetrics(fullText: string): string {
  const paragraphs = fullText.split(/\n\n+/);
  const metricParagraphs = paragraphs.filter(p => {
    const hasNumbers = /\d+[,.]?\d*/.test(p);
    const hasMetrics =
      p.includes('%') ||
      /\b(Rs|₹|$|crore|Cr|lakh|million|billion|mn|bn)\b/i.test(p) ||
      /\b(growth|revenue|profit|funding|valuation|GMV|YTD|YoY|QoQ)\b/i.test(p);
    return hasNumbers && hasMetrics && p.length > 50;
  });

  // --- MODIFIED (V5 FIX) ---
  // Re-enabled the return line.
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
 * [REUSABLE UTILITY] Extracts potential entities (like company or people names) from a string.
 */
export function extractEntities(text: string, options: ExtractEntitiesOptions = {}): string[] {
	const { ignoreWords = new Set<string>(), minLength = 3 } = options;
	const entities = new Set<string>();
	const entityPattern = /\b([A-Z][a-zA-Z0-9.-]+(?:\s+[A-Z][a-zA-Z0-9.-]+)*)\b/g;

	let match;
	while ((match = entityPattern.exec(text)) !== null) {
		const entity = match[1].trim();
		if (entity.length >= minLength && !ignoreWords.has(entity)) {
			entities.add(entity.replace(/'s$/, '')); // Remove possessive 's
		}
	}
	return Array.from(entities);
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

    // --- MODIFIED (V5 FIX) ---
    // Clean the raw text from Readability *before* any other processing.
    const rawText = article.textContent;
    const fullText = cleanArticleText(rawText);
    
    // Check for paywall
    if (detectPaywall(fullText) || detectPaywall(rawText)) { // Check both raw and cleaned
      console.warn(`📰 Article appears paywalled: ${url}`);
      return baseResult;
    }
    
    // Check minimum length on *cleaned* text
    if (fullText.length < 200) {
      console.warn(`📰 Article too short after cleaning (${fullText.length} chars): ${url}`);
      return baseResult;
    }

    // Extract entities and key metrics from the *cleaned* text
    const entities = extractEntities(fullText);
    const keyMetrics = extractKeyMetrics(fullText);

    const enrichedResult: EnrichedArticle = {
      headline,
      url,
      description,
      fullText: fullText.substring(0, GENERATION_CONFIG.enrichment.fullTextLimit || 8000),
      // --- MODIFIED (V5 FIX) ---
      // Do not fallback to fullText. If keyMetrics is empty, it should be empty.
      keyMetrics: keyMetrics,
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