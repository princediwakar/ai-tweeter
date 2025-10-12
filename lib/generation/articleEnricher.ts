// lib/generation/articleEnricher.ts
// Fetches full article content and extracts entities, handles, and websites.
// Implements a two-step process:
// 1. Primary Extraction: Gathers data directly from the news article page.
// 2. Secondary Enrichment: Visits websites found in the article to discover official social media handles.

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

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
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
  let match;
  while ((match = domainPattern.exec(text)) !== null) {
    const domain = match[1].toLowerCase();
    // Filter out common social media domains which are not company websites
    if (!['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com'].some(social => domain.includes(social))) {
      websites.add(domain);
    }
  }
  return Array.from(websites).slice(0, 5); // Limit to 5 to avoid excessive fetching
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
  return Array.from(entities).slice(0, 10); // Limit to top 10 entities
}

/**
 * Fetches the homepage for a given domain and extracts Twitter handles from it.
 * This is a key part of the secondary enrichment process.
 * @param domain The domain name (e.g., "google.com")
 * @returns A promise that resolves to an array of Twitter handles found on the homepage.
 */
async function fetchHandlesFromHomepage(domain: string): Promise<string[]> {
  try {
    const url = `https://${domain}`;
    console.log(`🔎 Visiting homepage to find handles: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      signal: AbortSignal.timeout(5000), // Shorter 5-second timeout for this secondary fetch
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
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`📰 Failed to fetch article (${response.status}): ${url}`);
      return baseResult;
    }

    const html = await response.text();
    const initialHandles = extractTwitterHandles(html);
    console.log(`📰 Found ${initialHandles.length} handles directly in article HTML (likely publisher's).`);

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.warn(`📰 Could not extract readable text from article: ${url}`);
      return { ...baseResult, twitterHandles: initialHandles };
    }

    const fullText = article.textContent;
    const websites = extractWebsites(fullText);
    const entities = extractEntities(fullText);
    const allHandles = new Set<string>(initialHandles);

    // --- Step 2: Secondary Enrichment (from discovered websites) ---
    if (websites.length > 0) {
      console.log(`📰 Found ${websites.length} websites in text. Checking homepages for more handles...`);
      const homepageHandlePromises = websites.map(site => fetchHandlesFromHomepage(site));
      const homepageHandleResults = await Promise.all(homepageHandlePromises);

      homepageHandleResults.forEach(handles => {
        handles.forEach(handle => allHandles.add(handle));
      });
    }

    const finalTwitterHandles = Array.from(allHandles);
    console.log(`📰 Article enriched: ${finalTwitterHandles.length} total handles, ${websites.length} websites, ${entities.length} entities.`);

    // --- Step 3: Final Consolidation ---
    return {
      headline,
      url,
      description,
      fullText: fullText.substring(0, 2000), // Limit text length for storage/performance
      twitterHandles: finalTwitterHandles,
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
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between batches
    }
  }
  return results;
}