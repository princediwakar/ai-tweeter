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
      throw new Error(`Google News responded with status: ${response.status}`);
    }

    const xml = await response.text();
    const parsed = await parseStringPromise(xml);
    const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 4) ?? [];
    
    return items.map(item => item.title?.[0]).filter((title): title is string => !!title);

  } catch (error) {
    console.warn(`[Content Source] ⚠️ Failed to fetch from Google News:`, error);
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
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 2) ?? [];
      
      items.forEach(item => {
        const title = item.title?.[0];
        if (title) results.push(title);
      });
      
    } catch (error) {
      console.warn(`[Content Source] ⚠️ Failed to fetch from RSS feed: ${feed}`);
    }
  }
  
  return results.slice(0, 6);
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
function generateRealNewsQueries(persona: string, topic?: string): string[] {
  if (persona === 'satirist') {
    // PRIORITIZED: High-engagement, positive-spin news sources
    const newsQueries = [
      // TOP PRIORITY: Indian Innovation & Success Stories
      "Indian startup unicorn success today",
      "Indian space ISRO achievement news",
      "Indian technology breakthrough latest",
      "Indian athletes Olympic achievement",
      "Indian scientists research breakthrough",
      
      // HIGH PRIORITY: Economic Success Stories
      "Indian economy growth positive news",
      "Indian exports record breaking",
      "Make in India manufacturing success",
      "Indian digital payments UPI growth",
      "Indian renewable energy milestone",
      
      // MEDIUM PRIORITY: Political/Policy (for positive angles)
      "Indian government infrastructure project",
      "Digital India initiative success",
      "Swachh Bharat cleanliness achievement",
      "Indian education digitalization success",
      "Indian healthcare telemedicine growth",
      
      // CULTURAL CELEBRATIONS
      "Indian festival global celebration",
      "Bollywood international recognition",
      "Indian cuisine global popularity",
      "Indian classical music international"
    ];
    
    // Return 3 random queries from prioritized list for variety
    return newsQueries.sort(() => 0.5 - Math.random()).slice(0, 3);
  }
  
  if (persona === 'business_storyteller') {
    // PRIORITIZED: High-impact business stories with narrative potential
    const businessQueries = [
      // TOP PRIORITY: Indian Founder Stories & Unicorn News
      "Indian startup founder success story",
      "Indian unicorn company IPO news",
      "Indian entrepreneur global expansion",
      "Indian startup acquisition deal",
      "Indian business leader achievement",
      
      // HIGH PRIORITY: Innovation & Technology Stories
      "Indian fintech breakthrough innovation",
      "Indian SaaS company global success",
      "Indian AI startup international",
      "Indian space technology private",
      "Indian edtech revolution story",
      
      // MEDIUM PRIORITY: Corporate Strategy Stories
      "Tata group strategic transformation",
      "Reliance new business venture",
      "Infosys digital innovation project",
      "Adani infrastructure expansion",
      "Mahindra electric vehicle strategy"
    ];
    
    // Return 2 random queries from prioritized list for variety
    return businessQueries.sort(() => 0.5 - Math.random()).slice(0, 2);
  }
  
  if (persona === 'cricket_storyteller') {
    const cricketQueries = [
      // Indian Cricket News
      "Virat Kohli performance latest news",
      "Rohit Sharma captain India cricket",
      "MS Dhoni CSK IPL news",
      "Indian cricket team selection news",
      "IPL auction 2024 latest news",
      "Hardik Pandya MI captain news",
      "Rishabh Pant injury comeback news",
      "Jasprit Bumrah bowling performance",
      "India vs Australia cricket series",
      "India vs England cricket news",
      "World Cup India cricket team",
      "BCCI cricket policy decisions",
      "Women cricket India team news",
      "Ranji Trophy domestic cricket"
    ];
    
    return cricketQueries.sort(() => 0.5 - Math.random()).slice(0, 2);
  }
  
  if (persona === 'english_vocab_builder') {
    const vocabQueries = [
      // Educational Content Sources
      "English vocabulary learning tips",
      "new words English language today",
      "English grammar rules latest",
      "competitive exam vocabulary words",
      "IELTS TOEFL vocabulary preparation",
      "advanced English words usage",
      "common English mistakes avoid",
      "English pronunciation techniques",
      "academic writing vocabulary",
      "business English communication",
      "confusing English words pairs",
      "English idioms expressions meaning",
      "word etymology origin history",
      "English learning resources online"
    ];
    
    return vocabQueries.sort(() => 0.5 - Math.random()).slice(0, 2);
  }
  
  // Fallback for other personas - use topic as before
  return topic ? [topic] : [];
}

