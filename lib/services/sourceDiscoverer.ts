// lib/services/sourceDiscoverer.ts

import { getDeepseekClientAsync } from "../generationService";
import { PersonaDesignResult } from "./personaDesigner";

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
      // FIXED: Passing persona.topics instead of the whole persona object
      return this.getFallbackSources(persona.topics);
    }

    try {
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

      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.tavilyApiKey,
          query: masterQuery,
          search_depth: "advanced",
          max_results: 20, // Widened funnel
          exclude_domains: [
            "medium.com", "forbes.com", "bloomberg.com", "techcrunch.com", 
            "businessinsider.com", "wsj.com", "instagram.com", "linkedin.com", 
            "twitter.com", "x.com", "facebook.com", "tiktok.com", "youtube.com"
          ]
        })
      });

      if (!tavilyRes.ok) {
         throw new Error(`Tavily API responded with status: ${tavilyRes.status}`);
      }

      const searchData = await tavilyRes.json();
      const allUrls = new Set<string>();
      
      if (searchData.results && Array.isArray(searchData.results)) {
        searchData.results.forEach((item: any) => {
          try {

            allUrls.add(item.url);
          } catch (e) {
            // Ignore malformed URLs silently
          }
        });
      }

      // Slice to 15 to give the verifier plenty of options
      const results = Array.from(allUrls).slice(0, 15);
      
      // FIXED: Passing persona.topics instead of the whole persona object
      return results.length > 0 ? results : this.getFallbackSources(persona.topics);

    } catch (error) {
      console.error("❌ Source discovery failed:", error);
      // FIXED: Passing persona.topics instead of the whole persona object
      return this.getFallbackSources(persona.topics);
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