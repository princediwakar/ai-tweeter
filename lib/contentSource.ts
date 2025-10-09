// lib/contentSources.ts
import { parseStringPromise } from 'xml2js';
import fs from 'fs/promises';
import path from 'path';
// Assuming the PersonaTopic interface is available via an import path like this:
import type { PersonaTopic } from './personas'; 

// Use native fetch
const fetchFn = globalThis.fetch;

// ─────────────────────────────────────────────
// 🔑 Types & Interfaces
// ─────────────────────────────────────────────
interface CacheEntry {
  context: string;
  timestamp: number;
}

interface Sources {
  twitter: {
    handles: string[];
  };
  reddit: {
    subreddits: string[];
  };
}

interface RssItem {
  title?: string[];
  description?: string[];
}

interface RedditPostData {
    title: string;
    created_utc: number;
}

// ─────────────────────────────────────────────
// 🔧 Constants
// ─────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // Reduced to 5 mins for fast-moving trends
const contentCache: Map<string, CacheEntry> = new Map();

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─────────────────────────────────────────────
// 📦 Cache Logic
// ─────────────────────────────────────────────
function getCachedContext(key: string): string | null {
  const cached = contentCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[Content Source] 📦 Using cached context for: "${key}"`);
    return cached.context;
  }
  return null;
}

function setCachedContext(key: string, context: string): void {
  contentCache.set(key, { context, timestamp: Date.now(), });
  console.log(`[Content Source] 💾 Cached new context for: "${key}"`);
}

// ─────────────────────────────────────────────
// 📁 Source Loading
// ─────────────────────────────────────────────
async function loadSources(persona: string): Promise<Sources> {
  const personaToFile: Record<string, string> = {
    'satirist': 'sources-satirist.json',
    'business_storyteller': 'sources-business-storyteller.json',
    'cricket_storyteller': 'sources-cricket-storyteller.json',
    'english_vocab_builder': 'sources-english-vocab-builder.json',
  };
  const sourceFile = personaToFile[persona];

  if (!sourceFile) {
     console.warn(`[Content Source] No source file for persona: ${persona}, using default sources`);
     return { twitter: { handles: [] }, reddit: { subreddits: [] } };
  }

  try {
    const sourcePath = path.join(process.cwd(), 'lib', sourceFile);
    const data = await fs.readFile(sourcePath, 'utf8');
    console.log(`[Content Source] 📁 Loaded sources from ${sourceFile} for persona "${persona}"`);
    return JSON.parse(data);
  } catch (error) {
    console.error(`[Content Source] ❌ CRITICAL: Could not load source file ${sourceFile}.`, error);
    return { twitter: { handles: [] }, reddit: { subreddits: [] } };
  }
}

// ─────────────────────────────────────────────
// 📡 Fetching Logic
// ─────────────────────────────────────────────

function selectRandomSources<T>(items: T[], count: number): T[] {
    return [...items].sort(() => 0.5 - Math.random()).slice(0, count);
}

/**
 * Fetches general news from Google News RSS based on a query string.
 */
async function fetchFromGoogle(query: string): Promise<string[]> {
  const userAgent = getRandomUserAgent();
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)} when:1d&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await fetchFn(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`Google News responded with status: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);
    const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 5) ?? [];
    
    return items.map(item => item.title?.[0]).filter((title): title is string => !!title);

  } catch (error) {
    console.warn(`[Content Source] ⚠️ Failed to fetch from Google News for query "${query}":`, error);
    return [];
  }
}

/**
 * Fetches from dedicated Indian news RSS feeds for better coverage.
 */
async function fetchFromIndianNewsRSS(): Promise<string[]> {
  const userAgent = getRandomUserAgent();
  const rssFeeds = [
    'https://feeds.feedburner.com/NDTV-LatestNews',
    'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    'https://www.business-standard.com/rss/home_page_top_stories.rss',
  ];
  
  const results: string[] = [];
  
  for (const feed of rssFeeds) {
    try {
      const response = await fetchFn(feed, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(4000),
      });
      
      if (!response.ok) continue;
      
      const xml = await response.text();
      const parsed = await parseStringPromise(xml);
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 3) ?? [];
      
      items.forEach(item => {
        const title = item.title?.[0];
        if (title) results.push(title);
      });
      
    } catch (error) {
      console.warn(`[Content Source] ⚠️ Failed to fetch from RSS feed: ${feed}`);
    }
  }
  
  return results.slice(0, 8); // Max 8 top headlines
}

