// lib/contentSources.ts
import { parseStringPromise } from 'xml2js';
// import fs from 'fs/promises';
// import path from 'path';
// Assuming the PersonaTopic interface is available via an import path like this:
import type { PersonaTopic } from './personas';
import { enrichArticles } from './generation/articleEnricher';

// Use native fetch
const fetchFn = globalThis.fetch;


interface CacheEntry {
  context: string;
  timestamp: number;
}


interface RssItem {
  title?: string[];
  description?: string[];
  link?: string[];
}

interface HeadlineWithSource {
  headline: string;
  url: string;
  description: string | undefined; // Required property that can be undefined
}


// ─────────────────────────────────────────────
// 🔧 Constants & Helpers
// ─────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins for fast-moving trends
const contentCache: Map<string, CacheEntry> = new Map();

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// NEW: Helper function to clean RSS descriptions of HTML tags and extra whitespace
function cleanDescription(text: string | undefined): string | undefined {
  if (!text) return undefined;
  // Strip HTML tags, decode common HTML entities, and trim whitespace
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .trim();
}

// ─────────────────────────────────────────────
// 📦 Cache Logic
// ─────────────────────────────────────────────
function getCachedContext(key: string): string | null {
  const cached = contentCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Content Source] 📦 Using cached context for: "${key}"`);
    return cached.context;
  }
  return null;
}

function setCachedContext(key: string, context: string): void {
  contentCache.set(key, { context, timestamp: Date.now() });
  console.log(`[Content Source] 💾 Cached new context for: "${key}"`);
}


// ─────────────────────────────────────────────
// 📡 Fetching Logic
// ─────────────────────────────────────────────
function selectRandomSources<T>(items: T[], count: number): T[] {
  return [...items].sort(() => 0.5 - Math.random()).slice(0, count);
}

async function fetchFromGoogle(query: string): Promise<HeadlineWithSource[]> {
  const userAgent = getRandomUserAgent();
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)} when:1d&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await fetchFn(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(`Google News responded with status: ${response.status}`);

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);
    const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 5) ?? [];

    return items
      .map((item) => {
        const title = item.title?.[0];
        const link = item.link?.[0];
        const description = cleanDescription(item.description?.[0]);
        return title && link ? { headline: title, url: link, description } : null;
      })
      .filter((item): item is HeadlineWithSource => item !== null);
  } catch (error) {
    console.warn(`[Content Source] ⚠️ Failed to fetch from Google News for query "${query}":`, error);
    return [];
  }
}

async function fetchFromIndianNewsRSS(): Promise<HeadlineWithSource[]> {
  const userAgent = getRandomUserAgent();
  const rssFeeds = [
    'https://indianstartupnews.com/rss',
    'https://entrackr.com/rss',
    'https://inc42.com/feed',
    'https://economictimes.indiatimes.com/prime/technology-and-startups/rssfeeds/63319172.cms',
    'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms'
  ];

  // Fetch from all feeds in parallel for better performance
  const fetchPromises = rssFeeds.map(async (feed) => {
    try {
      const response = await fetchFn(feed, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) return [];

      const xml = await response.text();
      const parsed = await parseStringPromise(xml);
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item ?? [];

      // Take 2 headlines from each feed to ensure diversity
      const headlines: HeadlineWithSource[] = [];
      for (let i = 0; i < Math.min(2, items.length); i++) {
        const item = items[i];
        const title = item.title?.[0];
        const link = item.link?.[0];
        const description = cleanDescription(item.description?.[0]);
        if (title && link) {
          headlines.push({ headline: title, url: link, description });
        }
      }

      return headlines;
    } catch {
      console.warn(`[Content Source] ⚠️ Failed to fetch from Business RSS feed: ${feed}`);
      return [];
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  const allHeadlines: HeadlineWithSource[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allHeadlines.push(...result.value);
    }
  });

  console.log(`[Content Source] 📰 Fetched ${allHeadlines.length} headlines from ${rssFeeds.length} RSS feeds (2 per feed)`);

  // Shuffle for variety and return all headlines (up to 10)
  return allHeadlines.sort(() => 0.5 - Math.random()).slice(0, 10);
}

async function fetchFromCricketNewsRSS(): Promise<HeadlineWithSource[]> {
  const userAgent = getRandomUserAgent();
  const rssFeeds = [ 'https://www.espncricinfo.com/rss/content/story/feeds/6.xml', 'https://www.thehindu.com/sport/cricket/feeder/default.rss', 'https://sports.ndtv.com/rss/cricket' ];
  const results: HeadlineWithSource[] = [];

  for (const feed of rssFeeds) {
    try {
      const response = await fetchFn(feed, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(4000) });
      if (!response.ok) continue;

      const xml = await response.text();
      const parsed = await parseStringPromise(xml);
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 4) ?? [];

      items.forEach((item) => {
        const title = item.title?.[0];
        const link = item.link?.[0];
        const description = cleanDescription(item.description?.[0]);
        if (title && link) {
          results.push({ headline: title, url: link, description });
        }
      });
    } catch {
      console.warn(`[Content Source] ⚠️ Failed to fetch from Cricket RSS feed: ${feed}`);
    }
  }
  return results.sort(() => 0.5 - Math.random()).slice(0, 10);
}


function getTopicString(topic: PersonaTopic | string | undefined): string | undefined {
  if (!topic) return undefined;
  return typeof topic === 'string' ? topic : topic.displayName;
}

function generateRealNewsQueries(persona: string, topic: PersonaTopic | string | undefined): string[] {
  const topicStr = getTopicString(topic);

  if (persona === 'business_storyteller') {
    const businessQueries = ['Indian startup founder success story', 'Indian unicorn company IPO news', 'Indian entrepreneur global expansion', 'Indian technology breakthrough latest'];
    return topicStr ? [topicStr] : selectRandomSources(businessQueries, 2);
  }

  if (persona === 'cricket_storyteller') {
    const cricketQueries = ['Indian cricket team selection news', 'IPL controversy OR development today', 'Indian cricket personalities latest news', 'BCCI cricket policy decisions'];
    return topicStr ? [topicStr] : selectRandomSources(cricketQueries, 2);
  }

  if (persona === 'english_vocab_builder') {
    const vocabQueries = ['English vocabulary learning tips', 'new words English language today', 'competitive exam vocabulary words', 'academic writing vocabulary'];
    return topicStr ? [topicStr] : selectRandomSources(vocabQueries, 2);
  }

  return topicStr ? [topicStr] : [];
}

// ─────────────────────────────────────────────
// 🛠️ Common Utilities
// ─────────────────────────────────────────────
function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

function collectEnrichmentContext(settledResults: PromiseSettledResult<HeadlineWithSource[]>[]): string[] {
  const enrichmentContext: string[] = [];
  settledResults.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      res.value.forEach(item => {
        enrichmentContext.push(`${item.headline}${item.description ? ` -- ${item.description}` : ''}`);
      });
    }
  });
  return enrichmentContext;
}

async function handleContextError(persona: string, error: unknown, fallbackMessage: string): Promise<string> {
  console.error(`[Content Source] ❌ Context failure for ${persona}:`, error);
  return fallbackMessage;
}

// ─────────────────────────────────────────────
// 📋 Persona Context Handlers
// ─────────────────────────────────────────────
type PersonaContextHandler = (topic: PersonaTopic | string) => Promise<string>;

async function getBusinessStorytellerContext(): Promise<string> {
  console.log('[Content Source] 🧠 Activating Indian-First Deep Dive mode for Business Storyteller...');
  const cacheKey = `business_storyteller_deep_dive_${getTodayDateKey()}`;
  const cached = getCachedContext(cacheKey);
  if (cached) return cached;

  try {
    const primaryHeadlines = await fetchFromIndianNewsRSS();
    if (!primaryHeadlines || primaryHeadlines.length === 0) {
      return "No recent top stories found from dedicated Indian business sources. Generate a compelling story on a timeless Indian business theme, like the rise of D2C brands or the challenges in family business succession.";
    }

    const mainStory = primaryHeadlines[0];
    const mainEntity = (mainStory.headline.match(/\b[A-Z][a-zA-Z]+\b/g) || ['Indian Startups'])[0];

    const enrichmentPromises = [
      fetchFromGoogle(`${mainEntity} competitors analysis India`),
      fetchFromGoogle(`${mainEntity} business model explained`),
    ];
    const settledResults = await Promise.allSettled(enrichmentPromises);
    const enrichmentContext = collectEnrichmentContext(settledResults);

    const finalContext = `
