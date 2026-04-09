# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Tweeter is a multi-account social media automation platform for brand building and becoming a top voice on Twitter/LinkedIn. Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Neon PostgreSQL.

The system manages multiple social media accounts, each with distinct **Voices** (also called AI Profiles or Personas). **All Voices are database-driven** - no hardcoded Voices in code. Each Voice has configurable DNA stored in the `personas` table's JSONB `config` column.

Built for Vercel deployment with cron jobs for automation.

## Terminology

| Term | Description |
|------|-------------|
| **Voice** | The primary term - an AI persona that generates content for a specific account |
| **AI Profile** | Synonym for Voice - used in some UI contexts |
| **Persona** | Technical/database term - stored in `personas` table |
| **Connected Account** | A Twitter or LinkedIn account connected to the system |

These terms are interchangeable. When writing new code or UI, prefer **Voice** as the primary term.

## Development Commands

```bash
npm run dev      # Development server with Turbopack
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

No dedicated test suite. Linting uses Next.js core web vitals and TypeScript rules.

## Architecture

### Core Components

#### 1. Connected Accounts (`lib/connectedAccounts.ts`, `lib/db.ts`)
- Stores Twitter/LinkedIn API credentials (encrypted via Neon)
- Each account has a `personas` JSONB array listing Voice keys allowed to post
- Each account has a `branding` JSONB object for account-specific styling
- Supports OAuth 2.0 and legacy API keys
- Foreign key to `users` table
- Cloudinary config per account for image generation

#### 2. Voices/AI Profiles/Personas (`lib/personas.ts`, `lib/personaService.ts`, `lib/generation/personas/databasePersona.ts`)
- **DB-driven** - loaded from `personas` table, no hardcoded list
- **IMPORTANT**: All content generation MUST use these Voices - nothing is generated outside of Voice context
- Configurable DNA stored in `config` JSONB column:
  - `identity_context`: First-person background/perspective
  - `voice_dna`: Writing style instructions
  - `source_logic`: Content source instructions (RSS, Reddit, etc.)
  - `anti_patterns`: What to avoid
  - `structural_archetypes`: Template structures with examples
  - `validation_checklist`: Quality criteria
  - `system_prompt`: Additional generation instructions
  - `image_probability`: Chance of generating image
  - `headlines_to_fetch`: Number of RSS headlines to fetch
  - `supports_threads`: Boolean for thread support
- Each Voice has `key` (unique identifier), `rss_sources` JSONB, `topics`, `tone`, `min_length`, `max_length`
- Foreign key to `connected_accounts` via `connected_account_id`
- Can be linked to `account_schedules` via `persona_id`

#### 3. Content Generation Flow (ALL generation uses Voices)
1. User triggers generation (via dashboard composer, cron, or API)
2. System selects a Voice from `personas` table
3. Fetches content sources from Voice's `rss_sources` JSONB
4. Applies Voice's `config` (identity_context, voice_dna, etc.)
5. Generates content via `generationService.ts` using `DatabasePersona` class
6. Stores in `tweets` table with status `ready` or `posted`

#### 4. Schedules (`lib/schedule.ts`, `lib/scheduleService.ts`)
- Timezone-aware scheduling via `account_schedules` table
- Each schedule linked to `connected_account_id` and optional `persona_id` (Voice)
- Prevents duplicate generation/posting via `generation_slots` table

#### 5. Content Sources (`lib/contentSource/`)
- RSS, Reddit, Twitter, Google Trends fetchers
- **ALWAYS reads from Voice's rss_sources JSONB** - never hardcoded
- Provides source material for AI generation

#### 6. Other Components
- **Variability Engine** (`lib/variabilityEngine.ts`): Dynamic tokens, persona-agnostic
- **Image Generation** (`lib/services/imageGenerationService.ts`): Template-based, uses card_data
- **Thread Templates** (`lib/threadTemplates.ts`): Deep Dive, Competitor Showdown, etc.
- **Engagement System** (`lib/engagement/`): Automated replies (legacy - reads from JSON)

### Database Schema

| Table | Purpose |
|-------|---------|
| `users` | NextAuth users |
| `connected_accounts` | Social media accounts with encrypted credentials, `personas` JSONB array, `branding` JSONB |
| `personas` | Voice/AI Profile configs - **ALL generation comes from here** |
| `account_schedules` | Timezone-aware posting schedules |
| `tweets` | Generated content with status (draft, ready, posted, failed) |
| `generation_slots` | Idempotency: tracks generated/posted slots |
| `engagement_log` | Log of automated engagements |
| `threads` | Thread groupings |

### API Routes

Key endpoints:
- `GET/POST /api/tweets` - Tweet generation and management (uses Voices)
- `GET/POST /api/profiles` - Voice/AI Profile management
- `GET/POST /api/accounts` - Connected account management
- `GET /api/dashboard` - Dashboard data with Voices, tweets, accounts
- `POST /api/auto-post` - Automated posting cron
- `GET /api/auth/[...nextauth]` - NextAuth

### Frontend Pages

- `app/page.tsx` - Dashboard (Command Center)
- `app/queue/page.tsx` - Content timeline
- `app/accounts/page.tsx` - Connected accounts
- `app/personas/page.tsx` - Voice management (AI Profiles)

## Key Patterns

- **All Generation Uses Voices**: Every piece of content is generated through a Voice/Persona from the database - no exceptions
- **Voice-Persona-Persona Equivalence**: Voice = AI Profile = Persona (use "Voice" in UI, "personas" in code)
- **Content Source from DB**: All RSS/content sources come from `personas.rss_sources` JSONB - never hardcoded
- **Account-Voice Linking**: `connected_accounts.personas` JSONB array lists allowed Voice keys
- **DB-Driven**: All Voice data from `personas` table - no hardcoded PERSONAS array
- **Encryption**: API credentials stored encrypted
- **Circuit Breaker**: API calls protected
- **Idempotency**: `generation_slots` prevents duplicate generation

## Troubleshooting

- **Voice not found**: Check Voice `key` exists in `personas` table and is in account's `personas` JSONB
- **Generation failing**: Verify the Voice has proper `config` with identity_context and rss_sources
- **No content sources**: Check the Voice's `rss_sources` JSONB is configured with valid URLs