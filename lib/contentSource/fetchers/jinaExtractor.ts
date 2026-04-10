// lib/contentSource/fetchers/jinaExtractor.ts

import { HeadlineWithSource } from '../types';

/**
 * Extracts clean Markdown from a list of URLs using Jina's free Reader API.
 */
export async function extractWithJina(urls: string[]): Promise<HeadlineWithSource[]> {
  if (!urls || urls.length === 0) return [];

  console.log(`📰 Extracting full text from ${urls.length} URLs using Jina AI...`);

  const articles: HeadlineWithSource[] = [];

  // Fetch in parallel for speed
  const fetchPromises = urls.map(async (url) => {
    try {
      // Jina's magic endpoint. 
      // You can add an API key in the headers later if you hit heavy production volume.
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          // Optional: Tell Jina you only want the main content, not the nav bars
          'X-Return-Format': 'markdown',
          'X-Target-Selector': 'main, article, .content' 
        }
      });

      if (!response.ok) throw new Error(`Jina responded with ${response.status}`);

      const markdownText = await response.text();

      // Extract the title. Jina usually puts the title as the first H1 (# Title)
      const titleMatch = markdownText.match(/^#\s+(.*)/m);
      const title = titleMatch ? titleMatch[1].trim() : url; // Fallback to URL if no title found

      return {
        headline: title,
        url: url,
        description: markdownText // The entire article in clean Markdown
      };
    } catch (error) {
      console.warn(`[Content Source] ⚠️ Jina failed to extract ${url}`);
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);
  
  // Filter out any that failed
  for (const res of results) {
    if (res) articles.push(res);
  }

  return articles;
}