DEEP DIVE BRIEFING (Source: Indian Business News)
-------------------------------------------------

**Primary News Item:**
- Title: ${mainStory.headline}
${mainStory.description ? `- Summary: ${mainStory.description}` : ''}
- Source URL (for context): ${mainStory.url}

**Key Entity:** ${mainEntity}

**Supporting Intelligence & Analyst Angles (for context):**
${enrichmentContext.length > 0 ? enrichmentContext.slice(0, 4).map(c => `- ${c}`).join('\n') : "- No additional context found."}

**Your Mission:**
Use this briefing to construct a deep, insightful story. The Primary News Item is the core truth. Use the supporting intelligence to connect the dots, analyze competition, and reveal hidden challenges. Your analysis must be sharp and confident.
`;
    setCachedContext(cacheKey, finalContext);
    return finalContext;
  } catch (error) {
    return handleContextError('business_storyteller', error, "Could not fetch latest news due to a system error. Using general knowledge.");
  }
}

async function getCricketStorytellerContext(): Promise<string> {
  console.log('[Content Source] 🏏 Activating Cricket Deep Dive mode...');
  const cacheKey = `cricket_storyteller_deep_dive_${getTodayDateKey()}`;
  const cached = getCachedContext(cacheKey);
  if (cached) return cached;

  try {
    const primaryHeadlines = await fetchFromCricketNewsRSS();
    if (!primaryHeadlines || primaryHeadlines.length === 0) {
      return "No recent top stories found from dedicated cricket sources. Generate a compelling story on a timeless cricket theme, like the pressure of a debut or a classic rivalry.";
    }

    const mainStory = primaryHeadlines[0];
    const keyPlayer = (mainStory.headline.match(/\b[A-Z][a-z]{3,}\b/g) || ['a key player'])[0];

    const enrichmentPromises = [
      fetchFromGoogle(`"${mainStory.headline}" match turning point`),
      fetchFromGoogle(`${keyPlayer} performance stats in match`),
    ];
    const settledResults = await Promise.allSettled(enrichmentPromises);
    const enrichmentContext = collectEnrichmentContext(settledResults);

    const finalContext = `
