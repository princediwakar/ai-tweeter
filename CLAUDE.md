---
# Claude Rules & Project Context

## Core Principles

1.  **Multi-Account First:** All logic (database queries, API routes, generation services) **must** be account-aware and fully isolated. Never write code that assumes a single account.
2.  **Persona-Driven Content:** Content generation is tied to specific personas defined in `lib/personas.ts`. Output must match the persona's tone, style, and structure.
3.  **Guarantee Variety:** Use topic shuffling and variation markers to ensure unique content in batches and across time.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Neon DB, Twitter API v2, DeepSeek API

---

## 🎯 Current Strategy: 60-Day Pattern Spotter Focus

**@princediwakar25 Account Status:**
- **Current Followers:** 96
- **Strategy:** Pattern Spotter only (5 tweets/week)
- **Goal:** Reach 200-300 followers in 60 days via content + high engagement
- **Rationale:** Master one voice with lane variety > juggling multiple personas
- **Review Date:** After 60 days, reassess and potentially reintroduce Satirist as weekly "Data Bomb"

**API Limits (DeepSeek):**
- **Content Generation (Write):** 500 writes/month (~16/day)
- **Engagement (Read):** 100 reads/month (~3/day)
- **Implication:** Pattern Spotter's simpler pipeline (no article enrichment) conserves API budget vs Satirist

### 📂 Codebase Structure

**Core Services:**
* `lib/personas.ts` - Persona definitions with account mapping:
  - `gibbi_ai` → English Vocab Builder
  - `princediwakar25` → **Pattern Spotter (active)**, Satirist (paused), Business/Cricket Storytellers
* `lib/schedule.ts` - Generation & posting schedules (IST-based, timezone-aware)
* `lib/db.ts` - Database layer (accounts, tweets, threads)
* `lib/types.ts` - TypeScript interfaces (Account, Tweet, Thread, VocabularyCard)

**Content Generation:**
* `lib/generation/` - Modular persona generators
  - `personas/base.ts` - Base generator class
  - `personas/patternSpotter.ts` - **PRIMARY:** 3 rotating lanes (Bullshit Detector, Tactical Playbook, Business Model Archaeologist)
  - `personas/patternSpotter/laneSelector.ts` - Lane rotation logic to avoid repetition
  - `personas/englishVocabBuilder.ts` - Educational vocab content (Gibbi account)
  - `personas/satirist.ts` - Data-driven satirical analysis (paused, may return as weekly feature)
  - `personas/businessStoryteller.ts` - Indian business narratives (threads, inactive)
  - `personas/cricketStoryteller.ts` - Cricket human stories (threads, inactive)
  - `articleEnricher.ts` - Two-step article enrichment (used by Satirist when active)
* `lib/contentSource/` - **Per-account context fetching** (not group search)
  - `context/patternSpotter.ts` - Fetches 20 headlines from RSS + filters financial noise + deduplicates by source URL
  - `context/satirist.ts` - Fetches + enriches articles with full text + Twitter handles
  - `fetchers/` - RSS, Reddit, Twitter content fetchers
  - `formatters/` - Persona-specific context formatting
* `lib/generationService.ts` - Main AI orchestration
* `lib/threadGenerationService.ts` - Thread creation with shareability hooks
* `lib/services/imageGenerationService.ts` - Cloudinary image rendering

**Posting & Automation:**
* `lib/twitter.ts` - Twitter API integration
* `lib/instantThreadService.ts` - Thread posting with 5min intervals
* `app/api/generate/route.ts` - Content generation endpoint
* `app/api/auto-post/route.ts` - Automated posting endpoint

**Engagement System (Multi-Account):**
* `lib/engagement/personas.ts` - Engagement AI personas:
  - **the_catalyst** - Used by @princediwakar25, adapts tone to spark conversation
  - **gandhi** - Used by @Gandhi_Wisom_, shares wisdom on social/political topics
* `lib/engagement/activityScout.ts` - **Per-account** recent tweet fetching (not group search)
* `lib/engagement/selector.ts` - Selects best tweets to engage with
* `config/engagement-targets.json` - Per-account target lists:
  - **@princediwakar25:** 11 targets (10-50K follower range, Indian startup ecosystem), 5 engagements/day
  - **@Gandhi_Wisom_:** 1 target, 3 engagements/day
* `app/api/engage/route.ts` - Engagement endpoint with rate limiting
* **Setup guide:** `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md`

**Database Schema (Neon):**
* `accounts` - Multi-account credentials, personas, branding
* `tweets` - Content with threading support (thread_id, sequence, parent, source_url)
* `threads` - Thread metadata (status, progress tracking)
* `engagement_log` - Engagement history with rate limiting (account_id, target, reply)
* **Full schema:** `docs/DATABASE_SCHEMA.md` | **Project ID:** `round-sun-88150229`

