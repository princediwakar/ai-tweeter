import { parseStringPromise } from 'xml2js';
import fs from 'fs/promises';
import path from 'path';

// Use native fetch
const fetchFn = globalThis.fetch;

// ─────────────────────────────────────────────
// 🔑 Types & Interfaces
// ─────────────────────────────────────────────
interface CacheEntry {
  context: string;
  timestamp: number;
}

// Updated interface to match the new JSON structure
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

// ─────────────────────────────────────────────
// 🔧 Constants
// ─────────────────────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins
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
  };
  const sourceFile = personaToFile[persona];

  if (!sourceFile) {
     throw new Error(`No source file mapping found for persona: ${persona}`);
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
 * Fetches general news from Google News RSS based on a topic.
 */
async function fetchFromGoogle(topic: string): Promise<string[]> {
  const userAgent = getRandomUserAgent();
  const query = `"${topic}" OR ${topic} when:1d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await fetchFn(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      // Throw an error if the response is not ok
      throw new Error(`Google News responded with status: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);
    const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 3) ?? [];
    
    // Use map to transform items into an array of titles
    return items.map(item => item.title?.[0]).filter((title): title is string => !!title);

  } catch (error) {
    console.warn(`[Content Source] ⚠️ Failed to fetch from Google News:`, error);
    // Return an empty array on failure
    return [];
  }
}

/**
 * Fetches recent posts from Twitter handles via Google News RSS.
 */
async function fetchFromTwitter(sources: Sources, topic: string): Promise<string[]> {
  const selectedHandles = selectRandomSources(sources.twitter.handles, 2);
  const userAgent = getRandomUserAgent();
  const results: string[] = [];

  for (const handle of selectedHandles) {
    const cleanHandle = handle.replace('@', '');
    const query = `site:x.com/${cleanHandle} "${topic}" when:1d`;
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
    const selectedSubreddits = selectRandomSources(sources.reddit.subreddits, 2);
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

            posts.forEach((post: { data: { title: string } }) => {
                const title: string = post.data.title;
                // A simple check for topic relevance in the title
                if (title && title.toLowerCase().includes(topic.toLowerCase().substring(0, 5))) {
                    results.push(`[Reddit Discussion on r/${subreddit}] ${title}`);
                }
            });
        } catch {
            console.warn(`[Content Source] ⚠️ Failed to fetch from Reddit: r/${subreddit}`);
        }
    }
    return results.slice(0, 3);
}

// ─────────────────────────────────────────────
// 📰 Real News Query Generation for Satirist
// ─────────────────────────────────────────────
function generateRealNewsQueries(persona: string): string[] {
  if (persona === 'satirist') {
    const newsQueries = [
      // Indian Political Headlines
      "Modi BJP India today news",
      "Indian politics parliament latest", 
      "Congress opposition India news",
      "AAP Delhi politics news",
      "Indian government policy today",
      
      // Indian Business Headlines  
      "Indian startup funding latest news",
      "Tata Reliance Adani business news",
      "RBI India economy today",
      "Indian stock market news",
      "unicorn startup India news",
      
      // India Geopolitics Headlines
      "India China border latest news",
      "India US relations today",
      "India Pakistan news today",
      "India Russia defense news",
      "India Israel partnership news",
      "QUAD BRICS India diplomacy",
      
      // Indian Social & Cultural
      "Bollywood politics controversy",
      "Indian social media viral news",
      "Indian cricket politics news",
      "Indian education policy news"
    ];
    
    // Return 2-3 random queries for variety
    return newsQueries.sort(() => 0.5 - Math.random()).slice(0, 3);
  }
  
  // Fallback for other personas - use topic as before
  return [];
}

// ─────────────────────────────────────────────
// 🚀 Main API
// ─────────────────────────────────────────────
export async function getDynamicContext(persona: string, topic: string): Promise<string> {
  const supportedPersonas = ['satirist'];
  if (!supportedPersonas.includes(persona)) {
    return "";
  }

  // For satirist persona, ignore topic and use real news queries
  let searchQueries: string[];
  let cacheKey: string;
  
  if (persona === 'satirist') {
    searchQueries = generateRealNewsQueries(persona);
    // Create cache key based on date to ensure fresh news daily
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    cacheKey = `${persona}_real_news_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * 15))}`; // 15-min cache
    console.log(`[Content Source] 🎯 Fetching real news headlines for satirical commentary using queries: ${searchQueries.join(', ')}`);
  } else {
    searchQueries = [topic];
    cacheKey = `${persona}_${topic.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '_')}`;
    console.log(`[Content Source] 🎯 Fetching context for persona "${persona}" on topic "${topic}"`);
  }

  const cached = getCachedContext(cacheKey);
  if (cached) return cached;

  try {
    const sources = await loadSources(persona);
    // Updated check for the new source structure
    if (!sources || !sources.twitter || !sources.reddit || (sources.twitter.handles.length === 0 && sources.reddit.subreddits.length === 0)) {
        throw new Error("No valid sources found after loading configuration.");
    }
    
    // For satirist, use multiple real news queries
    let fetchPromises: Promise<string[]>[];
    
    if (persona === 'satirist') {
      fetchPromises = [
        ...searchQueries.map(query => fetchFromGoogle(query)),
        fetchFromTwitter(sources, 'India news today'), // Get general Indian news from Twitter
        fetchFromReddit(sources, 'India') // Get Indian discussions
      ];
    } else {
      fetchPromises = [
        fetchFromGoogle(topic),
        fetchFromTwitter(sources, topic),
        fetchFromReddit(sources, topic)
      ];
    }

    const results = await Promise.allSettled(fetchPromises);
    const allContent: string[] = [];
    results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allContent.push(...res.value);
        }
    });

    if (allContent.length === 0) {
        if (persona === 'satirist') {
          console.warn(`[Content Source] ⚠️ No real news headlines found. Using fallback.`);
          return "No specific recent news events were found. Generate satirical commentary on general Indian political and business trends.";
        } else {
          console.warn(`[Content Source] ⚠️ No dynamic content found for "${topic}". Using fallback.`);
          return "No specific recent news events were found for this topic. Generate a question based on general knowledge.";
        }
    }

    const finalContext = persona === 'satirist' 
      ? "Recent real news headlines to satirize:\n" + allContent.slice(0, 8).map(c => `- ${c}`).join('\n') + "\n\nGenerate witty satirical commentary on these specific real events."
      : "Recent developments and discussions include:\n" + allContent.map(c => `- ${c}`).join('\n');
    
    setCachedContext(cacheKey, finalContext);
    return finalContext;

  } catch (error) {
    console.error(`[Content Source] ❌ Top-level failure in getDynamicContext:`, error);
    return persona === 'satirist' 
      ? "Could not fetch latest news. Generate satirical commentary on general Indian current events."
      : "Could not fetch latest news due to a system error. Using general knowledge.";
  }
}