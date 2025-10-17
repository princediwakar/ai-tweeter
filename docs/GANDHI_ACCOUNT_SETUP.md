# Gandhi Account Setup - Quick Start Guide

## Overview

The Gandhi Wisdom account (@Gandhi_Wisom_) has been configured as an engagement-only account that responds to social leaders, activists, and news with thoughtful, Gandhi-inspired wisdom.

## What's Been Configured

### ✅ 1. AI Persona
- **Name**: Gandhi - The Thoughtful Voice
- **Style**: Thoughtful, compassionate, wisdom-based responses
- **Philosophy**: Ahimsa (non-violence), Satya (truth), peaceful dialogue
- **Location**: `lib/engagement/personas.ts`

### ✅ 2. Engagement Targets (12 accounts)
**Tier 1 (High Priority):**
- @narendramodi - Prime Minister of India
- @RahulGandhi - Indian National Congress leader
- @dalailama - Spiritual leader
- @UN - United Nations
- @Malala - Nobel Peace Prize laureate
- @sudhamurty - Philanthropist, author
- @KailashOnline - Child rights activist

**Tier 2 (Medium Priority):**
- @amnesty - Human rights advocacy
- @UNHumanRights - UN Human Rights
- @BBCWorld - Global news
- @ArvindKejriwal - Delhi Chief Minister
- @ndtv - Indian news

### ✅ 3. Engagement Schedule (IST)
- **7 AM** - Morning engagement with leaders
- **12 PM** - Midday response to breaking news
- **6 PM** - Evening political/social discussions
- **9 PM** - Night reflection on day's events

**Total**: 4 engagement sessions per day, 7 days a week

### ✅ 4. Rate Limits
- **Max engagements per day**: 4
- **Cooldown period**: 6 hours between same target
- **Target rotation**: 6 accounts checked every 15 minutes

## Next Steps to Activate

### Step 1: Get Twitter API Credentials

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a Twitter app for @Gandhi_Wisom_ account
3. Generate API keys with **Read and Write** permissions
4. Copy these credentials:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

### Step 2: Add Account to Database

Edit `scripts/add-gandhi-account.sql` and replace placeholders:

```sql
INSERT INTO accounts (
  -- ... other fields ...
  'enc:' || encode('YOUR_TWITTER_API_KEY'::bytea, 'base64'),
  'enc:' || encode('YOUR_TWITTER_API_SECRET'::bytea, 'base64'),
  'enc:' || encode('YOUR_TWITTER_ACCESS_TOKEN'::bytea, 'base64'),
  'enc:' || encode('YOUR_TWITTER_ACCESS_TOKEN_SECRET'::bytea, 'base64'),
  -- ... rest of the query ...
);
```

Then run it:
```bash
# Method 1: Direct execution
psql "$DATABASE_URL" -f scripts/add-gandhi-account.sql

# Method 2: Interactive
psql "$DATABASE_URL"
\i scripts/add-gandhi-account.sql
```

### Step 3: Set Up Cron Job

**Option A: Vercel Cron (Recommended for production)**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/engage?twitter_handle=@Gandhi_Wisom_",
      "schedule": "0 7,12,18,21 * * *"
    }
  ]
}
```

**Option B: Manual Cron (For local/custom servers)**

```bash
# Edit crontab
crontab -e

# Add this line (runs at 7 AM, 12 PM, 6 PM, 9 PM IST)
0 7,12,18,21 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://yourapp.com/api/engage?twitter_handle=@Gandhi_Wisom_"
```

### Step 4: Test the Setup

**Test 1: Configuration Validation**
```bash
node scripts/test-gandhi-config.js
```

**Test 2: API Test (Debug Mode)**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/engage?twitter_handle=@Gandhi_Wisom_&debug=true"
```

Expected response:
```json
{
  "success": true,
  "message": "Successfully engaged with @targetuser",
  "engagement": {
    "target": "@targetuser",
    "originalTweetUrl": "https://twitter.com/...",
    "replyUrl": "https://twitter.com/Gandhi_Wisom_/status/..."
  }
}
```

