Here is the professional execution plan to rip out the old UI and implement the new "Digital Employee" paradigm using your existing API infrastructure.

But before we map out the phases, we need to address a glaring issue in the utility code you just provided.

You are building an automated social media scheduling tool, and you have hardcoded INDIAN_TZ = 'Asia/Kolkata' into your core date utilities. If AutoGrowth AI is an internal tool just for you, that is fine. But if this is a SaaS product meant for other founders, you have just introduced a critical architectural flaw. A founder in New York scheduling a post for "9:00 AM" expects it to go out at 9:00 AM EST, not 9:00 AM IST. Your account_schedules table already has a timezone column. You must use that column to parse dates, not a hardcoded global constant. Fix this before you scale, or your users will churn the moment a post goes out at 11:30 PM their time.

Here is your ruthlessly prioritized redesign plan to get V1 out the door.

Phase 1: Navigation & Architecture Cleanup
You are stripping away the bloat. The user only needs three places to go.

Delete /dashboard entirely. \* Overwrite /app/page.tsx to be the new Home (Observation Deck).

Create /app/queue/page.tsx for the Timeline view.

Refactor /app/profiles/page.tsx to be the single source of truth for Accounts, Personas, and Schedules.

Update NavigationLayout.tsx: Remove all references to "Accounts" and "Dashboard". The sidebar is now strictly: Home, Queue, and AI Profiles.

Phase 2: The Core Component Build-Out

1. Home (/app/page.tsx) - The Observation Deck

Data Strategy: GET /api/tweets. On the frontend, reduce this array to only keep the tweet with the most recent created_at timestamp for each unique persona_id.

First-Timer Trigger: Check if the returned array is empty. If yes, render the "Initializing AI" skeleton and immediately fire POST /api/tweets (with whatever payload triggers your generation logic) for each active persona.

UI Elements: \* Hero greeting.

A grid of "Latest Draft" cards showing the text, the persona, and the status (Posted/Scheduled).

The "Quick Idea" floating input bar at the bottom.

2. Queue (/app/queue/page.tsx) - The Timeline

Data Strategy (The Frontend Merge): This requires two API calls: GET /api/tweets and GET /api/profiles (which includes schedules).

The Logic:

Map the tweets into TimelineItem objects with actual dates.

Map the schedules by calculating the next 7 days. If a schedule says "Monday at 9:00 AM", calculate the actual Date object for the upcoming Monday. Create a TimelineItem with status: 'ghost'.

Merge the two arrays.

Deduplicate: If a draft tweet exists for Monday at 9:00 AM, remove the 'ghost' slot for Monday at 9:00 AM.

Sort the final array chronologically by date/time.

UI Elements: A vertical chronological list. Solid cards for actual drafts, dashed/faded cards for ghost slots.

3. AI Profiles (/app/profiles/page.tsx) - The Control Room

Consolidation: This page must handle OAuth connection, Persona prompting, and Schedule setting in one flow.

Data Strategy: GET /api/profiles. Group the data by Connected Account.

UI Elements:

Top: "Connect New Node" (Twitter/LinkedIn OAuth buttons).

Body: List of connected accounts. Under each account, list its active Personas.

Actions: Next to each Persona, have "Edit AI Profile" (opens prompt modal) and "Set Schedule" (opens schedule modal).

Phase 3: Order of Operations (Execution)
Do not try to build this all at once. Build it in this exact order to maintain a working application state:

The Routing Update: Change your NavigationLayout and set up the blank pages for /queue and /profiles. Ensure the routing works.

The Profiles Page: Move your existing account connection and persona editing components here. Ensure a user can successfully create a persona and schedule.

The Home Page: Build the frontend grouping logic to isolate the latest tweets. Implement the "First-Timer" POST request.

The Queue Page: Save this for last. The date math to merge abstract schedules and concrete tweets will take the most time. Build out the static UI first, then wire up the merging logic.

This plan uses your existing APIs, relies heavily on your frontend to manipulate state, and gets you to a highly polished, professional V1 without requiring a database migration.
