# Multi-Account Engagement System - Setup Summary

## ✅ What's Been Completed

### 1. Created Multi-Account Engagement Architecture

The system now supports multiple Twitter accounts, each with:
- **Their own AI persona** (different voices/styles)
- **Their own target lists** (who to engage with)
- **Their own schedules** (when to engage)
- **Their own rate limits** (daily caps, cooldowns)

### 2. Added Gandhi Wisdom Account (@gandhi_wisdom_)

**Engagement Persona:**
- Name: "Gandhi - The Thoughtful Voice"
- Style: Compassionate, wisdom-based, peaceful
- Philosophy: Ahimsa, Satya, moral clarity

**Target Accounts (12):**
- Tier 1: @narendramodi, @RahulGandhi, @dalailama, @UN, @Malala, @sudhamurty, @KailashOnline
- Tier 2: @amnesty, @UNHumanRights, @BBCWorld, @ArvindKejriwal, @ndtv

**Schedule (IST):**
- 7 AM - Morning engagement
- 12 PM - Midday response
- 6 PM - Evening discussions
- 9 PM - Night reflections

**Rate Limits:**
- Max 4 engagements per day
- 6 hours cooldown between same target

### 3. Files Created/Modified

**New Files:**
```
lib/engagement/personas.ts                    # Engagement AI personas
docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md        # Complete setup guide
docs/GANDHI_ACCOUNT_SETUP.md                  # Gandhi-specific quickstart
scripts/add-gandhi-account.sql                # Database setup script
scripts/test-gandhi-config.js                 # Configuration validator
```

**Modified Files:**
```
lib/generationService.ts                      # Updated to use new persona system
app/api/engage/route.ts                       # Simplified to use persona keys
config/engagement-targets.json                # Added Gandhi config
lib/schedule.ts                               # Added Gandhi schedule
CLAUDE.md                                     # Updated project docs
```

### 4. Testing Completed

✅ TypeScript compilation successful
✅ Configuration validation passed
✅ All engagement personas loaded correctly
✅ Schedule mapping verified
✅ Target lists validated

## 📋 Next Steps to Activate Gandhi Account

### Step 1: Get Twitter API Credentials

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create app for @gandhi_wisdom_ account
3. Set permissions to **Read and Write**
4. Copy these credentials:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

### Step 2: Add to Database

```bash
# Edit the SQL file with your credentials
nano scripts/add-gandhi-account.sql

# Replace YOUR_TWITTER_* with actual credentials, then run:
psql "$DATABASE_URL" -f scripts/add-gandhi-account.sql

# Verify
psql "$DATABASE_URL" -c "SELECT id, twitter_handle FROM accounts WHERE twitter_handle = '@gandhi_wisdom_';"
```

### Step 3: Set Up Cron Job

**For Vercel (Recommended):**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/engage?twitter_handle=@gandhi_wisdom_",
      "schedule": "0 7,12,18,21 * * *"
    }
  ]
}
```

**For Manual Cron:**
```bash
crontab -e

# Add this line:
0 7,12,18,21 * * * curl -H "Authorization: Bearer $CRON_SECRET" "https://yourapp.com/api/engage?twitter_handle=@gandhi_wisdom_"
```

### Step 4: Test

```bash
# Test configuration
node scripts/test-gandhi-config.js

# Test engagement (debug mode - bypasses schedule)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/engage?twitter_handle=@gandhi_wisdom_&debug=true"

