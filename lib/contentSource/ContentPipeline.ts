// lib/contentSource/ContentPipeline.ts
// Unified content fetching pipeline - standardizes all content sources
// Interface-based design allowing easy addition of new fetchers

import type { Persona } from '../types';
import { fetchFromRssFeeds } from './fetchers/rss';
import { findSources, findSourcesBySourceType, type BlogSource } from '../blogSourceService';
import { extractWithJina } from './fetchers/jinaExtractor';

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
 * Uses hybrid approach: RSS -> Jina -> Tavily
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
   * Fetch content for a persona using hybrid approach
   * @param excludeUrls - URLs to exclude (already used by this account)
   */
  async fetchForPersona(
    persona: Persona,
    topic?: string,
    excludeUrls?: string[]
  ): Promise<ContentItem[]> {
    const sources = await this.resolveSourcesForPersona(persona);
    
    if (sources.length === 0) {
      console.warn(`[ContentPipeline] No sources configured for persona: ${persona.key}`);
      return [];
    }

    return this.fetchWithHybrid(sources, topic, (persona.topics || undefined), excludeUrls);
  }

  /**
   * Resolve sources for persona - either from DB or RSS feeds
   */
  private async resolveSourcesForPersona(persona: Persona): Promise<BlogSource[]> {
    // Use persona's direct RSS sources if available
    if (persona.rss_sources && persona.rss_sources.length > 0) {
      console.log(`[ContentPipeline] Using persona's direct RSS sources: ${persona.rss_sources.length} sources`);
      
      // Convert RSS URLs to BlogSource objects
      const sources: BlogSource[] = [];
      for (const feedUrl of persona.rss_sources) {
        try {
          const url = new URL(feedUrl);
          sources.push({
            id: `rss-${feedUrl}`,
            name: url.hostname,
            url: feedUrl,
            feed_url: feedUrl,
            category: '',
            topics: persona.topics || [],
            source_type: 'general',
            is_active: true,
            created_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn(`[ContentPipeline] Invalid RSS URL: ${feedUrl}`);
        }
      }
      
      if (sources.length > 0) {
        return sources;
      }
    }

    // Check if persona has source_type in config (new approach)
    const pConfig = (persona.config as Record<string, unknown>) || {};
    const sourceType = pConfig.source_type as string | undefined;
    
    if (sourceType) {
      console.log(`[ContentPipeline] Using source_type: ${sourceType}`);
      return findSourcesBySourceType(sourceType, 10);
    }

    // Fallback: find sources by topics
    return findSources({
      topics: persona.topics || [],
      limit: 10,
    });
  }

  /**
   * Hybrid fetching: RSS -> Jina -> Tavily
   * @param excludeUrls - URLs to exclude (already used by this account)
   */
  private async fetchWithHybrid(
    blogSources: BlogSource[],
    topic?: string,
    personaTopics?: string[],
    excludeUrls?: string[]
  ): Promise<ContentItem[]> {
    const articles: ContentItem[] = [];

    for (const source of blogSources) {
      try {
        const rssArticles = await fetchFromRssFeeds(
          [source.feed_url],
          5,
          5
        );

        if (rssArticles.length > 0) {
          for (const item of rssArticles) {
            articles.push({
              url: item.url,
              headline: item.headline,
              description: item.description || '',
              source: source.name,
            });
          }
          console.log(`[ContentPipeline] RSS for ${source.name}, got ${rssArticles.length} articles`);
          continue;
        }

        console.log(`[ContentPipeline] No RSS content for ${source.name}, trying Jina on homepage`);
        const homepageArticles = await this.extractFromHomepage(source.url, topic, personaTopics);
        
        if (homepageArticles.length > 0) {
          articles.push(...homepageArticles);
          continue;
        }

        console.log(`[ContentPipeline] No homepage content for ${source.name}, searching for recent articles`);
        const recentArticles = await this.searchRecentArticles(source.url, topic, personaTopics);
        articles.push(...recentArticles);

      } catch (error) {
        console.warn(`[ContentPipeline] Failed to fetch from ${source.name}:`, error);
      }
    }

    const filteredArticles = this.filterExcludedUrls(articles, excludeUrls);
    
    if (excludeUrls && excludeUrls.length > 0 && filteredArticles.length === 0 && articles.length > 0) {
      console.warn(`[ContentPipeline] ⚠️ All ${articles.length} fetched articles were excluded (already used). Consider adding new sources.`);
    }
    
    const limitedArticles = filteredArticles.slice(0, 4);
    
    // Enrich with full article content using Jina
    if (limitedArticles.length > 0) {
      console.log(`[ContentPipeline] Enriching ${limitedArticles.length} articles with full content via Jina...`);
      const urlsToEnrich = limitedArticles.map(a => a.url);
      const enrichedArticles = await extractWithJina(urlsToEnrich);
      
      // Merge enriched content into articles
      const enrichedMap = new Map(enrichedArticles.map(e => [e.url, e]));
      for (const article of limitedArticles) {
        const enriched = enrichedMap.get(article.url);
        if (enriched && enriched.description && enriched.description.length > article.description.length) {
          article.description = enriched.description;
          console.log(`[ContentPipeline] ✅ Enriched article: ${article.headline.substring(0, 50)}... (${enriched.description.length} chars)`);
        }
      }
    }
    
    return limitedArticles;
  }

  /**
   * Filter out articles with URLs that have already been used
   */
  private filterExcludedUrls(articles: ContentItem[], excludeUrls?: string[]): ContentItem[] {
    if (!excludeUrls || excludeUrls.length === 0) {
      return articles;
    }
    
    const excludeSet = new Set(excludeUrls.map(url => url.toLowerCase()));
    const beforeCount = articles.length;
    const filtered = articles.filter(article => !excludeSet.has(article.url.toLowerCase()));
    
    if (filtered.length < beforeCount) {
      console.log(`[ContentPipeline] Filtered out ${beforeCount - filtered.length} already-used articles`);
    }
    
    return filtered;
  }

  /**
   * Extract recent articles from blog homepage using Jina
   */
  private async extractFromHomepage(
    homepageUrl: string,
    topic?: string,
    personaTopics?: string[]
  ): Promise<ContentItem[]> {
    let hostname = 'unknown';
    try {
      hostname = new URL(homepageUrl).hostname;
    } catch {
      console.warn(`[ContentPipeline] Invalid URL: ${homepageUrl}`);
      return [];
    }

    try {
      const response = await fetch(`https://r.jina.ai/${homepageUrl}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return [{
        url: homepageUrl,
        headline: data.title || 'Recent articles from ' + hostname,
        description: data.description || '',
        content: data.text || '',
        source: hostname,
      }];
    } catch (error) {
      console.warn(`[ContentPipeline] Jina extraction failed for ${homepageUrl}:`, error);
      return [];
    }
  }

  /**
   * Search for recent articles using Tavily
   */
  private async searchRecentArticles(
    domain: string,
    topic?: string,
    personaTopics?: string[]
  ): Promise<ContentItem[]> {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    
    if (!tavilyApiKey) {
      return [];
    }

    const searchQuery = this.buildSearchQuery(topic, personaTopics);

    let domainHost = domain;
    try {
      domainHost = new URL(domain).hostname;
    } catch {
      console.warn(`[ContentPipeline] Invalid domain URL: ${domain}`);
      return [];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: searchQuery,
          search_depth: 'basic',
          include_domains: [domainHost],
          max_results: 5
        })
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const items: ContentItem[] = [];

      for (const result of (data.results || []).slice(0, 5)) {
        items.push({
          url: result.url,
          headline: result.title || 'Untitled',
          description: result.content || '',
          source: domainHost,
        });
      }

      return items;
    } catch (error) {
      console.warn(`[ContentPipeline] Tavily search failed:`, error);
      return [];
    }
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
   * Format content items for generation prompt
   */
  formatForPrompt(items: ContentItem[]): string {
    return items.map((item, index) => {
      const contentLength = item.description?.length || 0;
      return `### ARTICLE ${index + 1}
URL: ${item.url}
Title: ${item.headline}
Content Length: ${contentLength} characters
Content:
${item.description}
### END ARTICLE ${index + 1}`;
    }).join('\n\n');
  }

  /**
   * Register default fetchers
   */
  private registerDefaultFetchers(): void {
    // Default implementation uses hybrid approach
    // Additional fetchers can be registered via registerFetcher()
  }
}

// Singleton instance
export const contentPipeline = new ContentPipeline();
export default contentPipeline;