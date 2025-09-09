# Multi-Account AI Twitter Bot System 🚀

**⚡ PRODUCTION-READY** - A scalable Next.js application that supports unlimited Twitter accounts with AI-powered content generation, featuring account isolation, custom personas, and automated posting for diverse content strategies.

> **🎯 MISSION**: Production-grade multi-account Twitter automation system supporting educational content (@gibbi_ai), personal branding (@princediwakar25), and unlimited additional accounts with complete data isolation and custom configurations.

> **📝 Self-Updating Documentation**: This file should be updated whenever significant changes are made to the codebase. When adding new features, API routes, components, or configuration changes, please update the relevant sections below to keep this documentation current and useful for future development.

## Project Overview

This is an AI-powered multi-account Twitter automation system built with Next.js 15, TypeScript, and Tailwind CSS. The app supports unlimited Twitter accounts with complete isolation, custom AI personas, configurable posting schedules, and account-specific content strategies. Each account can have its own Twitter credentials, personas, prompts, hashtags, and posting schedules.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: OpenAI API (configurable to use DeepSeek)
- **Social Media**: Twitter API v2 with OAuth 1.0a
- **Scheduling**: Node-cron for automated posting
- **Data Storage**: Neon PostgreSQL database
- **Multi-Account**: Account isolation with encrypted credential storage
- **Configuration**: File-based persona and schedule management

## Key Features

### 🚀 Multi-Account Architecture
- **Unlimited Accounts**: Support for any number of Twitter accounts with complete isolation
- **Account-Specific Credentials**: Encrypted storage of Twitter API keys per account
- **Custom Personas**: Each account can have its own set of AI personas with unique characteristics
- **Isolated Data**: Complete separation of tweets, schedules, and configurations per account
- **Individual Rate Limiting**: Per-account posting limits and error handling

### 🤖 Dynamic Persona System
- **English Learning Account (@gibbi_ai)**:
  - **Vocabulary Builder** 🏆 - Master new words, meanings, and usage (with image generation)
  - **Grammar Master** 📚 - Perfect grammar rules and sentence construction
  - **Communication Expert** 🗣️ - Enhance speaking, writing, and conversation skills

- **Personal Account (@princediwakar25)**:
  - **Product Insights** - Technology and product development content
  - **Startup Content** - Entrepreneurship and business insights
  - **Tech Commentary** - Industry analysis and professional perspectives

- **Extensible Design**: Easy addition of new personas and account types

### ⚡ AI Content Generation Engine
- **Account-Specific Generation**: Custom prompts and styles per account
- **Dynamic Hashtag Systems**: Account-specific hashtag strategies
- **Content Type Variety**: Educational, professional, personal, technical content
- **Quality Scoring**: AI-powered content quality assessment
- **Template-Based Prompts**: Configurable prompt templates per persona
- **Multi-Language Support**: Extensible for different languages and markets
- **Engagement Optimization**: Account-specific engagement strategies
- **Brand Integration**: Strategic CTAs and brand mentions per account
- **Image Generation**: Vocabulary card images with Unsplash backgrounds for educational content

### 🕒 Advanced Scheduling & Automation
- **Multi-Account Processing**: Simultaneous handling of all active accounts
- **Custom Schedules**: Account-specific posting times and frequencies
- **Timezone Support**: Configurable timezone optimization per account
- **Smart Distribution**: Intelligent persona rotation and content variety
- **Error Recovery**: Individual account failure handling without affecting others
- **Rate Limiting**: Twitter API compliance with per-account limits
- **Real-time Monitoring**: Account status and posting success tracking
- **Flexible Cron Integration**: External cron service support for production
- **Account Health Checks**: Automated credential validation and account status monitoring

## Project Structure

```
gibbi-tweeter/
├── app/
│   ├── api/
│   │   ├── accounts/route.ts      # Account management (CRUD)
│   │   ├── auto-post/route.ts     # Multi-account auto-posting
│   │   ├── generate/route.ts      # Account-specific content generation
│   │   ├── tweets/
│   │   │   ├── route.ts           # Tweet CRUD with account filtering
│   │   │   └── [id]/route.ts      # Individual tweet operations
│   │   └── debug/                 # Debugging and testing endpoints
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Multi-account dashboard
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── dashboard/                 # Dashboard components
│   └── account/                   # Account management components
├── lib/
│   ├── accountService.ts          # Account management logic
│   ├── generationService.ts       # AI content generation
│   ├── personas.ts                # Multi-account persona definitions
│   ├── schedule.ts                # Multi-account scheduling
│   ├── sources/                   # Category-based source files
│   │   ├── educational.json       # English learning sources
│   │   ├── professional.json      # Professional content sources
│   │   └── startup.json           # Startup/tech sources
│   └── db.ts                      # Database operations with account isolation
├── MULTI_ACCOUNT_IMPLEMENTATION.md # Legacy implementation tracking
├── THREADING_SYSTEM_IMPLEMENTATION.md # Current threading system development
└── .env.local                     # Environment variables
```

