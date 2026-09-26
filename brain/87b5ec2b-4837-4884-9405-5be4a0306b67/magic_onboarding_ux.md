# Magic Onboarding: The Autonomous Brand Machine

## First Principles
1. **Zero Cold Start**: Solo entrepreneurs are busy building their products. We should never ask them to type out who they are; we should read their landing page or newsletter, synthesize it, and reflect their brand back to them.
2. **The "Aha!" Moment**: The onboarding shouldn't feel like filling out a form. It should feel like hiring a world-class ghostwriter who instantly "gets" their product and voice. 
3. **Frictionless Ignition**: By the end of onboarding, the machine shouldn't just be *configured*—it should have already drafted their first week of content to drive traffic to their product.

---

## The Flow

### Step 1: The Seed (Input)
**The UI:** A minimalist, Google-search style screen with a single input field.
**The Prompt:** *"Drop your product's landing page or your newsletter link. We'll build your AI ghostwriter."*
**The Action:** The user drops a link to their SaaS, personal blog, or Substack.
**The Magic (Behind the scenes):** 
As they hit submit, we show a dynamic loading state:
- `Scraping recent essays...`
- `Extracting your core thesis...`
- `Analyzing vocabulary and tone...`
- `Building your brand matrix...`

### Step 2: The Mirror (Reveal)
**The UI:** A beautiful, generated "Identity Card" is presented to the user. We don't ask them to pick an archetype; we tell them what theirs is based on their writing.
**The Content:**
- **Your Archetype:** (e.g., "The Solo Hacker & Educator")
- **Your Tone:** "Direct, transparent, builds-in-public, shares raw MRR and technical challenges."
- **Your Target Audience:** "Other indie hackers and early adopters."
- **Your Content Pillars:** 
  1. Product Updates & Building in Public (40%)
  2. Solopreneur Realities & Mindset (40%)
  3. Industry/Niche Hot Takes (20%)
**The Action:** Two buttons. *"Spot on, let's go"* or *"Let's tweak this"* (which opens the current Archetype/Prompt UI as a fallback for pivoting).

### Step 3: Distribution (The Keys)
**The UI:** Now that we know *what* to say, we need to know *where* to say it. 
**The Prompt:** *"Let's connect your distribution channels."*
**The Action:** One-click OAuth for Twitter and LinkedIn.
**The Magic:** Because we already know their brand, we can contextualize this step. *"We'll adapt your long-form essays into punchy threads for X, and leadership deep-dives for LinkedIn."*

### Step 4: The Autonomous Schedule (Ignition)
**The UI:** Instead of asking them to painstakingly build a cron-like schedule, we propose an optimized one based on the industry standard for their archetype.
**The Prompt:** *"Here is your recommended publishing cadence."*
**The Content:** 
- LinkedIn: Mon, Wed, Fri @ 8:15 AM
- Twitter/X: 1x Daily @ 10:00 AM
**The Action:** *"Start the Engine"*

### Step 5: The Drop-In (Day 0)
**The UI:** They land on their dashboard.
**The Magic:** The dashboard isn't empty. Because they gave us their blog in Step 1, the AI has already run a background job to populate their `content_calendar`. They immediately see 3 drafted posts generated from their past essays, sitting in the queue, ready to be reviewed or auto-published. The machine is already working.

---

## Architecture Requirements
To execute this, we will map this UX directly to our new database tables:
- **Step 1** writes to `blog_sources` (or a temporary ingestion table).
- **Step 2** writes to `brand_profiles` and `content_pillars`.
- **Step 3** writes to `connected_accounts`.
- **Step 4** writes to `account_schedules`.
- **Step 5** writes to `content_calendar` and `posts`.
