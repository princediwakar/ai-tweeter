# Plan: Productize AI Twitter Automation into SaaS Platform

## Context
The user wants to transform the existing AI Twitter automation system into a product where users can:
1. Login (authentication)
2. Connect/authorize their LinkedIn & Twitter accounts
3. Create personas (AI personas for content generation)
4. Schedule posting

The current system is a single-user tool with hardcoded accounts and personas. We need to design a multi-tenant SaaS architecture with user management, OAuth integration, persona customization, and scheduling UI.

## Key Decisions

Based on user input:
- **Target Audience**: Individual creators & solopreneurs
- **Billing Model**: Tiered monthly subscriptions (Free, Pro, Business)
- **Migration Priority**: Authentication first (build foundation before user-facing features)
- **Authentication**: NextAuth.js (standard for Next.js applications)

## Phase 1: Exploration Results

### Current State Analysis

**Authentication & User Management:**
- No existing authentication system (no NextAuth.js, no users table)
- Single-tenant, multi-account model with all accounts globally accessible
- Database has `accounts` table but no `users` table
- AccountService manages encrypted credentials but with no user association
- No session management or route protection

**Social API Integrations:**
- Twitter integration uses static API keys (no OAuth flow)
- **LinkedIn OAuth fully implemented** with separate generation and posting pipeline
- LinkedIn has dedicated `linkedinAnalyst` persona with article enrichment
- Separate `/api/auto-post-linkedin` endpoint with token refresh management
- Account table supports encrypted LinkedIn tokens but needs user association
- Rate limiting and error handling already implemented

**Infrastructure & Tooling:**
- **Next.js 16** with Turbopack configuration (upgraded from 15.4.7)
- **React 19.2** with latest performance improvements
- **ESLint Flat Config** modernized configuration
- **TypeScript** updated with react-jsx support
- Build system optimized with separate lint command

**Persona System & Scheduling:**
- Persona definitions in `lib/personas.ts` with hardcoded `ACCOUNT_PERSONA_MAPPING`
- Engagement personas in `lib/engagement/personas/` with per-account configuration
- Scheduling system in `lib/schedule.ts` with hardcoded IST-based schedules
- Database schema supports multi-account with `account_id` foreign keys
- Current 60-day strategy focuses on Pattern Spotter only for @princediwakar25

**Database Schema:**
- Existing: `accounts`, `tweets`, `threads`, `engagement_log`
- Missing: `users`, `sessions`, `subscriptions`, `user_accounts`, `custom_personas`, `account_schedules`

## Phase 2: Design Approach

### Core Architectural Decisions

1. **Authentication**: Use NextAuth.js for OAuth providers, session management, and TypeScript support
2. **Multi-tenancy**: Add user-account relationships with role-based access (owner, editor, viewer)
3. **Twitter OAuth**: Implement OAuth 1.0a/2.0 flow for user authorization
4. **Persona Customization**: Extend persona system with database-backed custom personas
5. **Schedule Customization**: Move hardcoded schedules to database with visual editor UI
6. **Billing**: Stripe integration with tiered plans (Free, Pro, Business) targeting individual creators
7. **Migration Strategy**: Feature flags + gradual rollout with backward compatibility
8. **Target Focus**: Optimize for individual creators & solopreneurs (simplified UI, affordable pricing)

### Key Technical Challenges
- **✅ LinkedIn-Twitter separation already implemented**: Separate generation pipelines, posting endpoints, and scheduling
- Timezone handling (current system is IST-based)
- Schedule validation and conflict detection
- Persona compatibility checking
- API rate limit management per user
- Data isolation between users

## Current Implementation Status (Updated April 2026)

### ✅ Completed Infrastructure Upgrades
1. **Next.js 16 Upgrade**: Migrated from Next.js 15.4.7 to 16.0.10 with Turbopack configuration
2. **React 19.2**: Updated React to latest version with improved performance
3. **ESLint Flat Config**: Modernized ESLint configuration
4. **TypeScript Updates**: Enhanced tsconfig with react-jsx support

### ✅ LinkedIn-Twitter Separation Architecture
The system now has a clear separation between LinkedIn and Twitter generation/posting:

**LinkedIn-Specific Components:**
- `linkedinAnalyst` persona with 600-2500 character content requirements
- Dedicated `/api/auto-post-linkedin` endpoint with OAuth token refresh
- Separate scheduling: 8x/week posting schedule (Mon-Fri, 8am & 2pm on Tue/Thu)
- Independent content processing with article enrichment pipeline
- LinkedIn OAuth flow (hardcoded to @princediwakar25, needs generalization)
- Database tracking: `linkedin_id` field in tweets table for cross-posting status

**Architectural Separation Points:**
1. **Generation**: LinkedIn analyst uses separate persona class and context builder
2. **Posting**: Independent API endpoint with LinkedIn-specific formatting
3. **Scheduling**: Different schedule checking functions (`getScheduledPersonasForLinkedInPosting`)
4. **Content Rules**: Different character limits, no hashtags, conversational tone
5. **Error Handling**: LinkedIn errors don't affect Twitter posting and vice versa

**Cross-Posting Logic:**
- Tweets can be Twitter-only, LinkedIn-only, or cross-posted
- Status updates to `posted` only when both platforms have posted
- Content adaptation: removes @ symbols for LinkedIn, handles hashtags differently

### ⚠️ Current Limitations for SaaS
1. LinkedIn OAuth is hardcoded to single account
2. No user association for multi-tenant access
3. Token management needs generalization
4. Schedule customization is still database-driven but not user-configurable via UI

## Phase 3: Implementation Plan