### 🔍 Pattern Spotter Pipeline (Active)

**Current primary persona for @princediwakar25:**

**Content Fetching** (`lib/contentSource/context/patternSpotter.ts`):
1. Fetches 20 headlines from 3 RSS feeds (Economic Times, Inc42, YourStory)
2. Filters out financial-only headlines (revenue/funding noise)
3. Deduplicates by source URL (prevents repeating same articles)
4. Returns structured context with source metadata

**Lane Selection** (`lib/generation/personas/patternSpotter/laneSelector.ts`):
- **Bullshit Detector** (40% weight): Call out hype that doesn't stack up
- **Tactical Playbook** (30% weight): Break down repeatable moves worth stealing
- **Business Model Archaeologist** (10% weight): Reveal real money trails
- Rotation prevents repetition (tracks last 2 lanes used)

**Generation** (`lib/generation/personas/patternSpotter.ts`):
- 80-120 char tweets (sweet spot for engagement at small follower count)
- Recent patterns passed to avoid company/structure repetition
- Complete standalone tweets (no threads needed)
- Focus: Save rate + reply rate > likes

---

### 📰 Article Enrichment Pipeline (Satirist - Currently Paused)

**Note:** Satirist paused for 60-day Pattern Spotter focus. May return as weekly "Data Bomb."

The satirist persona uses a sophisticated two-step enrichment process (more API-intensive):

**Step 1: Primary Extraction** (`lib/contentSource/context/satirist.ts`)
- Fetches 8 headlines from Indian business/tech RSS feeds
- Passes headlines to `articleEnricher.ts` for deep analysis

**Step 2: Secondary Enrichment** (`lib/generation/articleEnricher.ts`)
- Fetches full article content using Readability.js
- Visits discovered company homepages to find official social handles
- Extracts entity names (companies, people) using capitalization patterns
- Returns enriched data: `{ headline, fullText, twitterHandles, websites, entities, sourceUrl }`

**Reason for Pause:** Enrichment pipeline has more failure points (paywalls, JS-heavy sites, timeouts) and uses more API calls. Pattern Spotter is more reliable for consistent 5x/week output.

## Key Constraints

* **API Separation:** `/api/generate` creates content → DB. `/api/auto-post` reads DB → Twitter. Don't mix.
* **Content Generation:** Tweets saved to DB are posted as-is. No modifications during posting. Hashtags embedded during generation.
* **Pre-Commit:** Run `npm run build && npm run lint` before every commit.
* **Database Access:** Use direct `psql "$DATABASE_URL"` commands (MCP disabled to save tokens)
* **API Budget Management:**
  - 500 writes/month for content generation (~16/day)
  - 100 reads/month for engagement (~3/day)
  - Pattern Spotter conserves budget vs Satirist (no enrichment API calls)
* **Cron Endpoints:**
  - `GET /api/generate?twitter_handle={account}` - Content generation per account
  - `GET /api/auto-post` - Post ready tweets (all accounts)
  - `GET /api/engage?twitter_handle={account}` - Engagement per account
  - Auth via `CRON_SECRET` env var

### 📅 Posting Schedule (@princediwakar25)

**Pattern Spotter 5x/week (IST):**
- **Monday 9am** - Bullshit Detector bias
- **Tuesday 1pm** - Tactical Playbook bias
- **Wednesday 9am** - Business Model bias
- **Thursday 1pm** - Tactical/Detector mix
- **Friday 9am** - Weekly wildcard

**Engagement 7x/day (IST):**
- 9am, 10am, 11am, 1pm, 7pm, 8pm, 9pm

**LinkedIn Posting:** 8x/week (mornings + afternoons, Pattern Spotter + Satirist mix)

### 🤝 Multi-Account Engagement System

Each account can have its own engagement strategy:

**Architecture:**
1. **Engagement Personas** - Different AI voices (Catalyst for startups, Gandhi for wisdom)
2. **Target Lists** - Account-specific lists of who to engage with
3. **Schedules** - Per-account timing (IST-based)
4. **Rate Limits** - Daily caps and cooldown periods

**Active Accounts:**
- **@princediwakar25** (96 followers, growth focus):
  - Persona: "the_catalyst"
  - Targets: 11 accounts (10-50K followers: founders, VCs, startup media)
  - Rate: 5 engagements/day, 7 time slots (9am-9pm IST)
  - Strategy: High-value replies to mid-tier accounts who actually engage back
- **@Gandhi_Wisom_** (engagement-only account):
  - Persona: "gandhi"
  - Targets: 1 account (@IndianTechGuide)
  - Rate: 3 engagements/day
  - Strategy: Thoughtful wisdom on social/political discourse

**Adding New Accounts:**
See `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md` for complete setup guide