## API Routes

### Account Management
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create new account with Twitter credentials
- `PATCH /api/accounts/[id]` - Update account settings
- `DELETE /api/accounts/[id]` - Remove account

### Tweet Operations (Account-Specific)
- `GET /api/tweets?account_id=xxx` - Fetch tweets for specific account
- `POST /api/tweets` - Generate content for specified account
- `PATCH /api/tweets/[id]` - Update tweet
- `DELETE /api/tweets/[id]` - Delete tweet

### Multi-Account Automation
- `POST /api/auto-post` - Process all active accounts for posting
- `POST /api/generate` - Generate content with account context
- `GET /api/debug/*` - Account-specific debugging endpoints




### **Content Sources & Configuration**

The system uses category-based source files for different content types:

**Educational Sources** (`/lib/sources/educational.json`):
- Twitter handles: Educational institutions, language learning accounts
- Reddit: r/EnglishLearning, r/grammar, r/vocabulary, r/education
- RSS feeds: Educational blogs and language learning resources

**Professional Sources** (`/lib/sources/professional.json`):
- Twitter handles: Tech leaders, product managers, industry experts
- Reddit: r/programming, r/entrepreneur, r/startups, r/technology
- RSS feeds: Tech blogs, product development, industry news

**Startup Sources** (`/lib/sources/startup.json`):
- Twitter handles: Founders, VCs, startup advisors
- Reddit: r/startups, r/entrepreneur, r/venturecapital
- RSS feeds: Startup blogs, funding news, business insights

## Environment Variables

```env
# AI API
OPENAI_API_KEY=your_openai_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here  # Alternative AI provider

# Database
POSTGRES_URL=postgresql://username:password@host/database
POSTGRES_PRISMA_URL=postgresql://username:password@host/database
POSTGRES_URL_NO_SSL=postgresql://username:password@host/database
POSTGRES_URL_NON_POOLING=postgresql://username:password@host/database

# Security
CRON_SECRET=your_random_secret_key_here
ENCRYPTION_KEY=your_encryption_key_for_credentials  # For Twitter credential encryption

# Image Generation (Unsplash API)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here  # For background images in vocabulary cards

# Note: Twitter API credentials are now stored per account in the database
# No longer needed in environment variables for multi-account setup
```

## Multi-Account Content Strategy

### English Learning Account (@gibbi_ai)
- **Educational Content**: Vocabulary lessons, grammar explanations, communication tips
- **Teacher Approach**: Helpful, professional, educational tone
- **Target Audience**: English language learners worldwide
- **Engagement**: Educational value, practical tips, learning encouragement
- **Gibbi Integration**: Strategic CTAs for language learning platform

### Personal Account (@princediwakar25) - **🚧 THREADING SYSTEM IN DEVELOPMENT**
- **Threading Capability**: Deep Indian business storytelling with 6-7 tweet narrative threads
- **Story Templates**: 10 comprehensive templates (founder struggles, business decisions, family dynamics, etc.)
- **Content Mix**: 70% threads + 20% single tweets + 10% satirist content
- **Cultural Focus**: Indian business stories with human elements and strategic insights
- **Cross-Era Patterns**: Connecting traditional business wisdom with modern startup strategies
- **Target Audience**: Entrepreneurs, business professionals, startup enthusiasts
- **Threading Timeline**: 5-minute intervals between thread tweets for optimal engagement

### Extensible Architecture
- **Account-Agnostic Personas**: Reusable persona definitions across accounts
- **Custom Prompt Templates**: Tailored content generation per account type
- **Flexible Scheduling**: Different posting strategies per account
- **Isolated Analytics**: Track performance metrics per account

## Development Commands

