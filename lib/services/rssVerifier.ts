// lib/services/rssVerifier.ts
/**
 * RSS Auto-Verification Service
 * Finds and verifies RSS feeds for given topics/niches
 */

import { fetchFromRssFeeds } from '@/lib/contentSource/fetchers';

interface RssVerificationResult {
  url: string;
  isValid: boolean;
  headlinesFetched: number;
  error?: string;
}

interface TopicSuggestion {
  topic: string;
  suggestedRssUrls: string[];
  confidence: number;
}

/**
 * Verify a single RSS URL - try to fetch headlines
 */
export async function verifyRssUrl(url: string): Promise<RssVerificationResult> {
  try {
    const headlines = await fetchFromRssFeeds([url], 2, 5);
    return {
      url,
      isValid: headlines.length > 0,
      headlinesFetched: headlines.length,
    };
  } catch (error) {
    return {
      url,
      isValid: false,
      headlinesFetched: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify multiple RSS URLs in parallel
 */
export async function verifyRssUrls(urls: string[]): Promise<RssVerificationResult[]> {
  const results = await Promise.all(urls.map(url => verifyRssUrl(url)));
  return results;
}

/**
 * Common RSS feed sources by topic/niche
 * AI can use these as suggestions when designing personas
 */
const COMMON_RSS_SOURCES: Record<string, string[]> = {
  tech: [
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://wired.com/feed/rss',
    'https://arstechnica.com/feed/',
  ],
  startups: [
    'https://inc42.com/feed/',
    'https://yourstory.com/feed/',
    'https://www.startupstories.in/feed/',
    'https://pitchbook.com/articles/rss',
  ],
  finance: [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
  ],
  ai: [
    'https://venturebeat.com/feed/',
    'https://www.technologyreview.com/feed/',
    'https://www.wired.com/tag/ai/rss',
  ],
  business: [
    'https://www.business-standard.com/rss/homepage.xml',
    'https://www.moneycontrol.com/rss/mc_topstories.xml',
  ],
  science: [
    'https://www.sciencedaily.com/rss/all.xml',
    'https://www.nature.com/nature.rss',
  ],
  productivity: [
    'https://zenhabits.net/feed/',
    'https://forge.medium.com/feed',
  ],
};

/**
 * Suggest RSS sources for a topic/niche based on persona description
 */
export function suggestRssSources(personaDescription: string): string[] {
  const desc = personaDescription.toLowerCase();
  const suggestions: string[] = [];
  
  // Match keywords to known RSS sources
  if (desc.includes('tech') || desc.includes('technology')) {
    suggestions.push(...COMMON_RSS_SOURCES.tech);
  }
  if (desc.includes('startup') || desc.includes('founder') || desc.includes('entrepreneur')) {
    suggestions.push(...COMMON_RSS_SOURCES.startups);
  }
  if (desc.includes('finance') || desc.includes('invest') || desc.includes('stock') || desc.includes('market')) {
    suggestions.push(...COMMON_RSS_SOURCES.finance);
  }
  if (desc.includes('ai') || desc.includes('artificial intelligence') || desc.includes('machine learning')) {
    suggestions.push(...COMMON_RSS_SOURCES.ai);
  }
  if (desc.includes('business') || desc.includes('company')) {
    suggestions.push(...COMMON_RSS_SOURCES.business);
  }
  if (desc.includes('science') || desc.includes('research')) {
    suggestions.push(...COMMON_RSS_SOURCES.science);
  }
  if (desc.includes('productivity') || desc.includes('habit') || desc.includes('self-improvement')) {
    suggestions.push(...COMMON_RSS_SOURCES.productivity);
  }
  
  // Remove duplicates
  return [...new Set(suggestions)];
}

/**
 * Auto-discover RSS from a website URL
 * Tries common feed patterns
 */
export async function discoverRssFromWebsite(websiteUrl: string): Promise<string[]> {
  const possibleFeeds = [
    websiteUrl.replace(/\/$/, '') + '/feed',
    websiteUrl.replace(/\/$/, '') + '/rss',
    websiteUrl.replace(/\/$/, '') + '/atom.xml',
    websiteUrl.replace(/\/$/, '') + '/feed.xml',
  ];
  
  const validFeeds: string[] = [];
  
  for (const feedUrl of possibleFeeds) {
    try {
      const headlines = await fetchFromRssFeeds([feedUrl], 1, 2);
      if (headlines.length > 0) {
        validFeeds.push(feedUrl);
      }
    } catch {
      // Try next URL
    }
  }
  
  return validFeeds;
}

/**
 * Full auto-verification: take AI-suggested URLs, verify them, return valid ones
 */
export async function autoVerifyAndFilterRss(urls: string[]): Promise<{
  valid: string[];
  invalid: { url: string; error: string }[];
}> {
  const results = await verifyRssUrls(urls);
  
  const valid = results.filter(r => r.isValid).map(r => r.url);
  const invalid = results
    .filter(r => !r.isValid)
    .map(r => ({ url: r.url, error: r.error || 'Failed to fetch headlines' }));
  
  return { valid, invalid };
}