CRICKET DEEP DIVE BRIEFING
---------------------------

**Primary Cricket Event:**
- Title: ${mainStory.headline}
${mainStory.description ? `- Summary: ${mainStory.description}` : ''}
- Source URL (for context): ${mainStory.url}

**Key Player/Entity:** ${keyPlayer}

**Supporting Angles & Tactical Context:**
${enrichmentContext.length > 0 ? enrichmentContext.slice(0, 4).map(c => `- ${c}`).join('\n') : "- No additional context found."}

**Your Mission:**
Use this briefing to deconstruct the story behind the scoreboard. The Primary Event is your focus. Use the supporting context to analyze the key player's performance, the tactical turning points, and the psychological drama of the match.
`;
    setCachedContext(cacheKey, finalContext);
    return finalContext;
  } catch (error) {
    return handleContextError('cricket_storyteller', error, "Could not fetch latest cricket news due to a system error. Using general knowledge.");
  }
}

async function getSatiristContext(): Promise<string> {
  console.log('[Content Source] 🧐 Satirist selected. Activating Deep Dive with full article fetching...');
  // NOTE: Caching disabled for satirist to ensure maximum variety in headline selection
  // Each generation gets freshly shuffled headlines for better content diversity

  try {
    const primaryHeadlines = await fetchFromIndianNewsRSS();
    if (primaryHeadlines.length === 0) {
      return 'No trending news found. Generate a general witty observation about the current state of affairs in India.';
    }

    // Get unique headlines and shuffle for variety
    const uniqueHeadlines = Array.from(new Map(primaryHeadlines.map((item) => [item.headline, item])).values());
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines. Shuffling for variety...`);
    uniqueHeadlines.sort(() => 0.5 - Math.random());

    // Take top 5 headlines for enrichment
    const selectedHeadlines = uniqueHeadlines.slice(0, 5);

    // Fetch full article content with entity extraction
    console.log(`[Content Source] 📰 Fetching full article content for ${selectedHeadlines.length} headlines...`);
    const enrichedArticles = await enrichArticles(selectedHeadlines, 3); // Process 3 at a time

    // Shuffle articles again before formatting for maximum variety
    enrichedArticles.sort(() => 0.5 - Math.random());

    // Format the enriched context with article data
    const formattedHeadlines = enrichedArticles.map((article, idx) => {
      let formatted = `${idx + 1}. ${article.headline}`;

      if (article.description) {
        formatted += `\n   Summary: ${article.description}`;
      }

      if (article.fullText) {
        // Include first 500 chars of article for richer context
        const preview = article.fullText.trim() + '...';
        formatted += `\n   Article Excerpt: ${preview}`;
      }

      // Twitter handle formatting removed - no tagging

      if (article.websites.length > 0) {
        formatted += `\n   Related Websites: ${article.websites.join(', ')}`;
      }

      if (article.entities.length > 0) {
        formatted += `\n   Key Entities: ${article.entities.slice(0, 5).join(', ')}`;
      }

      return formatted;
    }).join('\n\n');

    const sourceMap = enrichedArticles.map((article, idx) => `[SOURCE_${idx + 1}]: ${article.url}`).join('\n');

    const finalContext = `ENRICHED NEWS BRIEFING FOR SATIRICAL ANALYSIS
-------------------------------------------

${formattedHeadlines}

Select ONE headline and provide witty, data-driven commentary.

--- SOURCE METADATA (for logging only) ---
${sourceMap}`;

    // No caching for satirist - fresh shuffled headlines each time for variety
    return finalContext;
  } catch (error) {
    return handleContextError('satirist', error, 'Could not fetch latest news due to a system error. Generate a general witty observation.');
  }
}

