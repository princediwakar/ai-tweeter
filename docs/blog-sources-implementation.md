# Blog Sources Implementation Plan

## Problem Statement

When creating a profile/persona, the AI discovers sources but finds individual article URLs instead of blog homepage or RSS feed URLs. This causes content fetching to fail or return irrelevant content.

**Example:**
- User prompt: "product strategy and monetization"
- AI finds: `https://productschool.com/blog/product-strategy/monetization-strategy` (individual article)
- Should find: `https://productschool.com/blog` or `https://productschool.com/feed` (blog homepage/RSS)

## Solution Overview

1. **Curated blog sources** - Global table with vetted blog homepages + RSS feeds
2. **Better matching** - Match by category OR topics
3. **Hybrid content fetching** - Use RSS when fresh, fallback to Tavily for recent articles

---

## Phase 1: Database Schema

### New Table: `blog_sources`

```sql
CREATE TABLE blog_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  category TEXT NOT NULL,
  topics TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Seed Data

Source: `feeds.csv` (13 categories × ~9 feeds = ~117 sources)

| Category | Topics (pre-defined) |
|----------|-------------------|
| Product | product-growth, product-management, roadmaps |
| Engineering | engineering, system-design, architecture |
| Business | monetization, revenue, unit-economics, pricing |
| Finance | investing, fundraising, valuation |
| Marketing | content-marketing, growth-marketing |
| Sales | sales, customer-acquisition, b2b-sales |
| AI Tools | ai, llm, openai, chatgpt |
| Productivity | productivity, time-management |
| Personal Finance | personal-finance, budgeting |
| Health | health, wellness |
| Angel Investing | vc, startup-funding |
| Indian Startup News | india-startups, indian-market |
| Indian Stock Market | indian-markets, stocks |

---

## Phase 2: Source Discovery Service

### File: `lib/services/sourceDiscoverer.ts`

**Changes:**

1. **Match curated sources first** - Query `blog_sources` by category OR topics
2. **Smart fallback** - Tavily search for blog homepages/RSS feeds (not individual articles)

```typescript
async discoverSources(persona: PersonaDesignResult): string[] {
  // 1. Match curated blog_sources by category OR topics
  const curated = await blogSourceService.findSources({
    topics: persona.topics,
  });

  if (curated.length >= 3) {
    return curated.map(s => s.url);
  }

  // 2. Fallback: Smart Tavily discovery
  return await this.smartDiscoverFallback(persona.topics);
}

async smartDiscoverFallback(topics: string[]): string[] {
  // Query: "{topic} blog rss feed" OR "{topic} industry insights"
  // Filter: Exclude individual article paths (/article/, /post/, /blog/2024/)
  // Include: Homepage patterns (/blog$, /insights$, /feed$)
}
```

---

## Phase 3: Content Pipeline

### File: `lib/contentSource/ContentPipeline.ts`

**Hybrid approach:** Use RSS when fresh, fallback to Tavily for recent content

```typescript
async fetchContentForPersona(persona: Persona): Promise<ContentItem[]> {
  // 1. Get sources: persona.rss_sources OR match blog_sources by category
  const sources = await resolveSources(persona);

  const articles: ContentItem[] = [];

  for (const source of sources) {
    // 2a. Try RSS first
    const rssArticles = await this.fetchFromRSS(source.feed_url);

    if (rssArticles.length > 0 && isRecent(rssArticles[0].publishedAt, '7d')) {
      articles.push(...rssArticles);
      continue;
    }

    // 2b. Fallback: Use Jina on blog homepage to extract recent articles
    const homepageArticles = await this.extractWithJina(source.url);
    articles.push(...homepageArticles);

    // 2c. If still no recent content: Tavily search for recent articles
    if (articles.length < 3) {
      const recentArticles = await this.searchRecentArticles(source.url, persona.topics);
      articles.push(...recentArticles);
    }
  }

  // 3. Extract full content with Jina
  // 4. Format for prompt
  return articles;
}
```

---

## Phase 4: Data Seeding

### File: `scripts/seed-blog-sources.ts`

Seed from `feeds.csv`:

1. Parse CSV (first row = categories, subsequent rows = feeds)
2. For each feed URL:
   - Extract domain as `url`
   - Append `/feed` or `/rss` as `feed_url`
   - Map category from column header
   - Pre-define topics based on category

---

## Phase 5: API Endpoints

### New Files: `app/api/blog-sources/route.ts`

CRUD operations:

- `GET /api/blog-sources` - List all sources
- `GET /api/blog-sources?category=Product` - Filter by category
- `POST /api/blog-sources` - Add new source (admin)
- `PATCH /api/blog-sources/[id]` - Update source (admin)
- `DELETE /api/blog-sources/[id]` - Delete source (admin)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `scripts/seed-blog-sources.ts` | Create | Seed from feeds.csv |
| `lib/blogSourceService.ts` | Create | CRUD operations + matching |
| `app/api/blog-sources/route.ts` | Create | Admin CRUD API |
| `lib/services/sourceDiscoverer.ts` | Modify | Use curated + smart fallback |
| `lib/contentSource/ContentPipeline.ts` | Modify | RSS → Jina → Tavily hybrid |

---

## Flow Summary

```
User writes prompt (onboarding)
     ↓
AI generates persona with topics
     ↓
sourceDiscoverer.discoverSources():
  1. Match blog_sources by category OR topics
  2. If insufficient → smart Tavily search (blog homepages only)
     ↓
Persona saved with blog homepage URLs (not articles)
     ↓
At generation time:
  contentPipeline.fetchContentForPersona():
  1. Try RSS from sources
  2. If stale → Jina on homepage
  3. If no content → Tavily for recent articles
  4. Extract with Jina
  5. Format for prompt
     ↓
AI generates post
```

---

## No UI Changes

- Prompt step stays exactly the same
- Users don't see any difference
- Only difference: **better content sources**

---

## Matching Logic (SQL)

```sql
-- Find sources matching persona topics
SELECT * FROM blog_sources
WHERE is_active = true
  AND (category = ANY($1) OR topics && $1)
LIMIT 10;
```

Where `$1` = persona.topics array