```bash
npm run dev        # Start development server (with Turbopack)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### **⚠️ IMPORTANT: Pre-Commit Requirements**
**ALWAYS run the build before committing and pushing:**
```bash
npm run build      # Must pass before committing
npm run lint       # Must pass before committing
git add .
git commit -m "Your commit message"
git push
```

## Key Components

### Multi-Account Dashboard
Main component containing:
- **Account Selection**: Dropdown to switch between accounts
- **Account Management**: Add, edit, delete accounts with credential management
- **Tweet Generation**: Account-specific persona selection and content generation
- **Tweet Management**: Account-filtered tweet table with status tracking
- **Statistics Dashboard**: Per-account metrics (total, drafts, scheduled, posted)
- **Scheduler Controls**: Multi-account auto-posting management
- **Batch Operations**: Account-specific batch tweet operations

### Data Models
```typescript
interface Account {
  id: string;
  name: string;
  twitter_handle: string;
  twitter_api_key: string; // Encrypted
  twitter_api_secret: string; // Encrypted
  twitter_access_token: string; // Encrypted
  twitter_access_token_secret: string; // Encrypted
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

interface Tweet {
  id: string;
  account_id: string; // Foreign key to accounts table
  content: string;
  hashtags: string[];
  persona: string; // Account-specific persona
  scheduledFor?: Date;
  postedAt?: Date;
  twitterId?: string;
  twitterUrl?: string;
  errorMessage?: string;
  status: 'draft' | 'scheduled' | 'ready' | 'posted' | 'failed';
  createdAt: Date;
  quality_score?: object;
}
```

## Testing with Playwright MCP

This project is configured with Playwright MCP for direct browser testing:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### ✅ **Verified Functionality** (Last Tested: 2025-01-09)

**Multi-Account Content Generation:**
- ✅ English Learning persona generates vocabulary, grammar, and communication content
- ✅ Professional personas create product insights, startup content, and tech commentary
- ✅ Account-specific source integration feeding relevant trending topics
- ✅ Educational and professional content quality with appropriate tone and accuracy
- ✅ Custom hashtag strategies and engagement optimization per account

### **Content Quality Examples**

**English Learning (@gibbi_ai):**
```
📚 Word of the Day: "Ubiquitous" means present everywhere.

Example: "Smartphones are ubiquitous in modern society."

Synonyms: widespread, pervasive, omnipresent

Try using it in a sentence today!
#VocabularyBuilder #EnglishLearning #WordOfTheDay
```

**Professional (@princediwakar25):**
```
💡 Product Insight: The best user feedback often comes from what users DON'T say.

Watch where they hesitate, where they click multiple times, where they give up.

Silence speaks louder than surveys.
#ProductDevelopment #UserExperience #StartupLessons
```

## Security Notes

- Twitter API credentials are required for posting functionality
- The app uses OAuth 1.0a for Twitter authentication
- Environment variables contain sensitive API keys
- Auto-posting runs server-side with node-cron
- Multi-account content maintains appropriate tone and accuracy per account type

## Deployment

The app is configured for Vercel deployment with external cron service for production automation.

### **🚧 THREADING SYSTEM CRON CONFIGURATION**

**⚡ NEW: 5-Minute Threading System**

Updated cron schedule to support optimal thread posting with reply chain management:

**1. Content Generation Cron:**
```bash
# Generate content every 2 hours for all accounts
0 */2 * * * GET https://gibbi-tweeter.vercel.app/api/generate
Authorization: Bearer ${CRON_SECRET}
```

**2. Auto-Posting Cron (UPDATED FOR THREADING):**
```bash
# Post content every 5 minutes - enables proper thread progression
*/5 * * * * POST https://gibbi-tweeter.vercel.app/api/auto-post
Authorization: Bearer ${CRON_SECRET}
```

**Threading Benefits:**
- **Thread Progression**: 5-minute intervals between thread tweets
- **Reply Chain Management**: Automatic parent tweet ID tracking
- **Mixed Content**: Threads, single tweets, and satirist content
- **Account Isolation**: Gibbi unchanged, Prince enhanced with threading
- **Timeout Compliance**: Each cron execution under 30-second limit

**Account-Specific Processing Benefits:**
- **Generation Isolation**: Slow AI generation for one account won't delay others
- **Custom Frequencies**: Different generation/posting rates per account strategy
- **Failure Isolation**: Account failures don't cascade to other accounts
- **Schedule Compliance**: Each account only processes during its scheduled hours (defined in `/lib/schedule.ts`)
- **Better Monitoring**: Per-account success/failure tracking
- **Timeout Prevention**: Individual account processing prevents system-wide timeouts

**Legacy Option: Multi-Account Processing**
```bash
# Process all accounts (less optimal but supported)
*/15 * * * * POST https://gibbi-tweeter.vercel.app/api/auto-post
Authorization: Bearer ${CRON_SECRET}
Body: {"process_all_accounts": true}
```

**Schedule Integration:**
- **Generation**: Only generates if persona scheduled in `/lib/schedule.ts` for current hour
- **Posting**: Only posts if persona scheduled in `/lib/schedule.ts` for current hour
- **Account Isolation**: Complete separation of credentials, data, and processing
- **Error Recovery**: Individual account failures without system impact

## 🎯 **Multi-Account Growth Strategy**

This system serves as a comprehensive social media automation platform:

### **Account-Specific Strategies**

**English Learning Account (@gibbi_ai):**
- **Educational Authority**: Build reputation as trusted English learning resource
- **Community Building**: Create engaged community of English learners
- **Platform Integration**: Strategic Gibbi AI mentions (15% frequency) for language learning
- **Content Value**: Focus on genuine educational value and practical learning

**Personal Account (@princediwakar25):**
- **Thought Leadership**: Establish expertise in product development and startups
- **Professional Network**: Build connections with entrepreneurs and developers
- **Brand Building**: Develop personal brand through consistent, valuable content
- **Industry Insights**: Share authentic experiences and professional perspectives

### **Scalability Features**
- **Unlimited Account Support**: Add new accounts with unique strategies
- **Custom Content Approaches**: Tailor content style per account type
- **Independent Analytics**: Track growth metrics per account
- **Flexible Integration**: Support different business goals per account

---

## 🔥 **Multi-Account System Status**

### **⚡ THREADING SYSTEM STATUS** (as of 2025-09-05)
- **Threading Infrastructure**: 🚧 In Development (database schema, reply chain management)
- **Indian Business Storytelling**: 🚧 In Development (10 story templates, cultural authenticity)
- **5-Minute Cron Integration**: 🚧 In Development (thread progression, posting optimization)
- **Multi-Account Architecture**: ✅ Working (complete account isolation)
- **Twitter API Integration**: ✅ Working (per-account credential management)
- **AI Content Generation**: ✅ Working (DeepSeek + account-specific prompts)
- **Account Isolation**: ✅ Working (Gibbi unchanged, Prince enhanced)
- **Custom Personas**: ✅ Working (English learning + business storyteller + satirist)

### **Multi-Account Content Examples**

**English Learning (@gibbi_ai):**
```
📚 Grammar Tip: "Who" vs "Whom" - Here's the simple trick that works every time:
If you can replace it with "he/she" → use WHO
If you can replace it with "him/her" → use WHOM

Example: WHO is calling? (He is calling ✓)
To WHOM are you speaking? (You are speaking to him ✓)
#EnglishGrammar #LanguageLearning
```

**Business Storytelling Thread (@princediwakar25):**
```
1/ Ratan Tata rejected Ford's $50B offer for Tata Motors in 2008.
His hands were shaking during the board meeting.
Here's the psychological pressure behind India's biggest business decision: 🧵

2/ Context: 2008 financial crisis hit hard.
Banks calling loans. Board members panicking.
"Sell everything to Ford and save the company," they urged.

3/ The internal conflict:
"If I sell, we'll never build Indian automotive capability.
But if I don't, 400,000 jobs are at risk."

4/ His decision: Rejected $50B. 
Restructured internally. Survived the crisis.
"Sometimes the right decision feels like the wrong one."

5/ Result: Jaguar-Land Rover now contributes 25% of Tata's revenue.
Lesson: Long-term vision often requires short-term courage.
#IndianBusiness #Leadership #TataGroup #BusinessDecisions
```

### **Multi-Account Growth Projections**

**English Learning Account (@gibbi_ai):**
- **Target Market**: Global English learners (500M+ learners worldwide)
- **Growth Goal**: Educational authority with engaged learning community
- **Expected Engagement**: 2-4% educational content engagement
- **Gibbi Integration**: 15-25 qualified daily visitors from strategic CTAs
- **Community Building**: Supportive English learning network

**Business Storytelling Account (@princediwakar25):**
- **Target Market**: Entrepreneurs, business professionals, startup enthusiasts
- **Growth Goal**: Premier destination for Indian business storytelling
- **Expected Engagement**: 10x improvement through threading (500+ views per thread)
- **Content Strategy**: Deep narrative threads with human elements and strategic insights
- **Unique Position**: Only account doing comprehensive Indian business storytelling with emotional depth
- **Network Growth**: Business leaders, entrepreneurs, and startup ecosystem

**System Scalability:**
- **Unlimited Account Support**: Add accounts for different niches/markets
- **Custom Success Metrics**: Tailored KPIs per account type
- **Independent Growth Tracking**: Per-account analytics and optimization

---

*Last Updated: 2025-09-05 - THREADING SYSTEM DEVELOPMENT - Implementing comprehensive Indian business storytelling with 5-minute cron threading, 10 story templates, and enhanced engagement optimization. See THREADING_SYSTEM_IMPLEMENTATION.md for detailed progress tracking.*
- project id for its neon db: {"projectId":"round-sun-88150229"}