// lib/generation/articleEnricher.ts

import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { GENERATION_CONFIG } from './config';

// Create a virtual console to suppress CSS parsing warnings
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', () => {
  // Suppress errors silently
});

export interface EnrichedArticle {
  headline: string;
  url: string;
  description?: string;
  fullText?: string; // Article body text
  twitterHandles: string[]; // Extracted @handles from article AND entity websites
  websites: string[]; // Company websites mentioned
  entities: string[]; // Company/person names mentioned
}

/**
 * Extracts Twitter/X handles from a given string of HTML content.
 * Looks for both direct links and text mentions like "@handle".
 * @param html The HTML content to scan.
 * @returns An array of unique, lowercase Twitter handles.
 */
function extractTwitterHandles(html: string): string[] {
  const handles = new Set<string>();

  // Pattern 1: Links to twitter.com or x.com in href attributes
  const linkPattern = /href=["']https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)["']/g;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const handle = match[1];
    // Filter out generic twitter links like /share or /intent
    if (handle && handle !== 'intent' && handle !== 'share') {
      handles.add(handle.toLowerCase());
    }
  }

  // Pattern 2: Text mentions like "@ZypeApp"
  const textPattern = /@([a-zA-Z0-9_]{1,15})\b/g;
  while ((match = textPattern.exec(html)) !== null) {
    handles.add(match[1].toLowerCase());
  }

  return Array.from(handles);
}

/**
 * Extracts website domain names mentioned in a block of text.
 * @param text The text content of the article.
 * @returns An array of unique domain names.
 */
function extractWebsites(text: string): string[] {
  const websites = new Set<string>();

  // Common valid TLDs - whitelist approach to avoid matching sentence fragments
  const validTLDs = /\.(com|org|net|io|ai|co|in|uk|us|tech|app|dev|xyz|info|biz|me|gg|fm|tv|live|online|site|website|store|blog|news|media|digital|cloud|ventures|capital|fund)(?:\b|\/)/i;

  // More restrictive pattern that requires proper URL context or common domain patterns
  const domainPattern = /(?:https?:\/\/|www\.)([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+)/gi;
  let match;

  while ((match = domainPattern.exec(text)) !== null) {
    const domain = match[1].toLowerCase();

    // Validate the domain has a recognized TLD
    if (!validTLDs.test(domain)) continue;

    // Filter out social media domains and obvious false positives
    const excludePatterns = [
      'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com',
      'youtube.com', 'google.com', 'github.com'
    ];

    if (excludePatterns.some(pattern => domain.includes(pattern))) continue;

    // Extract just the main domain (remove any path components)
    const cleanDomain = domain.split('/')[0];
    websites.add(cleanDomain);
  }

  return Array.from(websites).slice(0, GENERATION_CONFIG.enrichment.maxWebsites);
}

/**
 * Extracts entity names (companies, people) from text using capitalization patterns.
 * @param text The text content of the article.
 * @returns An array of potential entity names.
 */
function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:'s)?)\b/g;
  let match;
  while ((match = entityPattern.exec(text)) !== null) {
    const entity = match[1];
    // Filter out common words that start sentences but aren't entities
    if (entity.length > 2 && !['The', 'A', 'An', 'This', 'That'].includes(entity)) {
      entities.add(entity.replace(/'s$/, '')); // Remove possessive 's
    }
  }
  return Array.from(entities).slice(0, GENERATION_CONFIG.enrichment.maxEntities);
}

/**
 * Fetches the homepage for a given domain and extracts Twitter handles from it.
 * This is a key part of the secondary enrichment process.
 * @param domain The domain name (e.g., "google.com")
 * @returns A promise that resolves to an array of Twitter handles found on the homepage.
 * NOTE: Currently disabled as Twitter handle extraction is turned off
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchHandlesFromHomepage(domain: string): Promise<string[]> {
  try {
    const url = `https://${domain}`;
    console.log(`🔎 Visiting homepage to find handles: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      signal: AbortSignal.timeout(GENERATION_CONFIG.enrichment.homepageFetchTimeout),
    });
    if (!response.ok) return [];
    const html = await response.text();
    return extractTwitterHandles(html);
  } catch (error) {
    console.warn(`🔎 Failed to fetch or parse homepage ${domain}:`, error instanceof Error ? error.message : 'unknown error');
    return [];
  }
}

/**
 * Fetches and enriches a single article by extracting metadata and performing secondary lookups.
 */
export async function enrichArticle(
  headline: string,
  url: string,
  description?: string
): Promise<EnrichedArticle> {
  const baseResult: EnrichedArticle = { headline, url, description, twitterHandles: [], websites: [], entities: [] };

  try {
    // --- Step 1: Primary Enrichment (from the article page) ---
    console.log(`📰 Fetching full article: ${url.substring(0, 60)}...`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(GENERATION_CONFIG.enrichment.articleFetchTimeout),
    });

    if (!response.ok) {
      console.warn(`📰 Failed to fetch article (${response.status}): ${url}`);
      return baseResult;
    }

    const html = await response.text();
    // Twitter handle extraction disabled - keeping functions for potential future use
    // const initialHandles = extractTwitterHandles(html);

    const dom = new JSDOM(html, { url, virtualConsole });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn(`📰 Could not extract readable text from article: ${url}`);
      return baseResult;
    }

    const fullText = article.textContent;
    const websites = extractWebsites(fullText);
    const entities = extractEntities(fullText);

    // Twitter handle extraction disabled
    // Secondary enrichment step (website homepage scanning) also disabled

    console.log(`📰 Article enriched: ${websites.length} websites, ${entities.length} entities.`);

    // --- Step 2: Final Consolidation ---
    return {
      headline,
      url,
      description,
      fullText: fullText.substring(0, GENERATION_CONFIG.enrichment.fullTextLimit),
      twitterHandles: [], // Disabled
      websites,
      entities,
    };

  } catch (error) {
    console.warn(`📰 Article enrichment failed for ${url}:`, error instanceof Error ? error.message : 'unknown error');
    return baseResult;
  }
}

/**
 * Batch enriches multiple articles with rate limiting to avoid overwhelming servers.
 */
export async function enrichArticles(
  articles: Array<{ headline: string; url: string; description?: string }>,
  maxConcurrent: number = 3
): Promise<EnrichedArticle[]> {
  const results: EnrichedArticle[] = [];
  for (let i = 0; i < articles.length; i += maxConcurrent) {
    const batch = articles.slice(i, i + maxConcurrent);
    console.log(`\n🔄 Processing batch ${i / maxConcurrent + 1} of ${Math.ceil(articles.length / maxConcurrent)}...`);
    const batchResults = await Promise.allSettled(
      batch.map(article => enrichArticle(article.headline, article.url, article.description))
    );

    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    if (i + maxConcurrent < articles.length) {
      await new Promise(resolve => setTimeout(resolve, GENERATION_CONFIG.enrichment.batchDelay));
    }
  }
  return results;
}