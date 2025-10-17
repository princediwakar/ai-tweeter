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
  - `articleEnricher.ts` - Two-step article enrichment: fetches full content + extracts entities
* `lib/contentSource.ts` - RSS feed aggregation & article enrichment orchestration
* `lib/generationService.ts` - Main AI orchestration
* `lib/threadGenerationService.ts` - Thread creation with shareability hooks
* `lib/services/imageGenerationService.ts` - Cloudinary image rendering

**Posting & Automation:**
* `lib/twitter.ts` - Twitter API integration
* `lib/instantThreadService.ts` - Thread posting with 5min intervals
* `app/api/generate/route.ts` - Content generation endpoint
* `app/api/auto-post/route.ts` - Automated posting endpoint

**Engagement System (Multi-Account):**
* `lib/engagement/personas.ts` - Engagement AI personas (the_catalyst, gandhi, etc.)
* `lib/engagement/activityScout.ts` - Finds recent tweets from target accounts
* `lib/engagement/selector.ts` - Selects best tweets to engage with
* `config/engagement-targets.json` - Per-account target lists and rules
* `app/api/engage/route.ts` - Engagement endpoint with rate limiting
* **Setup guide:** `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md`

**Database Schema (Neon):**
* `accounts` - Multi-account credentials, personas, branding
* `tweets` - Content with threading support (thread_id, sequence, parent, source_url)
* `threads` - Thread metadata (status, progress tracking)
* `engagement_log` - Engagement history with rate limiting (account_id, target, reply)
* **Full schema:** `docs/DATABASE_SCHEMA.md` | **Project ID:** `round-sun-88150229`

### 📰 Article Enrichment Pipeline (Satirist Persona)

The satirist persona uses a sophisticated two-step enrichment process:

**Step 1: Primary Extraction** (`lib/contentSource.ts`)
- Fetches 10 headlines from Indian business/tech RSS feeds (Inc42, Hindu Business Line, TechCrunch AI)
- Passes headlines to `articleEnricher.ts` for deep analysis

**Step 2: Secondary Enrichment** (`lib/generation/articleEnricher.ts`)
- Fetches full article content using Readability.js
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
  - `GET /api/generate?twitter_handle={account}` - Content generation per account
  - `GET /api/auto-post` - Post ready tweets (all accounts)
  - `GET /api/engage?twitter_handle={account}` - Engagement per account
  - Auth via `CRON_SECRET` env var

### 🤝 Multi-Account Engagement System

Each account can have its own engagement strategy:

**Architecture:**
1. **Engagement Personas** - Different AI voices (Catalyst for startups, Gandhi for wisdom)
2. **Target Lists** - Account-specific lists of who to engage with
3. **Schedules** - Per-account timing (IST-based)
4. **Rate Limits** - Daily caps and cooldown periods

**Example Accounts:**
- `@princediwakar25` → Uses "the_catalyst" persona → Engages with startup founders (3/day)
- `@Gandhi_Wisom_` → Uses "gandhi" persona → Engages with social leaders (4/day)

**Adding New Accounts:**
See `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md` for complete setup guide