# AI Tweeter Content System Redesign Plan

## Problem Statement

Current system generates content that feels like borrowed wisdom rather than authentic insight. The content rephrases headlines from generic sources instead of curating domain-specific content for specific professional audiences.

## Vision: Automated Domain Content System

A fully automated content system where:
- A Product Manager gets content about product news, tool launches, UX patterns
- A Data Scientist gets content about ML papers, AI research, model releases
- A Marketing Pro gets content about marketing strategies, growth tactics

No personal journey content - just "here's what's happening in my domain."

---

## Architecture

```
User Input (Role + Topics + Optional Custom RSS)
         ↓
Persona Designer (AI)
  - Detects user type → source_type
  - Recommends domain topics
  - Selects curated RSS from blog_sources
         ↓
Content Pipeline
  - Fetch from rss_sources OR blog_sources(topics)
  - Process: RSS → Jina/Tavily → articles
         ↓
Content Generation
  - Prompt: "Curate + Take" - filter what's worth attention
  - Output: Domain news with authentic perspective
```

---

## Database Schema Changes

### blog_sources table

Add `source_type` column:

```sql
ALTER TABLE blog_sources ADD COLUMN source_type TEXT 
  DEFAULT 'general' 
  CHECK (source_type IN (
    'general', 'technical_ai', 'product', 'engineering', 
    'business', 'marketing', 'finance', 'sales', 'indie_hacker'
  ));
```

### Seed curated sources by source_type

| source_type | Curated RSS Feeds |
|-------------|------------------|
| `technical_ai` | ArXiv (cs.AI), HuggingFace Blog, Papers With Code, Kaggle Blog |
| `product` | Product Hunt (RSS), Lenny's Newsletter, Stratechery |
| `engineering` | Pragmatic Engineer, Martin Fowler, Hacker News (RSS), Lead Dev |
| `business` | YC Blog, a16z, Paul Graham, TechCrunch |
| `marketing` | Seth's Blog, HubSpot, Neil Patel, Marketing Brew |
| `finance` | Economist, Financial Times, CNBC, Bloomberg |
| `sales` | Gong Blog, Sales Hacker, Salesforce Blog |
| `indie_hacker` | Indie Hacker, WIP.co, Product Hunt |

---

## Phase 1: Database

### Changes
- Add `source_type` column to `blog_sources` table
- Update existing sources with appropriate `source_type`
- Seed new domain-specific RSS feeds

### Files to Modify
- Database migration: new SQL file
- Seed script: update `feeds.csv` or create new seed script

---

## Phase 2: Persona Designer

**File:** `lib/services/personaDesigner.ts`

### Changes
- Enhance system prompt to detect user type from prompt
- Recommend domain-specific topics based on type
- Select curated RSS sources from blog_sources by source_type
- Allow user to add custom RSS URLs

### Prompt Enhancement

```
USER TYPE MAPPING (detect from prompt):
- "data scientist", "ML engineer", "AI researcher" → source_type: technical_ai
- "product manager", "PM" → source_type: product
- "developer", "engineer", "tech lead" → source_type: engineering
- "founder", "CEO", "startup" → source_type: business
- "marketer", "growth" → source_type: marketing
- "finance", "investor" → source_type: finance
- "sales", "BD" → source_type: sales
- "indie", "solo" → source_type: indie_hacker

TOPIC RECOMMENDATIONS per type:
- technical_ai: [machine-learning, ai-research, papers, kaggle]
- product: [product-management, tools, user-research, roadmaps]
- marketing: [content-marketing, growth-hacking, seo, brand-building]
- sales: [b2b-sales, sales-process, prospecting, closing]
- finance: [startup-funding, valuation, unit-economics, investing]
- business: [startup-lessons, strategy, growth, hiring]
- engineering: [system-design, dev-tools, architecture]
- indie_hacker: [build-in-public, indie-tools, mvp]

SOURCE SELECTION:
1. Query blog_sources WHERE source_type = detected_type
2. Add top 5-10 curated RSS URLs to rss_sources
3. Allow user to add custom RSS URLs
```

---

## Phase 3: BlogSourceService

**File:** `lib/blogSourceService.ts`

### Changes
- Add `findSourcesBySourceType()` function
- Optionally: add `findSourcesByTopicsAndType()` for hybrid matching

### New Function

```typescript
export async function findSourcesBySourceType(
  sourceType: string, 
  limit: number = 10
): Promise<BlogSource[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM blog_sources
      WHERE source_type = ${sourceType} AND is_active = true
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    return result.rows.map(rowToBlogSource);
  } catch (error) {
    console.error('[BlogSource] Error finding by source_type:', error);
    return [];
  }
}
```

---

## Phase 4: Content Pipeline (Optional Enhancement)

**File:** `lib/contentSource/ContentPipeline.ts`

### Changes (Optional)
- If persona has `user_type` in config, boost sources matching that source_type
- Current topic-based matching is already functional

---

## Phase 5: Content Generation

**File:** `lib/generationProcessing.ts`

### Changes
- Enhance prompt to emphasize "curate + take" instead of summarize
- Add explicit filter rationale in output

### Current Prompt (Terrible)
```
"Your goal is to write a social media post reacting to recent industry news"
"Do not summarize the article; give your sharpest take on it"
```

### Enhanced Prompt
```
You are a domain curator. Your audience looks to you to filter 
what matters in [DOMAIN].

CONTEXT: Recent articles from your sources
YOUR JOB:
1. Scan articles - identify what's genuinely worth attention
2. Pick 1-2 that would interest your audience
3. Don't summarize - give your TAKE on why it matters
4. Filter signal from noise

OUTPUT:
{
  "selected_url": "article URL",
  "why_matters": "1-2 sentence filter rationale",
  "content": "Your post - should feel like you're sharing something worth attention"
}
```

---

## User Journey After Changes

| User Type | Creates Persona With | Gets Sources From | Content Focus |
|-----------|---------------------|-------------------|----------------|
| Data Scientist | topics: [AI, ML, papers] | technical_ai sources | AI research, papers |
| Product Manager | topics: [product, tools, startups] | product + business sources | Product insights, tools |
| Marketing Pro | topics: [marketing, growth] | marketing sources | Marketing strategies |
| Sales Pro | topics: [sales, b2b] | sales sources | Sales tips |
| Finance Pro | topics: [investing, markets] | finance sources | Market insights |
| Engineering Manager | topics: [dev-tools, architecture] | engineering sources | Tech patterns |
| Founder | topics: [startups, building] | business sources | Startup ecosystem |
| Indie Hacker | topics: [tools, builds] | indie_hacker sources | Indie updates |

---

## Implementation Priority

| Priority | User Types | Reason |
|----------|------------|--------|
| 1 | Product, Marketing, Business | Largest SaaS market |
| 2 | Technical AI, Engineering | High engagement in tech |
| 3 | Finance, Sales | Niche but valuable |
| 4 | Indie Hacker | Growing community |

---

## Open Questions

1. **User type selection:** Dropdown selection or infer from topics?
2. **Content style:** Curator, Commentator, or Analyst voice?
3. **RSS validation:** How to ensure added RSS feeds return valid XML?

---

## Notes

- All content is automated - no personal journey, opinions on own work
- Focus on "what's happening in my domain" not "what I did"
- Sources should be authentic to the profession, not generic news