// lib/services/sourceDiscoverer.ts

import { getDeepseekClientAsync } from "../generationService";
import { PersonaDesignResult } from "./personaDesigner";
import { listBlogSources } from "../blogSourceService";

const MAX_SOURCES = 8;
const TAVILY_MAX_RESULTS = 10;

const SOURCE_SELECTION_PROMPT = `You are an expert RSS feed selector. Your task is to select the most relevant RSS feed URLs from the provided list based on a persona's topics and core thesis.

SELECTION RULES:
1. Prioritize feeds that directly cover the persona's topics
2. Consider the core thesis to understand the focus area
3. Select feeds that are actively maintained (well-known blogs, active newsletters)
4. Output ONLY a JSON array of feed URLs - nothing else
5. Maximum ${MAX_SOURCES} URLs only

Input format:
- Each line: "name - feed_url - topics: tag1, tag2, ..."

Output format:
{ "urls": ["https://...", "https://..."] }

IMPORTANT: Only include URLs that directly match the persona's topics. If no feeds match, return empty array.`;

const SOURCE_DISCOVERY_PROMPT = `You are an elite research assistant. Your job is to write EXACTLY ONE focused search query to find RSS feed URLs relevant to specific persona topics.

CRITICAL RULES:
1. The query MUST use specific keywords from the persona topics (MAXIMUM 8 WORDS)
2. Do NOT use generic terms like "startups" - use specific topics like "Series A funding", "B2B SaaS", "AI agents"
3. MUST ask for RSS FEEDS specifically - include "rss feed" in the query
4. Output ONLY a JSON object with a single string field "query"

BAD: { "query": "indian startups rss feed" }
GOOD: { "query": "indian startup funding Series A rss feed" }`;

export class SourceDiscoverer {
  private tavilyApiKey = process.env.TAVILY_API_KEY;

  async discoverSources(persona: PersonaDesignResult): Promise<string[]> {
    const results: string[] = [];

    console.log(`[SourceDiscoverer] Phase 1: AI selecting from curated blog_sources...`);
    const curatedSources = await this.selectFromBlogSources(persona);
    results.push(...curatedSources);
    console.log(`[SourceDiscoverer] Selected ${curatedSources.length} sources from blog_sources`);

    if (results.length >= 3) {
      return [...new Set(results)].slice(0, MAX_SOURCES);
    }

    console.log(`[SourceDiscoverer] Phase 2: Tavily fallback for relevant RSS feeds...`);
    if (this.tavilyApiKey && results.length < 3) {
      try {
        const tavilySources = await this.searchRssFeeds(persona);
        const validTavilySources = await this.validateRssUrls(tavilySources);
        
        for (const url of validTavilySources) {
          if (!results.includes(url)) {
            results.push(url);
          }
        }
        console.log(`[SourceDiscoverer] Added ${validTavilySources.length} valid sources from Tavily`);
      } catch (err) {
        console.error('[SourceDiscoverer] Tavily search failed:', err);
      }
    }

    const finalResults = [...new Set(results)].slice(0, MAX_SOURCES);
    console.log(`[SourceDiscoverer] Total sources: ${finalResults.length}`);
    return finalResults;
  }

  private async selectFromBlogSources(persona: PersonaDesignResult): Promise<string[]> {
    const allSources = await listBlogSources({ limit: 200 });
    
    if (allSources.length === 0) {
      console.log('[SourceDiscoverer] No blog_sources found in database');
      return [];
    }

    const formattedSources = allSources
      .map(s => `- ${s.name} - ${s.feed_url || s.url} - topics: ${s.topics.join(', ')}`)
      .join('\n');

    const topicsStr = persona.topics?.join(', ') || 'general';
    const coreThesis = persona.config?.core_thesis || 'none';

    const client = await getDeepseekClientAsync();
    
    try {
      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SOURCE_SELECTION_PROMPT },
          { 
            role: "user", 
            content: `Persona Topics: ${topicsStr}\nCore Thesis: ${coreThesis}\n\nAvailable RSS Feeds:\n${formattedSources}` 
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const urls = parsed.urls || [];
      
      if (!Array.isArray(urls)) return [];

      const validUrls = await this.validateRssUrls(urls);
      return validUrls;
    } catch (err) {
      console.error('[SourceDiscoverer] AI selection failed:', err);
      return [];
    }
  }

  private async validateRssUrls(urls: string[]): Promise<string[]> {
    const results = await Promise.all(
      urls.map(url => this.checkRssValid(url))
    );
    return urls.filter((_, i) => results[i]);
  }

  private async checkRssValid(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || '';
      return contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom');
    } catch {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          redirect: 'follow',
        });
        
        clearTimeout(timeout);
        
        const text = await res.text();
        const isXml = text.trim().startsWith('<?xml') || text.trim().startsWith('<rss') || text.trim().startsWith('<feed');
        return isXml;
      } catch {
        return false;
      }
    }
  }

  private async searchRssFeeds(persona: PersonaDesignResult): Promise<string[]> {
    const client = await getDeepseekClientAsync();
    
    const queryResponse = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SOURCE_DISCOVERY_PROMPT },
        { 
          role: "user", 
          content: `Topics: ${persona.topics?.join(', ') || 'general'}\nCore Thesis: ${persona.config?.core_thesis || 'none'}` 
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = queryResponse.choices[0].message.content;
    if (!content) throw new Error("No query generated.");
    
    const parsed = JSON.parse(content);
    const masterQuery = parsed.query;

    if (!masterQuery) throw new Error("Invalid query format returned by AI.");

    console.log(`[Tavily Search] Query: "${masterQuery}"`);

    const searchOptions: Record<string, any> = {
      api_key: this.tavilyApiKey,
      query: `${masterQuery}`,
      search_depth: "advanced",
      max_results: TAVILY_MAX_RESULTS,
      include_domains: [],
      exclude_domains: [
        "medium.com", "forbes.com", "bloomberg.com", "techcrunch.com", 
        "businessinsider.com", "wsj.com", "instagram.com", "linkedin.com", 
        "twitter.com", "x.com", "facebook.com", "tiktok.com", "youtube.com",
        "reddit.com", "quora.com", "wikipedia.org"
      ]
    };

    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchOptions)
    });

    if (!tavilyRes.ok) {
      throw new Error(`Tavily API responded with status: ${tavilyRes.status}`);
    }

    const searchData = await tavilyRes.json();
    const urls: string[] = [];
    
    if (searchData.results && Array.isArray(searchData.results)) {
      for (const item of searchData.results) {
        const url = item.url;
        if (url && (url.includes('/feed') || url.includes('/rss') || url.includes('.xml') || url.includes('/atom'))) {
          urls.push(url);
        } else if (url && this.isLikelyBlogHomepage(url)) {
          const feedUrl = await this.guessFeedUrl(url);
          if (feedUrl) {
            urls.push(feedUrl);
          }
        }
      }
    }

    return urls;
  }

  private isLikelyBlogHomepage(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      return path === '/' || path === '' || path === '/blog' || path === '/posts' || path === '/articles';
    } catch {
      return false;
    }
  }

  private async guessFeedUrl(url: string): Promise<string | null> {
    try {
      const urlObj = new URL(url);
      const feedPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/feed/rss', '/blog/feed'];
      
      for (const path of feedPaths) {
        const feedUrl = `${urlObj.origin}${path}`;
        if (await this.checkRssValid(feedUrl)) {
          return feedUrl;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

export const sourceDiscoverer = new SourceDiscoverer();