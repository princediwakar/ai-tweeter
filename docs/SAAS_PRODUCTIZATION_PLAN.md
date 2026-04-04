# Plan: AI-Powered Personal Brand Builder for Creators

## Product Vision
A SaaS platform that helps individual creators build their personal brand on LinkedIn and Twitter using AI-generated content tailored to their specific niche/interests.

**Target Audience**: Individual creators, solopreneurs, and influencers who want to:
- Build a thought leadership presence on LinkedIn & Twitter
- Establish authority in niches like Data Science, AI, Cricket, Fitness, Health, Finance, etc.
- Automate content creation while maintaining authentic voice

## Core Value Proposition
- **Niche-Specific Personas**: Users create AI personas tailored to their interests (Data Science, AI, Cricket, Fitness, Health, Finance, Startup, etc.)
- **Multi-Platform Posting**: Post to both Twitter and LinkedIn from a single dashboard
- **Customizable Schedules**: Set posting times that work for their audience
- **Content Control**: Full control over topics, tone, and content style

## Key Features

### 1. Account Management
- Connect Twitter via OAuth 2.0 (PKCE flow)
- Connect LinkedIn via OAuth 2.0
- Manage multiple accounts (future: team accounts)
- View connection status and token health

### 2. Persona Builder (Niche-Based)
Users define personas based on their target niche:
- **Data Science** - ML/AI tutorials, code snippets, research papers
- **AI & LLM** - AI news, model comparisons, implementation guides
- **Cricket** - Match analysis, player insights, career stories
- **Fitness** - Workout tips, nutrition advice, transformation stories
- **Health** - Wellness tips, medical myths, healthy living
- **Finance** - Investment advice, market updates, money tips
- **Startup** - Founder stories, lessons learned, funding news
- **Custom** - Any other niche user wants to build authority in

Each persona includes:
- Name and description
- Content type (single post, thread, article)
- Character length limits
- Topic keywords and triggers

### 3. Content Generation
- Generate tweets/posts based on selected persona
- Custom topic input for specific content
- RSS source integration for trending topics
- Bulk generation (multiple posts at once)
- Image generation support (optional)

### 4. Scheduling
- Visual schedule builder
- Timezone support
- Day-of-week selection
- Maximum posts per day limit
- Multiple schedules per account

### 5. Analytics (Basic)
- Posts ready to publish
- Posts published today
- Scheduled posts count

---

## Technical Implementation

### Current Stack
- **Frontend**: Next.js 16, React 19.2, TypeScript
- **Database**: PostgreSQL (Neon)
- **Auth**: NextAuth.js with email provider
- **Styling**: Tailwind CSS with custom brutal theme (being modernized)

### Database Schema

```sql
-- Users (NextAuth)
users (id, email, name, image, created_at)

-- Accounts (Twitter/LinkedIn)
accounts (
  id, 
  name, 
  twitter_handle,
  owner_id -> users.id,
  status (active/inactive/suspended),
  -- Twitter OAuth
  twitter_oauth2_access_token,
  twitter_oauth2_refresh_token,
  twitter_oauth2_user_id,
  twitter_oauth2_enabled,
  -- LinkedIn OAuth
  linkedin_access_token,
  linkedin_refresh_token,
  linkedin_user_id,
  linkedin_org_id,
  linkedin_enabled
)

-- Personas (Niche-Specific)
custom_personas (
  id,
  account_id -> accounts.id,
  name,           -- e.g., "Data Science Expert"
  description,    -- e.g., "ML tutorials and AI news"
  base_persona,   -- e.g., "data_science"
  min_length,
  max_length,
  is_active
)

-- Schedules
account_schedules (
  id,
  account_id -> accounts.id,
  name,
  timezone,
  days_of_week,
  start_time,
  end_time,
  is_active,
  max_posts_per_day
)
```

### API Endpoints
- `POST /api/accounts` - Create account
- `GET /api/accounts` - List user's accounts
- `POST /api/accounts/[id]/twitter-oauth` - Initiate Twitter OAuth
- `POST /api/accounts/[id]/linkedin-oauth` - Initiate LinkedIn OAuth
- `GET /api/accounts/[id]/personas` - List personas
- `POST /api/accounts/[id]/personas` - Create persona
- `GET /api/accounts/[id]/schedules` - List schedules
- `POST /api/accounts/[id]/schedules` - Create schedule
- `POST /api/tweets` - Generate/post tweets

---

## Phase Roadmap

### Phase 1: Foundation (COMPLETED ✅)
- [x] Next.js 16, React 19.2 upgrade
- [x] User authentication (NextAuth.js)
- [x] Multi-tenant account management
- [x] Twitter OAuth 2.0 PKCE
- [x] LinkedIn OAuth 2.0

### Phase 2: Account Connection UI (COMPLETED ✅)
- [x] Account dashboard
- [x] OAuth status display
- [x] Connect/disconnect flows

### Phase 3: Persona & Schedule System (COMPLETED ✅)
- [x] `custom_personas` table and API
- [x] `account_schedules` table and API
- [x] Persona editor UI
- [x] Schedule builder UI
- [x] Seed data for existing accounts

### Phase 4: Content Generation (COMPLETED ✅)
- [x] Modern dashboard UI
- [x] Persona selector (visual grid)
- [x] Generate single tweet
- [x] Bulk generate multiple tweets
- [x] Custom topic input
- [x] Onboarding flow for new users

### Phase 5: Enhancements (NOT STARTED)
- [ ] Analytics dashboard (views, engagement)
- [ ] Content calendar view
- [ ] Image generation integration
- [ ] Advanced persona customization (tone, style)
- [ ] Redis caching for performance

### Phase 6: Monetization (NOT STARTED)
- [ ] Stripe integration
- [ ] Tiered plans (Free, Pro, Business)
- [ ] Plan enforcement (limits)
- [ ] Usage metering

---

## Getting Started

### For Existing Users
Run seed script to migrate:
```bash
npx tsx scripts/seed-user-data.ts
```

### For New Users
1. Sign up/Login
2. Connect Twitter account
3. Connect LinkedIn account  
4. Create personas for their niche
5. Set up posting schedules
6. Start generating content!

---

## Critical Files
- **Auth**: `lib/auth.ts`, `app/api/auth/[...nextauth]`
- **Accounts**: `lib/accountService.ts`, `app/api/accounts`
- **Personas**: `lib/customPersonaService.ts`, `components/personas/PersonaEditor.tsx`
- **Schedules**: `lib/scheduleService.ts`, `components/schedules/ScheduleBuilder.tsx`
- **Generation**: `app/api/tweets`, `app/api/generate`
- **UI**: `components/TweetDashboard.tsx`, `components/dashboard/*`

---

## Next Steps
1. Test the onboarding flow with a new user
2. Verify persona creation for different niches
3. Add sample personas for common niches (Data Science, AI, Cricket, Fitness, Health)
4. Build analytics dashboard
5. Implement Stripe billing