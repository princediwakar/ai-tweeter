---
# Claude Rules & Project Context

## Core Principles

1.  **Multi-Account First:** All logic (database queries, API routes, generation services) **must** be account-aware and fully isolated. Never write code that assumes a single account.
2.  **Persona-Driven Content:** Content generation is tied to specific personas defined in `lib/personas.ts`. Output must match the persona's tone, style, and structure.
3.  **Guarantee Variety:** Use topic shuffling and variation markers to ensure unique content in batches and across time.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Neon DB, Twitter API v2, DeepSeek API

### 📂 Codebase Structure

**Core Services:**
* `lib/personas.ts` - Persona definitions with account mapping (`gibbi_ai` → vocab, `princediwakar25` → business/cricket/satire)
* `lib/schedule.ts` - Generation & posting schedules
* `lib/db.ts` - Database layer (accounts, tweets, threads)
* `lib/types.ts` - TypeScript interfaces (Account, Tweet, Thread, VocabularyCard)

**Content Generation:**
* `lib/generation/` - Modular persona generators
  - `personas/base.ts` - Base generator class
  - `personas/englishVocabBuilder.ts` - Educational vocab content
  - `personas/businessStoryteller.ts` - Indian business narratives
  - `personas/cricketStoryteller.ts` - Cricket human stories
  - `personas/satirist.ts` - Data-driven satirical analysis
  - `articleEnricher.ts` - Two-step article enrichment: fetches full content + extracts Twitter handles, entities, websites
* `lib/contentSource.ts` - RSS feed aggregation & article enrichment orchestration
* `lib/generationService.ts` - Main AI orchestration
* `lib/threadGenerationService.ts` - Thread creation with shareability hooks
* `lib/imageGenerationService.ts` - Cloudinary image rendering

**Posting & Automation:**
* `lib/twitter.ts` - Twitter API integration
* `lib/instantThreadService.ts` - Thread posting with 5min intervals
* `app/api/generate/route.ts` - Content generation endpoint
* `app/api/auto-post/route.ts` - Automated posting endpoint

**Database Schema (Neon):**
* `accounts` - Multi-account credentials, personas, branding
* `tweets` - Content with threading support (thread_id, sequence, parent, source_url)
* `threads` - Thread metadata (status, progress tracking)
* **Full schema:** `docs/DATABASE_SCHEMA.md` | **Project ID:** `round-sun-88150229`

### 📰 Article Enrichment Pipeline (Satirist Persona)

The satirist persona uses a sophisticated two-step enrichment process:

**Step 1: Primary Extraction** (`lib/contentSource.ts`)
- Fetches 10 headlines from Indian business/tech RSS feeds (Inc42, Hindu Business Line, TechCrunch AI)
- Passes headlines to `articleEnricher.ts` for deep analysis

**Step 2: Secondary Enrichment** (`lib/generation/articleEnricher.ts`)
- Fetches full article content using Readability.js
- Extracts Twitter handles from article HTML (links + @mentions)
- Identifies company websites mentioned in article text
- Visits discovered company homepages to find official social handles
- Extracts entity names (companies, people) using capitalization patterns
- Returns enriched data: `{ headline, fullText, twitterHandles, websites, entities, sourceUrl }`

**Integration Flow:**
1. `contentSource.ts` → calls `enrichArticles()` with 10 headlines
2. `articleEnricher.ts` → processes 3 articles concurrently, returns enriched data
3. Formatted context passed to satirist prompt with handles, excerpts, entities
4. AI generates tweet using extracted data (prioritizes @handles for tagging)
5. `source_url` tracked in database for attribution

## Key Constraints

* **API Separation:** `/api/generate` creates content → DB. `/api/auto-post` reads DB → Twitter. Don't mix.
* **Content Generation:** Tweets saved to DB are posted as-is. No modifications during posting. Hashtags embedded during generation.
* **Pre-Commit:** Run `npm run build && npm run lint` before every commit.
* **Database Access:** Use direct `psql "$DATABASE_URL"` commands (MCP disabled to save tokens)
* **Cron Endpoints:**
  - `GET /api/generate?twitter_handle={account}` (per account)
  - `GET /api/auto-post` (all accounts)
  - Auth via `CRON_SECRET` env var