// ─────────────────────────────────────────────
// 🚀 Main API
// ─────────────────────────────────────────────
export async function getDynamicContext(persona: string, topic: string): Promise<string> {
  const supportedPersonas = ['satirist', 'business_storyteller', 'cricket_storyteller', 'english_vocab_builder'];
  if (!supportedPersonas.includes(persona)) {
    return "";
  }

  // Generate real news queries for all supported personas
  let searchQueries: string[];
  let cacheKey: string;
  
  if (persona === 'satirist') {
    searchQueries = generateRealNewsQueries(persona);
    // Create cache key based on date to ensure fresh news daily
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    cacheKey = `${persona}_real_news_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * 15))}`; // 15-min cache
    console.log(`[Content Source] 🎯 Fetching real news headlines for satirical commentary using queries: ${searchQueries.join(', ')}`);
  } else if (persona === 'business_storyteller' || persona === 'cricket_storyteller') {
    searchQueries = generateRealNewsQueries(persona, topic);
    // Create cache key based on date to ensure fresh news
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    cacheKey = `${persona}_real_news_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * 30))}`; // 30-min cache for stories
    console.log(`[Content Source] 🎯 Fetching real news for ${persona} using queries: ${searchQueries.join(', ')}`);
  } else if (persona === 'english_vocab_builder') {
    searchQueries = generateRealNewsQueries(persona, topic);
    // Create cache key based on date to ensure fresh educational content
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    cacheKey = `${persona}_education_content_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * 60))}`; // 60-min cache for educational content
    console.log(`[Content Source] 🎯 Fetching educational content for ${persona} using queries: ${searchQueries.join(', ')}`);
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
    
    // Use real news queries for all storytelling personas
    let fetchPromises: Promise<string[]>[];
    
    if (persona === 'satirist') {
      fetchPromises = [
        ...searchQueries.map(query => fetchFromGoogle(query)),
        fetchFromIndianNewsRSS(), // Get top Indian news headlines
        fetchFromTwitter(sources, 'India news today'), // Get general Indian news from Twitter
      ];
    } else if (persona === 'business_storyteller') {
      fetchPromises = [
        ...searchQueries.map(query => fetchFromGoogle(query)),
        fetchFromIndianNewsRSS(), // Get business news from RSS feeds
        fetchFromTwitter(sources, 'Indian business startup'), // Get business news from Twitter
      ];
    } else if (persona === 'cricket_storyteller') {
      fetchPromises = [
        ...searchQueries.map(query => fetchFromGoogle(query)),
        fetchFromIndianNewsRSS(), // Get general news including sports
        fetchFromTwitter(sources, 'Indian cricket team'), // Get cricket news from Twitter
      ];
    } else if (persona === 'english_vocab_builder') {
      fetchPromises = [
        ...searchQueries.map(query => fetchFromGoogle(query)),
        fetchFromTwitter(sources, 'English learning vocabulary'), // Get educational content from Twitter
        fetchFromReddit(sources, 'English vocabulary learning') // Get educational discussions from Reddit
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
        } else if (persona === 'business_storyteller') {
          console.warn(`[Content Source] ⚠️ No business news found. Using fallback.`);
          return "No specific recent business news found. Generate compelling business stories based on general Indian business trends.";
        } else if (persona === 'cricket_storyteller') {
          console.warn(`[Content Source] ⚠️ No cricket news found. Using fallback.`);
          return "No specific recent cricket news found. Generate compelling cricket stories based on general cricket trends and personalities.";
        } else if (persona === 'english_vocab_builder') {
          console.warn(`[Content Source] ⚠️ No educational content found. Using fallback.`);
          return "No specific recent educational content found. Generate engaging vocabulary lessons based on common English learning needs.";
        } else {
          console.warn(`[Content Source] ⚠️ No dynamic content found for "${topic}". Using fallback.`);
          return "No specific recent news events were found for this topic. Generate a question based on general knowledge.";
        }
    }

    let finalContext: string;
    if (persona === 'satirist') {
      finalContext = "Recent real news headlines to satirize:\n" + allContent.slice(0, 8).map(c => `- ${c}`).join('\n') + "\n\nGenerate witty satirical commentary on these specific real events.";
    } else if (persona === 'business_storyteller') {
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
    console.error(`[Content Source] ❌ Top-level failure in getDynamicContext:`, error);
    if (persona === 'satirist') {
      return "Could not fetch latest news. Generate satirical commentary on general Indian current events.";
    } else if (persona === 'business_storyteller') {
      return "Could not fetch latest business news. Generate compelling business stories based on general knowledge.";
    } else if (persona === 'cricket_storyteller') {
      return "Could not fetch latest cricket news. Generate compelling cricket stories based on general knowledge.";
    } else if (persona === 'english_vocab_builder') {
      return "Could not fetch latest educational content. Generate engaging vocabulary lessons based on general English learning principles.";
    } else {
      return "Could not fetch latest news due to a system error. Using general knowledge.";
    }
  }
}