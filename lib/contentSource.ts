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
  link?: string[];
}

interface HeadlineWithSource {
  headline: string;
  url: string;
  description: string | undefined; // Required property that can be undefined
}

interface RedditPostData {
  title: string;
  created_utc: number;
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
// 📁 Source Loading (Kept for potential future use, but not actively used)
// ─────────────────────────────────────────────
async function loadSources(persona: string): Promise<Sources> {
  const personaToFile: Record<string, string> = {
    satirist: 'sources-satirist.json',
    business_storyteller: 'sources-business-storyteller.json',
    cricket_storyteller: 'sources-cricket-storyteller.json',
    english_vocab_builder: 'sources-english-vocab-builder.json',
  };
  const sourceFile = personaToFile[persona];

  if (!sourceFile) {
    console.warn(`[Content Source] No source file for persona: ${persona}, using default sources`);
    return { twitter: { handles: [] }, reddit: { subreddits: [] } };
  }

  try {
    const sourcePath = path.join(process.cwd(), 'config', sourceFile);
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
  const rssFeeds = [ 'https://www.thehindubusinessline.com/feeder/default.rss', 'https://www.thehindu.com/business/Economy/feeder/default.rss', 'https://theentrepreneurindia.com/feed/', 'https://entrepreneuredge.in/news/startup-news/feed/' ];
  const results: HeadlineWithSource[] = [];

  for (const feed of rssFeeds) {
    try {
      const response = await fetchFn(feed, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(4000) });
      if (!response.ok) continue;

      const xml = await response.text();
      const parsed = await parseStringPromise(xml);
      const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 3) ?? [];

      items.forEach((item) => {
        const title = item.title?.[0];
        const link = item.link?.[0];
        const description = cleanDescription(item.description?.[0]);
        if (title && link) {
          results.push({ headline: title, url: link, description });
        }
      });
    } catch {
      console.warn(`[Content Source] ⚠️ Failed to fetch from Business RSS feed: ${feed}`);
    }
  }
  return results.slice(0, 8);
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

// async function fetchFromTwitter(sources: Sources, topic: string): Promise<string[]> {
//   const selectedHandles = selectRandomSources(sources.twitter.handles, 3);
//   const userAgent = getRandomUserAgent();
//   const results: string[] = [];
  
//   const querySuffix = (topic.toLowerCase().includes('news') || topic.toLowerCase().includes('policy')) 
//     ? '+when:1d' 
//     : `"${topic}"+when:1d`;

//   for (const handle of selectedHandles) {
//     const cleanHandle = handle.replace('@', '');
//     const query = `site:x.com/${cleanHandle}${querySuffix}`;
//     const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

//     try {
//       const response = await fetchFn(url, {
//         headers: { 'User-Agent': userAgent },
//         signal: AbortSignal.timeout(4000),
//       });
//       if (!response.ok) continue;

//       const xml = await response.text();
//       const parsed = await parseStringPromise(xml);
//       const items: RssItem[] = parsed?.rss?.channel?.[0]?.item?.slice(0, 2) ?? [];
      
//       items.forEach(item => {
//         const title = item.title?.[0];
//         if (title) results.push(`[Twitter Post from ${handle}] ${title}`);
//       });
//     } catch {
//       console.warn(`[Content Source] ⚠️ Failed to fetch from Twitter handle: ${handle}`);
//     }
//   }
//   return results;
// }


// async function fetchFromReddit(sources: Sources): Promise<string[]> {
//     const selectedSubreddits = selectRandomSources(sources.reddit.subreddits, 1);
//     const userAgent = getRandomUserAgent();
//     const results: string[] = [];

//     for (const subreddit of selectedSubreddits) {
//         const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`;
//         try {
//             const response = await fetchFn(url, {
//                 headers: { 'User-Agent': userAgent },
//                 signal: AbortSignal.timeout(4000),
//             });
//             if (!response.ok) continue;

//             const data = await response.json();
//             const posts = data?.data?.children ?? [];

//             posts.forEach((post: { data: RedditPostData }) => {
//                 const title: string = post.data.title;
                
//                 if (post.data.created_utc > (Date.now() / 1000) - (24 * 3600)) {
//                    results.push(`[Reddit Discussion on r/${subreddit}] ${title}`);
//                 }
//             });
//         } catch {
//             console.warn(`[Content Source] ⚠️ Failed to fetch from Reddit: r/${subreddit}`);
//         }
//     }
//     return results.slice(0, 2);
// }



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
// 🚀 Main API
// ─────────────────────────────────────────────
export async function getDynamicContext(persona: string, topic: PersonaTopic | string): Promise<string> {
  // --- START: LOGIC FOR business_storyteller ---
  if (persona === 'business_storyteller') {
    console.log('[Content Source] 🧠 Activating Indian-First Deep Dive mode for Business Storyteller...');
    const cacheKey = `business_storyteller_deep_dive_${new Date().toISOString().split('T')[0]}`;
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
      const enrichmentContext: string[] = [];
      settledResults.forEach(res => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
              res.value.forEach(item => {
                  enrichmentContext.push(`${item.headline}${item.description ? ` -- ${item.description}` : ''}`);
              });
          }
      });

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
      console.error(`[Content Source] ❌ Deep Dive failure for ${persona}:`, error);
      return "Could not fetch latest news due to a system error. Using general knowledge.";
    }
  }

  // --- START: LOGIC FOR cricket_storyteller ---
  if (persona === 'cricket_storyteller') {
    console.log('[Content Source] 🏏 Activating Cricket Deep Dive mode...');
    const cacheKey = `cricket_storyteller_deep_dive_${new Date().toISOString().split('T')[0]}`;
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
      const enrichmentContext: string[] = [];
      settledResults.forEach(res => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
              res.value.forEach(item => {
                  enrichmentContext.push(`${item.headline}${item.description ? ` -- ${item.description}` : ''}`);
              });
          }
      });
      
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
      console.error(`[Content Source] ❌ Cricket Deep Dive failure:`, error);
      return "Could not fetch latest cricket news due to a system error. Using general knowledge.";
    }
  }

  // --- START: LOGIC FOR satirist ---
  if (persona === 'satirist') {
    console.log('[Content Source] 🧐 Satirist selected. Fetching ONLY from Indian News RSS...');
    const allContent = await fetchFromIndianNewsRSS();
    if (allContent.length === 0) {
      return 'No trending news found. Generate a general witty observation about the current state of affairs in India.';
    }
    const uniqueHeadlines = Array.from(new Map(allContent.map((item) => [item.headline, item])).values());
    console.log(`[Content Source] Found ${uniqueHeadlines.length} unique headlines with sources. Shuffling list to ensure variety.`);
    uniqueHeadlines.sort(() => 0.5 - Math.random());
    const selectedHeadlines = uniqueHeadlines.slice(0, 15);
    const numberedHeadlines = selectedHeadlines.map((item, idx) => `${idx + 1}. ${item.headline}`).join('\n');
    const sourceMap = selectedHeadlines.map((item, idx) => `[SOURCE_${idx + 1}]: ${item.url}`).join('\n');
    const finalContext = `Trending news headlines for commentary:
${numberedHeadlines}
Select ONE headline and provide witty commentary.
--- SOURCE METADATA (for logging only) ---
${sourceMap}`;
    return finalContext;
  }

  // --- START: GENERAL LOGIC FOR ALL OTHER PERSONAS ---
  const supportedPersonas = ['english_vocab_builder'];
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
      const fetchPromises = [...searchQueries.map(query => fetchFromGoogle(query))].filter(p => p);

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
          const fallbackMessages: Record<string, string> = {
              'english_vocab_builder': "No specific recent educational content found. Generate engaging vocabulary lessons based on common English learning needs."
          };
          return fallbackMessages[persona] || "No specific recent news events were found for this topic. Generate a question based on general knowledge.";
      }

      let finalContext: string;
      if (persona === 'english_vocab_builder') {
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