# Check logs
psql "$DATABASE_URL" -c "SELECT * FROM engagement_log WHERE account_id = (SELECT id FROM accounts WHERE twitter_handle = '@gandhi_wisdom_') ORDER BY engaged_at DESC LIMIT 5;"
```

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MULTI-ACCOUNT SYSTEM                   │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────┐                  ┌────────▼─────────┐
│ @princediwakar25│                 │  @gandhi_wisdom_  │
│                │                  │                  │
│ Persona:       │                  │ Persona:         │
│ the_catalyst   │                  │ gandhi           │
│                │                  │                  │
│ Targets:       │                  │ Targets:         │
│ - Founders     │                  │ - Leaders        │
│ - VCs          │                  │ - Activists      │
│ - Tech leaders │                  │ - Politicians    │
│                │                  │                  │
│ Schedule:      │                  │ Schedule:        │
│ 9 AM, 1 PM,    │                  │ 7 AM, 12 PM,     │
│ 8 PM IST       │                  │ 6 PM, 9 PM IST   │
│                │                  │                  │
│ Limit: 3/day   │                  │ Limit: 4/day     │
└────────────────┘                  └──────────────────┘
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md** | Complete guide for adding any new account |
| **docs/GANDHI_ACCOUNT_SETUP.md** | Quick start guide specifically for Gandhi |
| **docs/DATABASE_SCHEMA.md** | Database schema including engagement_log |
| **CLAUDE.md** | Updated project context with engagement system |

## 🎯 How to Add More Accounts

Follow this pattern (documented in detail in MULTI_ACCOUNT_ENGAGEMENT_SETUP.md):

1. **Create engagement persona** in `lib/engagement/personas.ts`
2. **Add to targets config** in `config/engagement-targets.json`
3. **Add to schedule** in `lib/schedule.ts`
4. **Add to database** using SQL script template
5. **Set up cron** for the account

**Example personas you could add:**
- `@tech_monk` → Zen-like tech wisdom persona
- `@data_detective` → Sherlock Holmes style data analysis
- `@friendly_neighbor` → Mr. Rogers style community building
- `@midnight_poet` → Late night philosophical musings

## 🔐 Security Checklist

- [x] Engagement personas created with safe prompts
- [x] Rate limits configured to prevent spam
- [x] Database encryption for API credentials
- [x] CRON_SECRET authentication required
- [ ] Twitter API credentials added to database (YOUR TASK)
- [ ] Cron job configured (YOUR TASK)

## 🧪 Testing Commands

```bash
# Validate configuration
node scripts/test-gandhi-config.js

# Build check
npm run build

# Lint check
npm run lint

# Test engagement (local, debug mode)
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/engage?twitter_handle=@gandhi_wisdom_&debug=true"

# Check database
psql "$DATABASE_URL" -c "SELECT * FROM engagement_log ORDER BY engaged_at DESC LIMIT 10;"
```

## 📊 Monitoring

**Daily Checklist:**
1. Check engagement count: Did it reach daily limit?
2. Review reply quality: Are responses on-brand?
3. Monitor response rate: Are targets engaging back?
4. Check error logs: Any failed engagements?

**Database Queries:**
```sql
-- Daily engagement count
SELECT COUNT(*) FROM engagement_log
WHERE account_id = (SELECT id FROM accounts WHERE twitter_handle = '@gandhi_wisdom_')
AND DATE(engaged_at) = CURRENT_DATE;

-- Recent engagements
SELECT engaged_at, target_username,
       LEFT(reply_text, 50) as reply
FROM engagement_log
WHERE account_id = (SELECT id FROM accounts WHERE twitter_handle = '@gandhi_wisdom_')
ORDER BY engaged_at DESC LIMIT 10;

-- Success rate by target
SELECT target_username, COUNT(*) as engagement_count
FROM engagement_log
WHERE account_id = (SELECT id FROM accounts WHERE twitter_handle = '@gandhi_wisdom_')
GROUP BY target_username
ORDER BY engagement_count DESC;
```

## 🚀 Current Status

✅ Code complete and tested
✅ Configuration validated
✅ Documentation written
⏳ **PENDING**: Database credentials setup
⏳ **PENDING**: Cron job activation

## 📞 Support

If you encounter issues:

1. **Check configuration**: `node scripts/test-gandhi-config.js`
2. **Review logs**: Check console output for errors
3. **Test connectivity**: Verify Twitter API credentials
4. **Debug mode**: Use `?debug=true` to bypass schedule checks
5. **Documentation**: See `docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md`

---

**Ready to activate?** Follow Steps 1-4 above to bring the Gandhi account online! 🕊️
