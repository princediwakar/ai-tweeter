// lib/contentSource/ContentPipeline.ts
// Unified content fetching pipeline - standardizes all content sources
// Interface-based design allowing easy addition of new fetchers

import type { Persona } from '../types';

export interface ContentItem {
  url: string;
  headline: string;
  description: string;
  content?: string;
  publishedAt?: string;
  source: string;
}

export interface FetchConfig {
  sources: string[];        // URLs or source identifiers
  maxResults?: number;
  topic?: string;
  options?: {
    includeContent?: boolean;
    extractFullArticle?: boolean;
  };
}

export interface ContentFetcher {
  name: string;
  fetch(config: FetchConfig): Promise<ContentItem[]>;
}

/**
 * ContentPipeline - Unified interface for all content sources
 * Currently uses: Tavily (URL discovery) + Jina (extraction)
 * Can extend with: RSS, Reddit, Google, Twitter
 */
export class ContentPipeline {
  private fetchers: Map<string, ContentFetcher> = new Map();

  constructor() {
    this.registerDefaultFetchers();
  }

  /**
   * Register a fetcher
   */
  registerFetcher(name: string, fetcher: ContentFetcher): void {
    this.fetchers.set(name, fetcher);
  }

  /**
   * Fetch content for a persona
   */
  async fetchForPersona(
    persona: Persona,
    topic?: string
  ): Promise<ContentItem[]> {
    const sources = (persona.rss_sources || []).filter(Boolean) as string[];
    
    if (sources.length === 0) {
      console.warn(`[ContentPipeline] No sources configured for persona: ${persona.key}`);
      return [];
    }

    // Use Tavily + Jina pipeline (primary method)
    return this.fetchWithTavilyJina(sources, topic, (persona.topics || undefined));
  }

  /**
   * Fetch using Tavily for URL discovery + Jina for extraction
   */
  private async fetchWithTavilyJina(
    domains: string[],
    topic?: string,
    personaTopics?: string[]
  ): Promise<ContentItem[]> {
    const searchQuery = this.buildSearchQuery(topic, personaTopics);
    
    // Step 1: Tavily finds URLs on trusted domains
    const urls = await this.discoverUrlsWithTavily(searchQuery, domains);
    
    if (urls.length === 0) {
      console.warn(`[ContentPipeline] No URLs discovered from trusted domains`);
      return [];
    }

    // Step 2: Jina extracts content from URLs
    const articles = await this.extractWithJina(urls);
    
    return articles;
  }

  /**
   * Build search query from topic and persona topics
   */
  private buildSearchQuery(topic?: string, personaTopics?: string[]): string {
    const topics = [
      ...(personaTopics || []),
      topic?.replace('_', ' ') || 'industry news'
    ].join(' ');
    
    return `Latest highly analytical articles or news regarding ${topics}`;
  }

  /**
   * Discover URLs using Tavily API
   */
  private async discoverUrlsWithTavily(
    query: string,
    domains: string[],
    maxResults: number = 3
  ): Promise<string[]> {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    
    if (!tavilyApiKey) {
      console.warn(`[ContentPipeline] TAVILY_API_KEY not configured`);
      return [];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query,
          search_depth: 'basic',
          include_domains: domains,
          max_results: maxResults
        })
      });

      if (!response.ok) {
        console.warn(`[ContentPipeline] Tavily returned ${response.status}`);
        return [];
      }

      const data = await response.json();
      return (data.results || []).map((r: any) => r.url);
    } catch (error) {
      console.error(`[ContentPipeline] Tavily search failed:`, error);
      return [];
    }
  }

  /**
   * Extract content using Jina Reader
   */
  private async extractWithJina(urls: string[]): Promise<ContentItem[]> {
    const articles: ContentItem[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        articles.push({
          url,
          headline: data.title || 'Untitled',
          description: data.description || '',
          content: data.text || data.content || '',
          source: new URL(url).hostname
        });
      } catch (error) {
        console.warn(`[ContentPipeline] Jina extraction failed for ${url}:`, error);
      }
    }

    return articles;
  }

  /**
   * Format content items for generation prompt
   */
  formatForPrompt(items: ContentItem[]): string {
    return items.map((item, index) => {
      return `### ARTICLE ${index + 1}\nURL: ${item.url}\nTitle: ${item.headline}\nContent:\n${item.description}\n### END ARTICLE ${index + 1}`;
    }).join('\n\n');
  }

  /**
   * Register default fetchers
   */
  private registerDefaultFetchers(): void {
    // Default implementation uses Tavily + Jina
    // Additional fetchers can be registered via registerFetcher()
  }
}

// Singleton instance
export const contentPipeline = new ContentPipeline();
export default contentPipeline;