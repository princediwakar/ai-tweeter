# Multi-Account Engagement System Setup Guide

This guide explains how to add new Twitter accounts to the engagement system, using the Gandhi account as an example.

## System Overview

The engagement system is now fully multi-account aware with:
- Account-specific engagement personas (different AI voices)
- Account-specific target lists (who each account engages with)
- Account-specific schedules (when engagement happens)
- Account-specific rate limits and rules

## Adding a New Account: Step-by-Step

### Example: Adding @Gandhi_Wisom_ Account

#### Step 1: Add Account to Database

First, you need to add the account credentials to the `accounts` table:

```sql
-- Connect to database
-- For local: psql "$DATABASE_URL"

INSERT INTO accounts (
  id,
  name,
  twitter_handle,
  status,
  twitter_api_key_encrypted,
  twitter_api_secret_encrypted,
  twitter_access_token_encrypted,
  twitter_access_token_secret_encrypted,
  personas,
  branding
) VALUES (
  gen_random_uuid(),
  'Gandhi Wisdom',
  '@Gandhi_Wisom_',
  'active',
  'enc:' || encode('YOUR_TWITTER_API_KEY'::bytea, 'base64'),
  'enc:' || encode('YOUR_TWITTER_API_SECRET'::bytea, 'base64'),
  'enc:' || encode('YOUR_TWITTER_ACCESS_TOKEN'::bytea, 'base64'),
  'enc:' || encode('YOUR_TWITTER_ACCESS_TOKEN_SECRET'::bytea, 'base64'),
  '[]'::jsonb, -- Empty personas array (engagement-only account)
  '{
    "theme": "wisdom",
    "audience": "social_leaders",
    "tone": "thoughtful"
  }'::jsonb
);
```

**Important Notes:**
- The encryption uses simple base64 encoding with `enc:` prefix for backward compatibility
- Replace `YOUR_TWITTER_*` with actual Twitter API credentials
- The `personas` array can be empty `[]` for engagement-only accounts
- Get Twitter API credentials from https://developer.twitter.com/

#### Step 2: Create Engagement Persona

The engagement persona defines the AI's voice and behavior. Already created in `lib/engagement/personas.ts`:

```typescript
gandhi: {
  key: 'gandhi',
  displayName: 'Gandhi - The Thoughtful Voice',
  systemPrompt: `You are a thoughtful voice inspired by Mahatma Gandhi...`
}
```

To add your own persona, edit `/lib/engagement/personas.ts` and add to the `ENGAGEMENT_PERSONAS` object.

#### Step 3: Configure Engagement Targets

Edit `config/engagement-targets.json` to specify who this account should engage with:

```json
{
  "@Gandhi_Wisom_": {
    "priority_targets": [
      { "username": "@narendramodi", "description": "Prime Minister of India", "tier": 1 },
      { "username": "@dalailama", "description": "Spiritual leader", "tier": 1 },
      // ... more targets
    ],
    "engagement_persona": "gandhi",
    "rules": {
      "max_engagements_per_day": 4,
      "min_hours_between_same_target": 6
    }
  }
}
```

**Configuration Options:**
- `priority_targets`: Array of Twitter users to engage with
  - `username`: Twitter handle (with @)
  - `description`: Who they are (helps AI generate better replies)
  - `tier`: 1 = high priority, 2 = medium priority
- `engagement_persona`: Which AI persona to use (must match key in `personas.ts`)
- `rules`:
  - `max_engagements_per_day`: Daily limit of replies
  - `min_hours_between_same_target`: Cooldown period before re-engaging same user

#### Step 4: Add Engagement Schedule

Edit `lib/schedule.ts` to define when engagement happens:

```typescript
// 1. Add to handle mapping
const TWITTER_HANDLE_MAPPING: Record<string, string> = {
  '@Gandhi_Wisom_': 'gandhi_account',
  // ... other accounts
};

const SCHEDULE_KEY_TO_HANDLE: Record<string, string> = {
  'gandhi_account': '@Gandhi_Wisom_',
  // ... other accounts
};

// 2. Define engagement pattern (IST times)
const gandhiEngagementPattern: HourlySchedule = {
  7: ['engagement'],   // 7 AM IST
  12: ['engagement'],  // 12 PM IST
  18: ['engagement'],  // 6 PM IST
  21: ['engagement'],  // 9 PM IST
};

// 3. Add to account schedules
const ACCOUNT_SCHEDULES: Record<string, AccountSchedules> = {
  gandhi_account: {
    generation: {},  // Empty if no content generation
    posting: {},     // Empty if no posting
    engagement: {
      0: gandhiEngagementPattern, // Sunday
      1: gandhiEngagementPattern, // Monday
      2: gandhiEngagementPattern, // Tuesday
      3: gandhiEngagementPattern, // Wednesday
      4: gandhiEngagementPattern, // Thursday
      5: gandhiEngagementPattern, // Friday
      6: gandhiEngagementPattern, // Saturday
    },
  }
};
```

