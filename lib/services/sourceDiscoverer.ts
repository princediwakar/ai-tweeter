// lib/services/sourceDiscoverer.ts

import { getDeepseekClientAsync } from "../generationService";
import { PersonaDesignResult } from "./personaDesigner";
import { findSources, type BlogSource } from "../blogSourceService";

const SOURCE_DISCOVERY_PROMPT = `You are an elite research assistant. I will give you a persona's core thesis and topics. 
Your job is to write EXACTLY ONE search query to find the best, most obscure sources for this persona.

CRITICAL RULES:
1. The query MUST be short and keyword-rich (MAXIMUM 8 WORDS).
2. Do NOT write a paragraph. Do NOT use conversational filler (e.g., "deep-dive analysis of", "focusing on").
3. Target niche industry terms.
4. Output ONLY a JSON object with a single string field "query".

BAD Example: { "query": "deep dive analysis of b2b saas pricing strategy and unit economics substack blogs" }
GOOD Example: { "query": "b2b saas pricing unit economics blog" }`;

export class SourceDiscoverer {
  private tavilyApiKey = process.env.TAVILY_API_KEY;

  async discoverSources(persona: PersonaDesignResult): Promise<string[]> {
    if (!this.tavilyApiKey) {
      console.warn("⚠️ Tavily API key missing. Falling back to default feeds.");
      return this.getFallbackSources(persona.topics);
    }

    try {
      const curatedSources = await findSources({
        topics: persona.topics || [],
        limit: 10,
      });

      if (curatedSources.length >= 3) {
        console.log(`[SourceDiscoverer] Found ${curatedSources.length} curated sources for topics: ${persona.topics?.join(', ')}`);
        return curatedSources.map((s: BlogSource) => s.url);
      }

      console.log(`[SourceDiscoverer] Only ${curatedSources.length} curated sources, using smart fallback...`);

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

      console.log(`🔍 [Tavily Search] Executing master query: "${masterQuery}"`);

      const curatedDomains = curatedSources
        .map((s: BlogSource) => {
          try { return new URL(s.url).hostname; } catch { return null; }
        })
        .filter(Boolean) as string[];

      const searchOptions: Record<string, any> = {
        api_key: this.tavilyApiKey,
        query: `${masterQuery} blog homepage OR feed`,
        search_depth: "advanced",
        max_results: 20,
        exclude_domains: [
          "medium.com", "forbes.com", "bloomberg.com", "techcrunch.com", 
          "businessinsider.com", "wsj.com", "instagram.com", "linkedin.com", 
          "twitter.com", "x.com", "facebook.com", "tiktok.com", "youtube.com"
        ]
      };

      if (curatedDomains.length > 0) {
        searchOptions.include_domains = curatedDomains;
      }

      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchOptions)
      });

      if (!tavilyRes.ok) {
         throw new Error(`Tavily API responded with status: ${tavilyRes.status}`);
      }

      const searchData = await tavilyRes.json();
      const allUrls = new Set<string>();
      
      if (searchData.results && Array.isArray(searchData.results)) {
        searchData.results.forEach((item: any) => {
          try {
            const url = item.url;
            if (!this.isIndividualArticle(url)) {
              allUrls.add(url);
            }
          } catch (e) {
            // Ignore malformed URLs silently
          }
        });
      }

      const results = Array.from(allUrls).slice(0, 15);
      
      if (results.length > 0) {
        return results;
      }

      console.warn("[SourceDiscoverer] No blog homepages found via Tavily, returning curated sources");
      return curatedSources.map((s: BlogSource) => s.url);

    } catch (error) {
      console.error("❌ Source discovery failed:", error);
      return this.getFallbackSources(persona.topics);
    }
  }

  private isIndividualArticle(url: string): boolean {
    const articlePatterns = [
      /\/\d{4}\/\d{2}\//,
      /\/article[s]?[\/-]/,
      /\/post[s]?[\/-]/,
      /\/blog\/\d{4}/,
      /\/p\//,
      /\/entry\//,
    ];
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return articlePatterns.some((pattern) => pattern.test(pathname));
    } catch {
      return false;
    }
  }

  // FIXED: Method is now public and explicitly takes a string array
  public getFallbackSources(topics: string[] = []): string[] {
    const defaultFeeds = []; 
    
    if (topics.includes('product')) defaultFeeds.push('https://lenny.substack.com/feed');
    if (topics.includes('ai-ml') || topics.includes('tech')) defaultFeeds.push('https://bair.berkeley.edu/blog/feed.xml');
    if (topics.includes('startups') || topics.includes('vc')) defaultFeeds.push('https://tomtunguz.com/index.xml');
    
    return defaultFeeds;
  }
}

export const sourceDiscoverer = new SourceDiscoverer();