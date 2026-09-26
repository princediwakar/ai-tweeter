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

    // 1. Extract metadata (crucial for SPAs that render via JS and have empty bodies)
    const metaDescription = doc.window.document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ogDescription = doc.window.document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const ogTitle = doc.window.document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const twitterDescription = doc.window.document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
    
    let metaContext = '';
    if (metaDescription || ogDescription) {
      metaContext = `[META DESCRIPTION]: ${metaDescription || ogDescription || twitterDescription}\n`;
    }
    if (ogTitle && !title) {
      title = ogTitle;
    }

    // 2. Extract main content using Readability
    const reader = new Readability(doc.window.document.cloneNode(true) as Document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 100) {
      textContent = article.textContent;
      title = article.title || title;
      excerpt = article.excerpt || '';
    } else {
      // Fallback: manually strip bad elements
      const elementsToRemove = doc.window.document.querySelectorAll('script, style, noscript, svg, nav, footer, header, iframe, button, [role="navigation"]');
      elementsToRemove.forEach((el) => el.remove());
      textContent = doc.window.document.body.textContent || '';
      textContent = textContent.replace(/\s+/g, ' ').trim();
    }

    // Combine metadata with text content
    const finalContent = `${metaContext}\n${textContent}`.trim();

    if (!finalContent || finalContent.length < 20) return null;

    return { title, content: finalContent, excerpt: excerpt || metaDescription || ogDescription, doc };
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
}

export async function scrapeWebsiteDeep(url: string): Promise<{ title: string; content: string; excerpt: string } | null> {
  // 1. Fetch main page the standard way to extract internal links
  const mainPage = await scrapeWebsite(url);
  if (!mainPage) return null;

  let combinedContent = `--- MAIN PAGE (${url}) ---\n`;
  const baseUrl = new URL(url);

  // 2. Extract internal links from the main page
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

  // 3. Prioritize high-value pages
  const highValueKeywords = ['about', 'blog', 'article', 'manifesto', 'mission', 'vision', 'product', 'feature', 'how-it-works', 'pricing', 'faq'];
  let sortedLinks = Array.from(internalUrls).sort((a, b) => {
    const aMatch = highValueKeywords.filter(k => a.toLowerCase().includes(k)).length;
    const bMatch = highValueKeywords.filter(k => b.toLowerCase().includes(k)).length;
    return bMatch - aMatch;
  });

  // Take top 4 high-value links
  const linksToScrape = sortedLinks.slice(0, 4);

  // 4. Scrape the Main Page AND Subpages using Jina for incredibly deep, semantic Markdown
  const urlsToJina = [url, ...linksToScrape];
  
  console.log(`[Scraper] 🕸️ Deep scraping ${urlsToJina.length} pages via Jina for ${url}...`);
  
  const jinaPromises = urlsToJina.map(async (link) => {
    try {
      const response = await fetch(`https://r.jina.ai/${link}`, {
        headers: { 'X-Return-Format': 'markdown' }
      });
      if (response.ok) {
         return await response.text();
      }
    } catch (error) {
      console.warn(`[Scraper] ⚠️ Failed to fetch Jina Markdown for ${link}`);
    }
    return null;
  });

  const jinaResults = await Promise.all(jinaPromises);

  // 5. Compile the enriched Markdown content
  if (jinaResults[0]) {
    combinedContent += jinaResults[0] + '\n\n';
  } else {
    combinedContent += mainPage.content + '\n\n';
  }

  for (let i = 0; i < linksToScrape.length; i++) {
    const markdown = jinaResults[i + 1];
    if (markdown) {
      combinedContent += `--- SUBPAGE (${linksToScrape[i]}) ---\n${markdown}\n\n`;
    }
  }

  // Limit total characters so we don't blow up the LLM token limit
  const MAX_CHARS = 80000; // Increased max chars since Markdown is dense and LLM contexts are larger
  if (combinedContent.length > MAX_CHARS) {
    combinedContent = combinedContent.substring(0, MAX_CHARS) + '\n...[TRUNCATED]';
  }

  return {
    title: mainPage.title,
    content: combinedContent,
    excerpt: mainPage.excerpt
  };
}
