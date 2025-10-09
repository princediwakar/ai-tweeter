
# Engagement System - Complete Reference

**Account:** @princediwakar25
**Persona:** business_thought_leader (peer-level insights, not fanboy)
**Targets:** ~24 total (e.g., @anandmahindra, @hvgoenka, etc.)
**Windows:** 9-10 AM & 8-9 PM IST

---

## Core Strategy

**Two-Phase Approach:**
1. **Scout (FREE):** Counts API checks if a *group* of targets posted (15-min intervals)
2. **Engage (COSTS QUOTA):** Only fetch tweets when a target in the group is active

**Quota Math:**
- 8 checks/day on target groups (FREE via Counts API)
- ~35% hit rate = 2-3 retrievals/day
- max_results=2 per retrieval
- **Monthly:** ~60-90 tweets ✅ (under 100 limit)

---

## Configuration

### JSON Config (`config/engagement-targets.json`)
```json
{
  "@princediwakar25": {
    "priority_targets": [
      {
        "username": "@anandmahindra",
        "description": "an influential Indian industrialist and chairman of the Mahindra Group"
      },
      {
        "username": "@hvgoenka",
        "description": "an Indian industrialist and chairman of RPG Group"
      },
      {
        "username": "@narendramodi",
        "description": "the Prime Minister of India, a prominent political figure"
      },
      {
        "username": "@cricketaakash",
        "description": "a well-known cricket commentator and former player"
      }
    ],
    "engagement_persona": "business_thought_leader",
    "rules": {
      "max_engagements_per_day": 3,
      "min_hours_between_same_target": 12
    }
  }
}
````

### Quality Filters

```typescript
{
  min_tweet_age_minutes: 1,    
  max_tweet_age_minutes: 20,   // Top 20 window closed
  min_tweet_likes: 5,           // Filter spam
  max_tweet_likes: 1000,        // Too competitive
  lookback_minutes: 15,
  max_tweets_per_retrieval: 2,
  exclude_image_only_tweets: true // Avoid tweets where AI lacks context
}
```

### Engagement Persona

**business\_thought\_leader:**

  - Voice: Peer-to-peer thought leader, not fanboy
  - Style: Data-driven insights, historical parallels, contrarian perspectives
  - Tone: Respectful but intellectually curious
  - Never: Generic praise ("Great point\!", "Love this\!")
  - Always: Specific data, lesser-known facts, polite challenges

-----

## Database Schema

```sql
CREATE TABLE engagement_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  target_username VARCHAR NOT NULL,
  target_tweet_id VARCHAR UNIQUE NOT NULL,
  target_tweet_text TEXT,
  reply_tweet_id VARCHAR,
  reply_text TEXT,
  discovery_method VARCHAR DEFAULT 'counts_api',
  target_tweet_age_minutes INT,
  target_tweet_likes INT,
  target_tweet_retweets INT,
  reply_likes INT,
  engaged_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_engagement UNIQUE(account_id, target_tweet_id)
);

CREATE INDEX idx_daily_engagement ON engagement_log(account_id, DATE(engaged_at));
CREATE INDEX idx_target_rate_limit ON engagement_log(account_id, target_username, engaged_at);
```

-----

## File Structure

### New Files

```
config/
  └── engagement-targets.json

lib/engagement/
  ├── config.ts          # Shared rules & quality filters
  ├── targets.ts         # JSON loader
  ├── activityScout.ts   # Counts API + tweet fetching
  ├── selector.ts        # Tweet ranking & scoring
  └── replyGenerator.ts  # Context-aware replies

app/api/engage/
  └── route.ts           # Main endpoint (account-aware)
```

### Modified Files

```
lib/personas.ts         # Add business_thought_leader
lib/schedule.ts         # Add engagement schedule + isEngagementScheduled()
lib/db.ts               # Add engagement_log queries
```

-----

## Implementation Flow

### 1\. Activity Scout (FREE)

```typescript
// Rotates through groups of targets (e.g., 3 per check) every 15 min
const targetGroupQuery = '(from:targetA OR from:targetB OR from:targetC)';
const counts = await twitterClient.v2.tweetCountsRecent({
  query: `${targetGroupQuery} -is:retweet -is:reply -has:images`,
  start_time: getLast15Minutes(),
  granularity: 'minute'
});

return {
  isActive: counts.meta.total_tweet_count > 0
};
```

### 2\. Conditional Retrieval (COSTS QUOTA)

```typescript
if (scout.isActive) {
  const tweets = await twitterClient.v2.search(
    `${targetGroupQuery} -is:retweet -is:reply -has:images`,
    { max_results: 2, 'tweet.fields': 'created_at,public_metrics' }
  );
}
```

### 3\. Tweet Selection

**V1 - Simple Selection:**

  - **Step 1: Filter:** Apply all quality gates (age, likes, etc.).
  - **Step 2: Select:** From the valid tweets, choose the most recent one to engage with.

### 4\. Reply Generation

```typescript
const prompt = `You are replying to a tweet from ${target.username}, who is ${target.description}.

Your persona: business_thought_leader - peer-level thought leader

Original tweet: "${tweet.text}"

Generate a reply (max 280 chars) that:
1. Adds SPECIFIC insight: data, historical parallel, or contrarian view
2. Feels like peer-to-peer (not fanboy praise)
3. Invites discussion without being generic
4. NO generic phrases: "Great point!", "Well said!", etc.

Reply:`;
```

### 5\. Anti-Spam Rules

  - Max 3 engagements/day
  - 12-hour cooldown per target
  - Skip already-engaged tweets
  - Quality gates reject generic replies

-----

## Schedule Integration

### Add to `lib/schedule.ts`:

```typescript
const princeEngagementPattern: HourlySchedule = {
  9: ['engagement'],   // Morning window
  20: ['engagement']   // Evening window
};

