// scripts/seed-blog-sources.ts
// Seed blog sources from feeds.csv

import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface SourceInput {
  name: string;
  url: string;
  feed_url: string;
  category: string;
  topics: string[];
}

const CATEGORY_TOPICS: Record<string, string[]> = {
  'Product': ['product-growth', 'product-management', 'roadmaps', 'product-strategy'],
  'Engineering': ['engineering', 'system-design', 'architecture', 'software-development'],
  'Business': ['monetization', 'revenue', 'unit-economics', 'pricing', 'business-model'],
  'Finance': ['investing', 'fundraising', 'valuation', 'financial-markets'],
  'Marketing': ['content-marketing', 'growth-marketing', 'digital-marketing'],
  'Sales': ['sales', 'customer-acquisition', 'b2b-sales', 'sales-strategy'],
  'AI Tools': ['ai', 'llm', 'openai', 'chatgpt', 'machine-learning'],
  'Productivity': ['productivity', 'time-management', 'efficiency'],
  'Personal Finance': ['personal-finance', 'budgeting', 'saving', 'investing'],
  'Health': ['health', 'wellness', 'healthcare'],
  'Angel Investing': ['vc', 'startup-funding', 'angel-investing'],
  'Indian Startup News': ['india-startups', 'indian-market', 'startup-ecosystem'],
  'Indian Stock Market': ['indian-markets', 'stocks', 'investment'],
};

function extractDomain(feedUrl: string): string {
  try {
    const url = new URL(feedUrl);
    return url.origin;
  } catch {
    return '';
  }
}

function extractNameFromUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.replace(/^www\./, '');
    return hostname
      .split('.')
      .filter((part) => part !== 'com' && part !== 'io' && part !== 'org' && part !== 'net')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Unknown';
  }
}

function guessBlogUrl(feedUrl: string): string {
  try {
    const url = new URL(feedUrl);
    const pathname = url.pathname.replace(/\/(feed|rss|atom)(\.xml)?$/i, '');
    return `${url.origin}${pathname}` || url.origin;
  } catch {
    return feedUrl;
  }
}

function parseCsvToSources(csvPath: string): SourceInput[] {
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV must have at least headers and one row');
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const sources: SourceInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());

    for (let j = 0; j < headers.length; j++) {
      const category = headers[j];
      const feedUrl = values[j];

      if (!feedUrl || !category) continue;

      const blogUrl = guessBlogUrl(feedUrl);
      const name = extractNameFromUrl(feedUrl);
      const topics = CATEGORY_TOPICS[category] || [];

      sources.push({
        name,
        url: blogUrl,
        feed_url: feedUrl,
        category,
        topics,
      });
    }
  }

  return sources;
}

async function seedBlogSources() {
  console.log('[Seed] Starting blog sources seeding...');

  const csvPath = resolve(process.cwd(), 'feeds.csv');
  console.log(`[Seed] Reading from: ${csvPath}`);

  const sources = parseCsvToSources(csvPath);
  console.log(`[Seed] Parsed ${sources.length} sources from CSV`);

  // Clear existing sources first
  console.log('[Seed] Clearing existing sources...');
  await sql`DELETE FROM blog_sources`;

  console.log('[Seed] Inserting new sources...');
  let inserted = 0;

  for (const source of sources) {
    try {
      const topicsJson = JSON.stringify(source.topics);
      await sql`
        INSERT INTO blog_sources (name, url, feed_url, category, topics)
        VALUES (${source.name}, ${source.url}, ${source.feed_url}, ${source.category}, ${topicsJson}::text[])
      `;
      inserted++;
    } catch (error) {
      console.warn(`[Seed] Failed to insert ${source.name}:`, error);
    }
  }

  console.log(`[Seed] Successfully inserted ${inserted}/${sources.length} sources`);

  // Verify count
  const result = await sql`SELECT COUNT(*) as count FROM blog_sources WHERE is_active = true`;
  console.log(`[Seed] Total active sources: ${result.rows[0].count}`);

  console.log('[Seed] Done!');
}

seedBlogSources()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[Seed] Fatal error:', error);
    process.exit(1);
  });