// lib/services/sourceDiscoverer.ts

import { getDeepseekClientAsync } from "../generationService";
import { PersonaDesignResult } from "./personaDesigner";
import { findSources, findSourcesByCategory, type BlogSource } from "../blogSourceService";

const SOURCE_DISCOVERY_PROMPT = `You are an elite research assistant. I will give you a persona's core thesis and topics. 
Your job is to write EXACTLY ONE search query to find RSS feed URLs for blogs relevant to these topics.

CRITICAL RULES:
1. The query MUST be short and keyword-rich (MAXIMUM 8 WORDS).
2. Do NOT write a paragraph. Do NOT use conversational filler.
3. MUST ask for RSS FEEDS specifically - include "rss feed" in the query.
4. Output ONLY a JSON object with a single string field "query".

BAD Example: { "query": "product strategy startups india" }
GOOD Example: { "query": "product strategy rss feed" }`;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Product': ['product strategy', 'product management', 'product growth', 'rss feed'],
  'Engineering': ['software engineering', 'system design', 'rss feed'],
  'Business': ['business strategy', 'monetization', 'unit economics', 'rss feed'],
  'Finance': ['startup fundraising', 'vc investing', 'rss feed'],
  'Marketing': ['growth marketing', 'content marketing', 'rss feed'],
  'Sales': ['b2b sales', 'sales strategy', 'rss feed'],
  'AI Tools': ['ai tools', 'llm applications', 'rss feed'],
  'Productivity': ['productivity', 'time management', 'rss feed'],
  'Personal Finance': ['personal finance', 'investing', 'rss feed'],
  'Health': ['health', 'wellness', 'rss feed'],
  'Angel Investing': ['angel investing', 'vc', 'rss feed'],
  'Indian Startup News': ['indian startups', 'india startup', 'rss feed'],
  'Indian Stock Market': ['indian stock market', 'india investing', 'rss feed'],
};

export class SourceDiscoverer {
  private tavilyApiKey = process.env.TAVILY_API_KEY;

  async discoverSources(persona: PersonaDesignResult): Promise<string[]> {
    const results: string[] = [];
    const usedCategories = new Set<string>();

    const matchedCategories = this.matchCategories(persona.topics || []);
    console.log(`[SourceDiscoverer] Matched categories: ${matchedCategories.join(', ')}`);

    for (const category of matchedCategories) {
      const categorySources = await findSourcesByCategory(category, 5);
      if (categorySources.length > 0) {
        const validUrls = await this.validateRssFeeds(categorySources);
        results.push(...validUrls);
        usedCategories.add(category);
        console.log(`[SourceDiscoverer] Added ${validUrls.length} sources from ${category}`);
      }
    }

    if (results.length >= 3) {
      console.log(`[SourceDiscoverer] Total curated sources: ${results.length}`);
      return results;
    }

    console.log(`[SourceDiscoverer] Only ${results.length} curated sources, using Tavily to find RSS feeds...`);

    if (this.tavilyApiKey) {
      try {
        const tavilySources = await this.searchRssFeeds(persona, matchedCategories);
        const validTavilySources = await this.validateRssUrls(tavilySources);
        
        for (const url of validTavilySources) {
          if (!results.includes(url)) {
            results.push(url);
          }
        }
      } catch (err) {
        console.error('[SourceDiscoverer] Tavily search failed:', err);
      }
    }

    if (results.length < 3) {
      const fallbacks = this.getFallbackSources(persona.topics || []);
      results.push(...fallbacks.filter(f => !results.includes(f)));
    }

    return [...new Set(results)].slice(0, 15);
  }

  private matchCategories(topics: string[]): string[] {
    const topicStr = topics.join(' ').toLowerCase();
    const matched: string[] = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matches = keywords.filter(kw => {
        const baseKeyword = kw.split(' ')[0].toLowerCase();
        return topicStr.includes(baseKeyword);
      });
      if (matches.length >= 2) {
        matched.push(category);
      }
    }

    if (matched.length === 0) {
      if (topicStr.includes('product')) {
        matched.push('Product');
      }
      if (topicStr.includes('startup') || topicStr.includes('founder')) {
        matched.push('Angel Investing', 'Finance');
      }
      if (topicStr.includes('india') || topicStr.includes('indian')) {
        matched.push('Indian Startup News');
        if (topicStr.includes('stock') || topicStr.includes('market') || topicStr.includes('invest')) {
          matched.push('Indian Stock Market');
        }
      }
    }

    return [...new Set(matched)];
  }

  private async validateRssFeeds(sources: BlogSource[]): Promise<string[]> {
    const validUrls: string[] = [];

    for (const source of sources) {
      if (source.feed_url) {
        const isValid = await this.checkRssValid(source.feed_url);
        if (isValid) {
          validUrls.push(source.feed_url);
        } else {
          const isHomepageValid = await this.checkRssValid(source.url);
          if (isHomepageValid) {
            validUrls.push(source.url);
          }
        }
      } else {
        const isValid = await this.checkRssValid(source.url);
        if (isValid) {
          validUrls.push(source.url);
        }
      }
    }

    return validUrls;
  }

  private async validateRssUrls(urls: string[]): Promise<string[]> {
    const validUrls: string[] = [];

    for (const url of urls) {
      const isValid = await this.checkRssValid(url);
      if (isValid) {
        validUrls.push(url);
      }
    }

    return validUrls;
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

  private async searchRssFeeds(persona: PersonaDesignResult, matchedCategories: string[]): Promise<string[]> {
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

    console.log(`🔍 [Tavily Search] Executing RSS discovery query: "${masterQuery}"`);

    const searchOptions: Record<string, any> = {
      api_key: this.tavilyApiKey,
      query: `${masterQuery}`,
      search_depth: "advanced",
      max_results: 15,
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
          const feedUrl = this.guessFeedUrl(url);
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

  private guessFeedUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const feedPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/feed/rss', '/blog/feed'];
      
      for (const path of feedPaths) {
        const feedUrl = `${urlObj.origin}${path}`;
        return feedUrl;
      }
      
      return null;
    } catch {
      return null;
    }
  }

  public getFallbackSources(topics: string[] = []): string[] {
    const fallbacks = [
      'https://lenny.substack.com/feed',
      'https://tomtunguz.com/feed.xml',
      'https://stratechery.com/feed/',
    ];

    if (topics.includes('product')) {
      fallbacks.unshift('https://producttalk.org/feed');
    }
    if (topics.some(t => t.includes('india') || t.includes('indian'))) {
      fallbacks.unshift('https://inc42.com/feed');
      fallbacks.unshift('https://yourstory.com/feed');
    }

    return fallbacks;
  }
}

export const sourceDiscoverer = new SourceDiscoverer();