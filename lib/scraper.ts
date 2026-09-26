import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    return null;
  }
}

export async function scrapeWebsite(url: string, htmlStr?: string): Promise<{ title: string; content: string; excerpt: string; doc: JSDOM } | null> {
  try {
    const html = htmlStr || await fetchPageHtml(url);
    if (!html) return null;

    const doc = new JSDOM(html, { url });
    let title = doc.window.document.title;
    let textContent = '';
    let excerpt = '';

    const reader = new Readability(doc.window.document.cloneNode(true) as Document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 100) {
      textContent = article.textContent;
      title = article.title || title;
      excerpt = article.excerpt || '';
    } else {
      const elementsToRemove = doc.window.document.querySelectorAll('script, style, noscript, svg, nav, footer');
      elementsToRemove.forEach((el) => el.remove());
      textContent = doc.window.document.body.textContent || '';
      textContent = textContent.replace(/\s+/g, ' ').trim();
    }

    if (!textContent || textContent.length < 50) return null;

    return { title, content: textContent, excerpt, doc };
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
}

export async function scrapeWebsiteDeep(url: string): Promise<{ title: string; content: string; excerpt: string } | null> {
  const mainPage = await scrapeWebsite(url);
  if (!mainPage) return null;

  let combinedContent = `--- MAIN PAGE (${url}) ---\n${mainPage.content}\n\n`;
  const baseUrl = new URL(url);

  // Extract internal links from the main page
  const links = Array.from(mainPage.doc.window.document.querySelectorAll('a[href]'));
  const internalUrls = new Set<string>();

  for (const link of links) {
    const href = link.getAttribute('href');
    if (!href) continue;
    try {
      const parsedUrl = new URL(href, baseUrl.origin);
      // Only keep HTTP/HTTPS internal links that aren't exactly the homepage
      if (parsedUrl.origin === baseUrl.origin && parsedUrl.pathname !== '/' && parsedUrl.pathname !== baseUrl.pathname) {
        internalUrls.add(parsedUrl.href);
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  }

  // Prioritize high-value pages
  const highValueKeywords = ['about', 'feature', 'product', 'service', 'pricing', 'use-case'];
  let sortedLinks = Array.from(internalUrls).sort((a, b) => {
    const aMatch = highValueKeywords.some(k => a.toLowerCase().includes(k)) ? 1 : 0;
    const bMatch = highValueKeywords.some(k => b.toLowerCase().includes(k)) ? 1 : 0;
    return bMatch - aMatch;
  });

  // Take top 2 high-value links
  const linksToScrape = sortedLinks.slice(0, 2);

  // Scrape them in parallel
  if (linksToScrape.length > 0) {
    const subPages = await Promise.all(linksToScrape.map(l => scrapeWebsite(l)));
    
    for (let i = 0; i < subPages.length; i++) {
      const page = subPages[i];
      if (page && page.content) {
        combinedContent += `--- SUBPAGE (${linksToScrape[i]}) ---\n${page.content}\n\n`;
      }
    }
  }

  // Limit total characters so we don't blow up the LLM token limit
  const MAX_CHARS = 25000; 
  if (combinedContent.length > MAX_CHARS) {
    combinedContent = combinedContent.substring(0, MAX_CHARS) + '\n...[TRUNCATED]';
  }

  return {
    title: mainPage.title,
    content: combinedContent,
    excerpt: mainPage.excerpt
  };
}
