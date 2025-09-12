Of course. You're right, the previous file was a comprehensive `README.md` for a human developer, which is too verbose for an AI's context.

I have distilled its core principles and your recent feedback into a refined `claude.md`. This new file contains a concise set of rules and directives, making it much more effective for guiding AI-assisted development on this project.

Here is the updated `claude.md`:

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
* **Tone:** Insightful, expert storyteller with deep knowledge of the subject.

## 💻 Technical & Workflow Constraints

* **Tech Stack:** Next.js 15 (App Router), TypeScript, Neon DB, Twitter API v2, DeepSeek API.
* **Key Files:**
    * Personas & Topics: `lib/personas.ts`
    * Scheduling: `lib/schedule.ts`
    * AI Prompting: `lib/generationService.ts`
    * Image Rendering: `lib/imageGenerationService.ts`
    * Generation API: `app/api/generate/route.ts`
    * Posting API: `app/api/auto-post/route.ts`
* **API Separation:** The `/api/generate` route creates content and saves it to the DB. The `/api/auto-post` route reads from the DB and posts to Twitter. Do not mix these concerns.
* **Pre-Commit Checks:** Before any `git commit`, you **must** run `npm run build` and `npm run lint`. Both must pass without errors.
* **GitHub Actions Automation:** The project uses GitHub Actions for automated content generation and posting. Workflow files are auto-generated from `lib/schedule.ts` via the postbuild script. When schedule changes are made, run `npm run build` to regenerate workflows.
* **Documentation:** When significant features are added or changed, update the main project `README.md` to reflect the new state.
- neon projectID: round-sun-88150229

## 🤖 GitHub Actions Workflows

The system uses GitHub Actions for automated cron-based content generation and posting:

* **2 Clean Matrix-Based Workflows:** Production-ready and tested
  - `content-generation.yml`: Matrix job for both @gibbi_ai and @princediwakar25 using `GET /api/generate?twitter_handle=${{ matrix.account }}`
  - `auto-post.yml`: Single job for all accounts using `GET /api/auto-post`
* **Smart Scheduling:** APIs use existing `isGenerationScheduled()` and `isPostingScheduled()` functions; workflows return "not scheduled" when outside schedule times
* **Matrix Strategy Benefits:** Cleaner than separate files, easier to add accounts, better GitHub UI, less duplication
* **Auto-Generation:** Workflows automatically regenerated via `scripts/generate-github-actions.js` on every `npm run build`
* **Production URL:** `https://aitweeter.vercel.app` (verified working)

**Production Test Results (✅ Verified):**
- All endpoints respond correctly with proper authentication
- Schedule logic working: shows "not scheduled" outside configured hours
- Debug mode generates content successfully (3 tweets for Gibbi in 12s)
- Ready for GitHub Actions deployment

**Required Repository Secrets:**
- `VERCEL_URL`: https://aitweeter.vercel.app
- `CRON_SECRET`: added in .env.local
- All other environment variables from your production deployment