/**
 * Fetches recent posts from Twitter handles via Google News RSS.
 */
async function fetchFromTwitter(sources: Sources, topic: string): Promise<string[]> {
  const selectedHandles = selectRandomSources(sources.twitter.handles, 3);
  const userAgent = getRandomUserAgent();
  const results: string[] = [];
  
  const querySuffix = (topic.toLowerCase().includes('news') || topic.toLowerCase().includes('policy')) 
    ? '+when:1d' 
    : `"${topic}"+when:1d`;

  for (const handle of selectedHandles) {
    const cleanHandle = handle.replace('@', '');
    const query = `site:x.com/${cleanHandle}${querySuffix}`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
      const response = await fetchFn(url, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) continue;

      const xml = await response.text();
      const parsed = await parseStringPromise(xml);
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 2) ?? [];
      
      items.forEach(item => {
        const title = item.title?.[0];
        if (title) results.push(`[Twitter Post from ${handle}] ${title}`);
      });
    } catch {
      console.warn(`[Content Source] ⚠️ Failed to fetch from Twitter handle: ${handle}`);
    }
  }
  return results;
}

/**
 * Fetches hot posts from Reddit subreddits.
 */
async function fetchFromReddit(sources: Sources, topic: string): Promise<string[]> {
    const selectedSubreddits = selectRandomSources(sources.reddit.subreddits, 1);
    const userAgent = getRandomUserAgent();
    const results: string[] = [];

    for (const subreddit of selectedSubreddits) {
        const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`;
        try {
            const response = await fetchFn(url, {
                headers: { 'User-Agent': userAgent },
                signal: AbortSignal.timeout(4000),
            });
            if (!response.ok) continue;

            const data = await response.json();
            const posts = data?.data?.children ?? [];

            posts.forEach((post: { data: RedditPostData }) => {
                const title: string = post.data.title;
                
                if (post.data.created_utc > (Date.now() / 1000) - (24 * 3600)) {
                   results.push(`[Reddit Discussion on r/${subreddit}] ${title}`);
                }
            });
        } catch {
            console.warn(`[Content Source] ⚠️ Failed to fetch from Reddit: r/${subreddit}`);
        }
    }
    return results.slice(0, 2);
}

// ─────────────────────────────────────────────
// 📰 Real News Query Generation
// ─────────────────────────────────────────────
function getTopicString(topic: PersonaTopic | string | undefined): string | undefined {
    if (!topic) return undefined;
    return typeof topic === 'string' ? topic : topic.displayName;
}

function generateRealNewsQueries(persona: string, topic: PersonaTopic | string | undefined): string[] {
  const topicStr = getTopicString(topic);
  
  if (persona === 'business_storyteller') {
    const businessQueries = ["Indian startup founder success story", "Indian unicorn company IPO news", "Indian entrepreneur global expansion", "Indian technology breakthrough latest"];
    return topicStr ? [topicStr] : selectRandomSources(businessQueries, 2);
  }
  
  if (persona === 'cricket_storyteller') {
    const cricketQueries = ["Indian cricket team selection news", "IPL controversy OR development today", "Indian cricket personalities latest news", "BCCI cricket policy decisions"];
    return topicStr ? [topicStr] : selectRandomSources(cricketQueries, 2);
  }
  
  if (persona === 'english_vocab_builder') {
    const vocabQueries = ["English vocabulary learning tips", "new words English language today", "competitive exam vocabulary words", "academic writing vocabulary"];
    return topicStr ? [topicStr] : selectRandomSources(vocabQueries, 2);
  }
  
  return topicStr ? [topicStr] : [];
}

// ─────────────────────────────────────────────
// 🚀 Main API
// ─────────────────────────────────────────────

export async function getDynamicContext(persona: string, topic: PersonaTopic | string): Promise<string> {
    // --- START: NEW SIMPLIFIED LOGIC FOR SATIRIST ---
    if (persona === 'satirist') {
        console.log('[Content Source] 🧐 Satirist (Witty Commentator mode) selected. Fetching general top news...');
        
        const results = await Promise.allSettled([
            fetchFromIndianNewsRSS(),
            fetchFromGoogle("India news today"),
            fetchFromGoogle("Top headlines India"),
        ]);

        const allContent: string[] = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allContent.push(...res.value);
            }
        });

        if (allContent.length === 0) {
            return "No trending news found. Generate a general witty observation about the current state of affairs in India.";
        }

        const uniqueHeadlines = [...new Set(allContent)];
        
        // --- START: NEW FIX ---
        // Shuffle the collected headlines to ensure the AI doesn't repeatedly pick the same top story.
        console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines. Shuffling list to ensure variety.`);
        uniqueHeadlines.sort(() => 0.5 - Math.random());
        // --- END: NEW FIX ---

        const finalContext = "Trending news headlines for commentary:\n" + uniqueHeadlines.slice(0, 15).map(c => `- ${c}`).join('\n') + "\n\nSelect ONE headline and provide witty commentary.";
        
        return finalContext;
    }
    // --- END: NEW SIMPLIFIED LOGIC FOR SATIRIST ---


    // --- EXISTING LOGIC FOR ALL OTHER PERSONAS ---
    const supportedPersonas = ['business_storyteller', 'cricket_storyteller', 'english_vocab_builder'];
    if (!supportedPersonas.includes(persona)) {
        return "";
    }

    const isPersonaTopic = typeof topic === 'object' && topic !== null && 'key' in topic;
    const topicString: string = isPersonaTopic ? (topic as PersonaTopic).displayName : (topic as string);

    const searchQueries = generateRealNewsQueries(persona, topic);

    const dateKey = new Date().toISOString().split('T')[0];
    const cacheDuration = persona === 'english_vocab_builder' ? 60 : 30;
    const cacheKey = `${persona}_${topicString.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '_')}_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * cacheDuration))}`;
    console.log(`[Content Source] 🎯 Fetching real news for ${persona} on topic "${topicString}"`);
    
    const cached = getCachedContext(cacheKey);
    if (cached) return cached;

    try {
        const sources = await loadSources(persona);
        if (!sources || !sources.twitter || !sources.reddit || (sources.twitter.handles.length === 0 && sources.reddit.subreddits.length === 0)) {
            throw new Error("No valid sources found after loading configuration.");
        }
        
        const fetchPromises = [
            ...searchQueries.map(query => fetchFromGoogle(query)),
            fetchFromTwitter(sources, topicString),
            fetchFromReddit(sources, topicString)
        ].filter(p => p);

        const results = await Promise.allSettled(fetchPromises);
        const allContent: string[] = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                allContent.push(...res.value);
            }
        });

        if (allContent.length === 0) {
            if (persona === 'business_storyteller') {
              return "No specific recent business news found. Generate compelling business stories based on general Indian business trends.";
            } else if (persona === 'cricket_storyteller') {
              return "No specific recent cricket news found. Generate compelling cricket stories based on general cricket trends and personalities.";
            } else if (persona === 'english_vocab_builder') {
              return "No specific recent educational content found. Generate engaging vocabulary lessons based on common English learning needs.";
            } else {
              return "No specific recent news events were found for this topic. Generate a question based on general knowledge.";
            }
        }

        let finalContext: string;
        if (persona === 'business_storyteller') {
          finalContext = "Recent business developments for storytelling:\n" + allContent.slice(0, 6).map(c => `- ${c}`).join('\n') + "\n\nUse these as inspiration for compelling business stories with narrative depth.";
        } else if (persona === 'cricket_storyteller') {
          finalContext = "Recent cricket developments for storytelling:\n" + allContent.slice(0, 6).map(c => `- ${c}`).join('\n') + "\n\nUse these as inspiration for compelling cricket stories focusing on human elements.";
        } else if (persona === 'english_vocab_builder') {
          finalContext = "Recent educational content and vocabulary trends:\n" + allContent.slice(0, 5).map(c => `- ${c}`).join('\n') + "\n\nUse these as inspiration for engaging vocabulary lessons and word learning content.";
        } else {
          finalContext = "Recent developments and discussions include:\n" + allContent.map(c => `- ${c}`).join('\n');
        }

        setCachedContext(cacheKey, finalContext);
        return finalContext;

    } catch (error) {
      console.error(`[Content Source] ❌ Top-level failure for ${persona}:`, error);
      return "Could not fetch latest news due to a system error. Using general knowledge.";
    }
}