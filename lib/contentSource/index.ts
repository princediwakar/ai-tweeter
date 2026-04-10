// lib/contentSource/index.ts

import { getPersonaByKey } from '@/lib/personas';
import { extractWithJina } from './fetchers/jinaExtractor';

export async function getDynamicContext(
  personaKey: string,
  topic: string, // Comes from the Cron job (e.g., 'explanation', 'concept_clarification')
  accountId?: string,
  fallbackPersonaKey?: string
): Promise<string> {
  console.log(`[Content Source] 🔄 Building dynamic context for persona: ${personaKey}`);

  const persona = await getPersonaByKey(personaKey);
  if (!persona) {
    console.warn(`[Content Source] ⚠️ Persona not found: ${personaKey}`);
    return "";
  }

  // In Phase 2, we saved Base Domains to the rss_sources column
  const domains = persona.rss_sources || [];
  if (domains.length === 0) {
    console.warn(`[Content Source] ⚠️ No trusted domains found for persona: ${personaKey}`);
    return "";
  }

  // Combine the persona's topics with the Cron's requested topic format
  const personaTopics = persona.topics?.join(" ") || "industry news";
  const searchQuery = `Latest highly analytical articles or news regarding ${personaTopics} ${topic.replace('_', ' ')}`;

  // 1. Use Tavily just to find 3 URLs on our Trusted Domains
  console.log(`🔍 Searching ${domains.length} trusted domains for: "${searchQuery}"`);
  let urls: string[] = [];
  
  try {
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) throw new Error("TAVILY_API_KEY missing");

    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: searchQuery,
        search_depth: "basic", // Basic is cheaper/faster, we just need URLs
        include_domains: domains,
        max_results: 3 
      })
    });

    if (tavilyRes.ok) {
      const searchData = await tavilyRes.json();
      urls = searchData.results?.map((r: any) => r.url) || [];
    } else {
      console.warn(`[Content Source] Tavily search returned ${tavilyRes.status}`);
    }
  } catch (e) {
    console.error("❌ Tavily URL search failed:", e);
  }

  if (urls.length === 0) {
    console.warn(`[Content Source] ⚠️ No recent articles found on trusted domains.`);
    return "";
  }

  // 2. Pass the URLs to Jina Reader (Free) for full Markdown extraction
  const articles = await extractWithJina(urls);

  if (articles.length === 0) {
    console.warn(`[Content Source] ⚠️ Jina failed to extract text from the discovered URLs.`);
    return "";
  }

  // 3. Format strictly for our Chain of Thought generation prompt
  const formattedContext = articles.map((article, index) => {
    return `### ARTICLE ${index + 1}\nURL: ${article.url}\nTitle: ${article.headline}\nContent:\n${article.description}\n### END ARTICLE ${index + 1}`;
  }).join('\n\n');

  console.log(`[Content Source] ✅ Pipeline complete. Formatted ${articles.length} articles (${formattedContext.length} chars)`);
  return formattedContext;
}