### Phase 1: Foundation - Authentication & Multi-tenancy (Weeks 1-2)
0. **✅ Infrastructure upgraded**: Next.js 16, React 19.2, ESLint flat config
1. Add `users`, `sessions`, `user_accounts` tables to database
2. Install and configure NextAuth.js with email/password and OAuth providers
3. Create authentication middleware for API route protection
4. Update AccountService to handle user-account relationships
5. Add `owner_id` to accounts table and migrate existing accounts to admin user

### Phase 2: Social Account OAuth Integration (Weeks 3-4)
1. Implement Twitter OAuth flow with `/api/auth/twitter/connect` and callback endpoints
2. **Generalize LinkedIn OAuth** (already implemented but hardcoded to @princediwakar25)
3. **✅ LinkedIn posting endpoint exists**: `/api/auto-post-linkedin` with token refresh
4. Create UI components for account connection status
5. Update `lib/twitter.ts` to use OAuth tokens instead of static keys
6. Add token refresh management for both platforms

### Phase 3: Schedule Customization (Weeks 5-6)
1. Create `account_schedules` table for user-defined schedules (LinkedIn already has separate schedule checking functions)
2. Build visual schedule builder UI with drag-and-drop interface
3. Refactor `lib/schedule.ts` to check database schedules first
4. Add timezone support per account
5. Implement schedule validation and conflict detection

### Phase 4: Persona System Extensibility (Weeks 7-8)
1. Add `custom_personas` table for user-defined personas (LinkedIn analyst persona already exists as built-in)
2. Create persona editor UI with AI preview functionality
3. Update `lib/personas.ts` to merge built-in and custom personas
4. Add persona assignment interface to accounts
5. Support persona inheritance/cloning from built-in personas

### Phase 5: Frontend Dashboard (Weeks 9-10)
1. Create dashboard layout with sidebar navigation
2. Build account management interface
3. Implement content calendar with visual schedule view
4. Add analytics dashboard with performance metrics
5. Create settings pages for user preferences

### Phase 6: Billing & Subscription Management (Weeks 11-12)
1. Integrate Stripe for payments and subscriptions with tiered pricing
2. Create `subscriptions` and `plan_limits` tables with Free/Pro/Business tiers
3. Implement usage tracking with `usage_metrics` table for plan enforcement
4. Add plan enforcement middleware to check account limits
5. Create billing portal and subscription management UI for individual creators

### Phase 7: Migration & Testing (Weeks 13-14)
1. Create data migration script for existing accounts
2. Implement feature flags for gradual rollout
3. Comprehensive testing of authentication flows
4. OAuth integration testing
5. Schedule and persona migration validation

### Phase 8: Deployment & Scaling (Weeks 15-16)
0. **✅ Next.js 16 with Turbopack** already configured with root directory
1. Add Redis for session storage and caching
2. Implement queue system for background jobs
3. Set up monitoring with Sentry/LogRocket
4. Configure CDN for static assets
5. Implement rate limiting and security enhancements

## Critical Files to Modify

### ✅ Existing LinkedIn-Twitter Separation Files (Already Implemented)
- `lib/generation/personas/linkedinAnalyst.ts` - LinkedIn-specific persona with article enrichment
- `lib/contentSource/context/linkedinAnalyst.ts` - Dedicated LinkedIn context fetching
- `app/api/auto-post-linkedin/route.ts` - Separate LinkedIn posting endpoint
- `app/auth/linkedin/route.ts` - LinkedIn OAuth flow (needs generalization)
- `lib/linkedin.ts` - LinkedIn API client with token refresh

### Files Requiring Modification for SaaS
1. **`lib/db.ts`** - Extend database schema with user tables and relationships
2. **`lib/types.ts`** - Add User, Subscription, CustomPersona types
3. **`lib/accountService.ts`** - Add user-account relationships, OAuth token handling
4. **`lib/schedule.ts`** - Refactor for database-driven schedules
5. **`lib/personas.ts`** - Extend for custom persona support
6. **`lib/twitter.ts`** - Update to use OAuth tokens
7. **`app/api/auth/[...nextauth]/route.ts`** - NextAuth.js configuration
8. **`lib/middleware/auth.ts`** - Authentication middleware
9. **`components/`** - New UI components for dashboard, schedule builder, persona editor

## Verification

### Testing Strategy
1. **Authentication Testing**: Signup, login, password reset, session management
2. **OAuth Integration Testing**: Twitter OAuth flow (new) and LinkedIn OAuth generalization (existing but hardcoded)
3. **Schedule Testing**: Schedule creation, validation, timezone handling, conflict detection
4. **Persona Testing**: Custom persona creation, assignment, AI generation
5. **Billing Testing**: Subscription flows, webhook handling, plan enforcement
6. **Performance Testing**: API response times, database query performance, concurrent users
7. **Security Testing**: Data isolation, rate limiting, CSRF protection

### Success Criteria
1. Users can sign up and log in successfully
2. Users can connect Twitter and LinkedIn accounts via OAuth
3. **LinkedIn-Twitter separation maintained**: Cross-posting works with platform-specific optimizations
4. Users can create and assign custom personas to accounts
5. Users can define custom posting schedules via visual interface
6. Automated posting continues to work with new schedule system
7. Data is properly isolated between users
8. Billing system correctly enforces plan limits
9. Migration preserves all existing data and functionality

### Rollback Plan
1. Maintain `USE_SAAS_FEATURES` environment variable flag
2. Keep legacy API endpoints during transition period
3. Create database backups before schema changes
4. Implement comprehensive logging for debugging
5. Have manual override to revert to hardcoded schedules if needed