// Add to ACCOUNT_SCHEDULES
prince_account: {
  generation: princeGenerationPattern,
  posting: princePostingPattern,
  engagement: {
    0: princeEngagementPattern,
    1: princeEngagementPattern,
    // ... all days
  }
}

export function isEngagementScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const schedule = getEngagementSchedule(twitterHandle);
  return schedule[dayOfWeek]?.[hour]?.includes('engagement') || false;
}
```

-----

## Cron Setup (cron-job.org)

```
Job 1: Morning Engagement
URL: [https://aitweeter.vercel.app/api/engage?twitter_handle=@princediwakar25](https://aitweeter.vercel.app/api/engage?twitter_handle=@princediwakar25)
Schedule: */15 9 * * *
Timezone: Asia/Kolkata
Auth: Authorization: Bearer {CRON_SECRET}

Job 2: Evening Engagement
URL: [https://aitweeter.vercel.app/api/engage?twitter_handle=@princediwakar25](https://aitweeter.vercel.app/api/engage?twitter_handle=@princediwakar25)
Schedule: */15 20 * * *
Timezone: Asia/Kolkata
Auth: Authorization: Bearer {CRON_SECRET}
```

**Pattern:** 9:00, 9:15, 9:30, 9:45 + 20:00, 20:15, 20:30, 20:45 = 8 checks/day

-----

## API Endpoint Logic (`/api/engage`)

```typescript
export async function GET(request: NextRequest) {
  // 1. Auth check (CRON_SECRET)
  // 2. Get account from twitter_handle query param
  // 3. Check if in active window (lib/schedule.ts)
  // 4. Check daily engagement limit (3/day)
  // 5. Scout for activity in target group (Counts API - FREE)
  // 6. If active: Fetch tweets (COSTS QUOTA)
  // 7. Select best tweet (simple V1 selector)
  // 8. Check target rate limit (12hr cooldown)
  // 9. Generate reply (business_thought_leader persona)
  // 10. Post reply
  // 11. Log to engagement_log

  return { success, engagement: { target, urls }, quota: { remaining } };
}
```

-----

## Success Metrics (3 Months)

**Must-Have:**

  - ✅ \<100 tweets/month quota
  - ✅ Avg \>5 likes per reply
  - ✅ 10%+ targets engage back
  - ✅ No shadow bans

**Stretch Goals:**

  - 30%+ replies in top 20
  - Follower growth +20%
  - 1 viral reply (\>100 likes)/month

**Risk Thresholds:**

  - ⚠️ \>95 tweets/month → reduce to 1 window
  - ⚠️ \<3 likes avg → review quality
  - ⚠️ Shadow ban → pause 2 weeks

-----

## Implementation Checklist

### Week 1: Foundation

  - [ ] Create `engagement_log` table
  - [ ] Create `config/engagement-targets.json`
  - [ ] Add `business_thought_leader` to `lib/personas.ts`
  - [ ] Add engagement schedule to `lib/schedule.ts`
  - [ ] Build `lib/engagement/config.ts` & `targets.ts`
  - [ ] Verify Counts API doesn't count against quota

### Week 2: Core Logic

  - [ ] Build `lib/engagement/activityScout.ts`
  - [ ] Build simple tweet selector (`lib/engagement/selector.ts`)
  - [ ] Build `lib/engagement/replyGenerator.ts`
  - [ ] Build `app/api/engage/route.ts`
  - [ ] Test full flow locally
  - [ ] Enforce all anti-spam rules

### Week 3: Deployment

  - [ ] Deploy to Vercel
  - [ ] Setup 2 cron jobs (morning + evening)
  - [ ] Monitor quota usage (first 3 days)
  - [ ] Log first 10 engagements

### Week 4: Optimization

  - [ ] Analyze target/time ROI
  - [ ] Implement and fine-tune advanced opportunity scoring model (V2)
  - [ ] Update README
  - [ ] Decide: continue, pause, or expand

-----

## Key Technical Decisions

1.  **Counts API scouting** - Free, rate-limited (not quota-limited)
2.  **lib/schedule.ts integration** - Centralized timing logic
3.  **Target group rotation** - Daily coverage for all \~24 targets across 8 checks
4.  **max\_results=2** - Conservative quota management
5.  **Exclusion of image-based tweets** - Avoids replies where AI lacks visual context
6.  **Dedicated engagement persona** - business\_thought\_leader ≠ content personas
7.  **DeepSeek for generation** - Existing integration
8.  **JSON config** - No code changes to add/modify targets
9.  **Account-aware endpoint** - Single `/api/engage` for all accounts
10. **Separation of concerns** - Engagement logic isolated from content generation

-----

## Adding More Accounts (Future)

1.  Add config to `config/engagement-targets.json`
2.  Create engagement persona in `lib/personas.ts`
3.  Add engagement schedule to `lib/schedule.ts`
4.  Setup 1-2 cron jobs with `?twitter_handle={account}`
5.  Each account gets independent 100 tweets/month quota

-----

**Last Updated:** 2025-10-09
**Status:** Ready for implementation

```
