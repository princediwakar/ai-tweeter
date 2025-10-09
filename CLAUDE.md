---
# Claude Rules & Project Context

This document provides the core rules and context for developing the Multi-Account AI Twitter Bot System. Adhere to these principles in all code modifications and feature development.

## 🎯 Core Mission

The primary goal is a **production-grade, multi-account Twitter automation system**. The system must support isolated accounts with distinct personas and content strategies, focusing on high-quality, aesthetic, and contextually relevant content generation.

## 🚀 Guiding Principles

1.  **Multi-Account First:** All logic (database queries, API routes, generation services) **must** be account-aware and fully isolated. Never write code that assumes a single account.
2.  **Persona-Driven Content:** Content generation is always tied to a specific persona (`english_vocab_builder`, `business_storyteller`, etc.). The output's tone, style, and structure must match the active persona's definition in `lib/personas.ts`.
3.  **Quality is Paramount:** The standard for generated content is extremely high. The recent image generations (like the "Affect vs. Effect" card) are the benchmark for visual quality. Sub-standard, unreadable, or awkward outputs are unacceptable.
4.  **Improve, Don't Discard:** When making changes, enhance existing logic. Do not remove or oversimplify functions unless explicitly instructed. Preserve the complexity that handles different accounts and personas.
5.  **Guarantee Variety:** Implement mechanisms (like topic shuffling and variation markers) to ensure that content generated in batches is unique and that repeated topics over time still yield different results.

## 🧑‍🏫 Account-Specific Directives

### For `@gibbi_ai` (Gibbi Account)
* **Content Focus:** Educational English language lessons (vocabulary, confused words, synonyms, idioms).
* **Format:** **Image-based tweets are the primary output.**
* **Visual Aesthetic:**
    * **NO** opaque cards, borders, or unnecessary icons.
    * **YES** to elegant, typographic overlays on high-quality Unsplash backgrounds.
    * The text must be highly readable, using effects like subtle gradients or frosted glass to ensure contrast on any background.
* **Generation Logic:** The image generation service must be **content-aware**, adapting its layout for different lesson types (`single_word`, `confused_pair`, `synonym_list`).
* **Tone:** Helpful, professional, and exciting teacher.

### For `@princediwakar25` (Prince Account)
* **Content Focus:** In-depth storytelling about Indian business and cricket. Also includes a `satirist` persona for single tweets.
* **Format:** **Narrative threads (6-7 tweets) are the primary output.**
* **Structure:** Threads must follow a clear narrative arc: Hook, Context, Climax, and Lesson.
* **First Tweet Shareability:** The first tweet of every thread is optimized for maximum virality and shareability. It must include:
    - An intriguing hook with specific numbers or dramatic contrasts
    - Quotable, screenshot-worthy content
    - Emotional elements (inspiration, shock, curiosity)
    - Power words that make people want to share immediately
* **Tone:** Insightful, expert storyteller with deep knowledge of the subject.

## 💻 Technical & Workflow Constraints

* **Tech Stack:** Next.js 15 (App Router), TypeScript, Neon DB, Twitter API v2, DeepSeek API.
* **Key Files:**
    * Personas & Topics: `lib/personas.ts`
    * Scheduling: `lib/schedule.ts`
    * AI Prompting: `lib/generationService.ts`
    * Base Persona Generator: `lib/generation/personas/base.ts`
    * Thread Generation: `lib/threadGenerationService.ts` (includes shareability optimization)
    * Thread Posting: `lib/instantThreadService.ts`
    * Image Rendering: `lib/imageGenerationService.ts`
    * Generation API: `app/api/generate/route.ts`
    * Posting API: `app/api/auto-post/route.ts`
* **API Separation:** The `/api/generate` route creates content and saves it to the DB. The `/api/auto-post` route reads from the DB and posts to Twitter. Do not mix these concerns.
* **Hashtag Philosophy:** The AI includes 1-2 hashtags naturally distributed across threads where contextually relevant. Hashtags are embedded directly in tweet content during generation - NO post-processing or appending. The `hashtags` field in the database is kept empty for backward compatibility.
* **Content Generation:** Tweets are generated as complete, ready-to-post content. What is saved to the database is exactly what gets posted to Twitter - no modifications during posting.
* **Pre-Commit Checks:** Before any `git commit`, you **must** run `npm run build` and `npm run lint`. Both must pass without errors.
* **Cron Automation:** The project uses cron-job.org for automated content generation and posting. The APIs leverage existing TypeScript schedule logic.
* **Documentation:** When significant features are added or changed, update the main project `README.md` to reflect the new state.
* **Neon DB Project ID:** round-sun-88150229

## ⏰ Cron-job.org Automation

The system uses cron-job.org for automated cron-based content generation and posting:

* **External Cron Service:** Uses cron-job.org to trigger API endpoints at scheduled intervals
* **Two Main Endpoints:**
  - Content Generation: `GET /api/generate?twitter_handle={account}` for each account
  - Auto Posting: `GET /api/auto-post` for all accounts
* **Smart Scheduling:** APIs use existing `isGenerationScheduled()` and `isPostingScheduled()` functions; endpoints return "not scheduled" when outside configured schedule times
* **Production URL:** `https://aitweeter.vercel.app` (verified working)

**Production Test Results (✅ Verified):**
- All endpoints respond correctly with proper authentication
- Schedule logic working: shows "not scheduled" outside configured hours
- Debug mode generates content successfully
- Ready for cron-job.org scheduling

**Required Environment Variables:**
- `CRON_SECRET`: Authentication for cron endpoints
- All other environment variables from production deployment

**Neon DB Project ID for neon mcp
- neon project id: round-sun-88150229