**Test 3: Check Database Logs**
```sql
SELECT
  engaged_at,
  target_username,
  LEFT(target_tweet_text, 50) as tweet,
  LEFT(reply_text, 50) as reply
FROM engagement_log
WHERE account_id = (
  SELECT id FROM accounts WHERE twitter_handle = '@Gandhi_Wisom_'
)
ORDER BY engaged_at DESC
LIMIT 5;
```

## How It Works

### Engagement Flow

1. **Cron triggers** at scheduled time (7 AM, 12 PM, 6 PM, 9 PM IST)
2. **Schedule check** verifies it's the right time
3. **Daily limit check** ensures < 4 engagements today
4. **Target rotation** picks 6 accounts from the list
5. **Activity scout** finds recent tweets from those targets
6. **Quality filter** selects best tweet to engage with
7. **Target cooldown** ensures 6 hours since last engagement with that user
8. **AI generation** creates Gandhi-style reply (max 280 chars)
9. **Post reply** to Twitter
10. **Log engagement** to database

### Example Engagement

**Target Tweet**:
> @narendramodi: "India celebrates 75 years of independence today. Our journey from struggle to success inspires the world."

**Gandhi Reply**:
> True independence comes when we serve others selflessly. May this milestone remind us that freedom is not just absence of chains, but presence of justice for all. 🕊️

## Monitoring & Maintenance

### View Recent Activity
```bash
# Check today's engagements
curl "http://localhost:3000/api/accounts" | jq

# View engagement logs
psql "$DATABASE_URL" -c "SELECT * FROM engagement_log WHERE account_id = (SELECT id FROM accounts WHERE twitter_handle = '@Gandhi_Wisom_') ORDER BY engaged_at DESC LIMIT 10;"
```

### Common Issues

**"No engagement config found"**
- Check that `@Gandhi_Wisom_` exists in `config/engagement-targets.json`
- Ensure the @ symbol is included

**"Engagement is not scheduled for this hour"**
- Verify schedule in `lib/schedule.ts`
- Check server timezone vs IST
- Use `?debug=true` to bypass schedule check for testing

**"Daily engagement limit reached"**
- Max 4 engagements per day
- Resets at midnight IST
- Check logs: `SELECT COUNT(*) FROM engagement_log WHERE account_id = '...' AND DATE(engaged_at) = CURRENT_DATE`

**"No recent activity from target group"**
- Targets may not be tweeting
- System auto-rotates to next group every 15 minutes
- Check if Twitter API credentials are valid

### Adjusting Configuration

**To change engagement times:**
Edit `lib/schedule.ts` → `gandhiEngagementPattern`

**To add/remove targets:**
Edit `config/engagement-targets.json` → `@Gandhi_Wisom_.priority_targets`

**To modify AI persona:**
Edit `lib/engagement/personas.ts` → `gandhi.systemPrompt`

**To adjust rate limits:**
Edit `config/engagement-targets.json` → `@Gandhi_Wisom_.rules`

## Files Reference

| File | Purpose |
|------|---------|
| `lib/engagement/personas.ts` | Gandhi AI persona definition |
| `config/engagement-targets.json` | Target list and rules |
| `lib/schedule.ts` | Engagement schedule (IST) |
| `scripts/add-gandhi-account.sql` | Database setup script |
| `scripts/test-gandhi-config.js` | Configuration test script |
| `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md` | Complete setup guide |

## Security Checklist

- [ ] Twitter API credentials encrypted in database
- [ ] CRON_SECRET environment variable set
- [ ] API endpoint protected with Bearer auth
- [ ] Rate limits configured to avoid Twitter API abuse
- [ ] No credentials committed to git

## Success Metrics

Track these to measure engagement quality:

1. **Reply rate**: Actual engagements / Scheduled attempts
2. **Response rate**: How often targets respond to Gandhi
3. **Engagement rate**: Likes/RTs on Gandhi's replies
4. **Sentiment**: Positive/neutral/negative responses
5. **Growth**: Follower count for @Gandhi_Wisom_

## Support

For issues or questions:
1. Check logs: `tail -f logs/engagement.log`
2. Review docs: `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md`
3. Test config: `node scripts/test-gandhi-config.js`
4. Debug mode: `?debug=true` parameter

---

🕊️ **Remember**: The goal is thoughtful engagement, not volume. Quality > Quantity.