async function getEnglishVocabBuilderContext(topic: PersonaTopic | string): Promise<string> {
  const isPersonaTopic = typeof topic === 'object' && topic !== null && 'key' in topic;
  const topicString: string = isPersonaTopic ? (topic as PersonaTopic).displayName : (topic as string);
  const searchQueries = generateRealNewsQueries('english_vocab_builder', topic);
  const dateKey = getTodayDateKey();
  const cacheDuration = 60;
  const cacheKey = `english_vocab_builder_${topicString.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '_')}_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * cacheDuration))}`;
  console.log(`[Content Source] 🎯 Fetching real news for english_vocab_builder on topic "${topicString}"`);

  const cached = getCachedContext(cacheKey);
  if (cached) return cached;

  try {
    const fetchPromises = searchQueries.map(query => fetchFromGoogle(query));
    const results = await Promise.allSettled(fetchPromises);
    const allContent: string[] = [];

    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        const values = res.value.map(item =>
          typeof item === 'string' ? item : item.headline
        );
        allContent.push(...values);
      }
    });

    if (allContent.length === 0) {
      return "No specific recent educational content found. Generate engaging vocabulary lessons based on common English learning needs.";
    }

    const finalContext = "Recent educational content and vocabulary trends:\n" +
      allContent.slice(0, 5).map(c => `- ${c}`).join('\n') +
      "\n\nUse these as inspiration for engaging vocabulary lessons and word learning content.";

    setCachedContext(cacheKey, finalContext);
    return finalContext;
  } catch (error) {
    return handleContextError('english_vocab_builder', error, "Could not fetch latest news due to a system error. Using general knowledge.");
  }
}

// ─────────────────────────────────────────────
// 🚀 Main API with Strategy Map
// ─────────────────────────────────────────────
const personaHandlers: Record<string, PersonaContextHandler> = {
  'business_storyteller': getBusinessStorytellerContext,
  'cricket_storyteller': getCricketStorytellerContext,
  'satirist': getSatiristContext,
  'english_vocab_builder': getEnglishVocabBuilderContext,
};

export async function getDynamicContext(persona: string, topic: PersonaTopic | string): Promise<string> {
  const handler = personaHandlers[persona];

  if (!handler) {
    console.log(`[Content Source] ⚠️ No handler found for persona: ${persona}`);
    return "";
  }

  return handler(topic);
}