**Schedule Notes:**
- All times are in IST (Asia/Kolkata timezone)
- `HourlySchedule` maps hours (0-23) to activity types
- Use `['engagement']` for engagement activity
- Can have different patterns per day of week (0=Sunday, 6=Saturday)

#### Step 5: Set Up Cron Job

Add a cron job to trigger engagement at scheduled times:

**Vercel Cron (vercel.json):**
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

**Manual Cron (crontab):**
```bash
# Edit crontab
crontab -e

# Add line (runs at 7 AM, 12 PM, 6 PM, 9 PM IST daily)
0 7,12,18,21 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://yourapp.com/api/engage?twitter_handle=@Gandhi_Wisom_"
```

## Testing the Setup

### 1. Test with Debug Mode

```bash
# Test engagement (bypasses schedule check)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/engage?twitter_handle=@Gandhi_Wisom_&debug=true"
```

### 2. Verify Configuration

```bash
# Check account exists
curl "http://localhost:3000/api/accounts"

# Check engagement targets loaded
curl "http://localhost:3000/api/engage?twitter_handle=@Gandhi_Wisom_" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Check Database Logs

```sql
-- View engagement history
SELECT
  engaged_at,
  target_username,
  target_tweet_text,
  reply_text
FROM engagement_log
WHERE account_id = (
  SELECT id FROM accounts WHERE twitter_handle = '@Gandhi_Wisom_'
)
ORDER BY engaged_at DESC
LIMIT 10;
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                     Cron Trigger                        │
│         (Vercel Cron or Manual crontab)                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              /api/engage?twitter_handle=X               │
│                                                         │
│  1. Check schedule (lib/schedule.ts)                   │
│  2. Get account credentials (database)                  │
│  3. Load engagement config (config/engagement-targets)  │
│  4. Check daily limits (database)                       │
│  5. Scout for target activity (Twitter API)             │
│  6. Select best tweet to engage                         │
│  7. Generate reply with persona (lib/engagement/personas)│
│  8. Post reply (Twitter API)                            │
│  9. Log engagement (database)                           │
└─────────────────────────────────────────────────────────┘
```

## File Reference

| File | Purpose |
|------|---------|
| `lib/engagement/personas.ts` | AI engagement personas (voice/behavior) |
| `config/engagement-targets.json` | Target users and rules per account |
| `lib/schedule.ts` | Engagement schedules (when to engage) |
| `app/api/engage/route.ts` | Main engagement API endpoint |
| `lib/engagement/activityScout.ts` | Finds recent tweets from targets |
| `lib/engagement/selector.ts` | Picks best tweet to engage with |
| `lib/generationService.ts` | Generates AI replies |
| `lib/db.ts` | Database queries (logging, rate limits) |

## Common Issues

### Issue: "No engagement config found"
**Solution:** Ensure account handle in `engagement-targets.json` matches exactly (with @)

### Issue: "Engagement not scheduled"
**Solution:** Check schedule in `lib/schedule.ts` and verify IST timezone conversion

### Issue: "No recent activity from targets"
**Solution:**
- Verify target usernames are correct (check Twitter)
- Ensure Twitter API credentials have read permissions
- Check that targets are actually posting

### Issue: "Daily engagement limit reached"
**Solution:**
- Check `max_engagements_per_day` in config
- Query database to see engagement count: `SELECT COUNT(*) FROM engagement_log WHERE account_id = 'XXX' AND DATE(engaged_at) = CURRENT_DATE`

## Security Notes

1. **API Keys**: Never commit unencrypted API keys. Always use encryption:
   ```sql
   'enc:' || encode('YOUR_KEY'::bytea, 'base64')
   ```

2. **Cron Secret**: Set `CRON_SECRET` environment variable to protect the API endpoint

3. **Rate Limits**:
   - Twitter API: 15 requests per 15 minutes for user timeline
   - Engagement system handles this automatically with target rotation

## Next Steps

After setup:
1. Monitor initial engagements closely
2. Adjust `max_engagements_per_day` based on account growth
3. Refine target list based on engagement quality
4. Tune engagement persona prompts for better replies
5. Consider A/B testing different engagement times

## Example Accounts Configuration

### Content + Engagement Account
```typescript
prince_account: {
  generation: princeGenerationPattern,  // Posts original content
  posting: princePostingPattern,        // Posts at scheduled times
  engagement: princeEngagementPattern,  // Also engages with others
}
```

### Engagement-Only Account
```typescript
gandhi_account: {
  generation: {},   // No content generation
  posting: {},      // No posting
  engagement: gandhiEngagementPattern,  // Only engages
}
```

### Multi-Purpose Account
```typescript
gibbi_account: {
  generation: gibbiGenerationPattern,
  posting: gibbiPostingPattern,
  engagement: {}, // No engagement (content-focused)
}
```
