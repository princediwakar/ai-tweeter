# LinkedIn Integration Plan

**Goal:** Add LinkedIn posting alongside Twitter without refactoring existing code.

**Target Persona:** Satirist only (single posts)

---

## Phase 1: Database & Credentials

**Database Changes:**
```sql
-- Account credentials
ALTER TABLE accounts ADD COLUMN linkedin_access_token_encrypted TEXT;
ALTER TABLE accounts ADD COLUMN linkedin_refresh_token_encrypted TEXT;
ALTER TABLE accounts ADD COLUMN linkedin_user_id VARCHAR;
ALTER TABLE accounts ADD COLUMN linkedin_org_id VARCHAR;
ALTER TABLE accounts ADD COLUMN linkedin_enabled BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN linkedin_token_expires_at TIMESTAMP;

-- Tweet tracking (cross-posting support)
ALTER TABLE tweets ADD COLUMN linkedin_id VARCHAR;
```

**Cross-Posting Logic:**
- Same content posted to both Twitter and LinkedIn
- Each platform tracked independently via `twitter_id` and `linkedin_id`
- Status remains `ready` until both platforms posted
- Separate crons handle each platform

**Environment Variables:**
```
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=
```

**Notes:**
- Reuse `twitter_id` field to store LinkedIn post URNs
- Add `platform` metadata in future if needed

---

## Phase 2: LinkedIn API Integration

**Create `lib/linkedin.ts`:**
- OAuth 2.0 authentication
- `postToLinkedIn(content, imageUrl?, credentials)`
- `refreshAccessToken(refreshToken)`
- Image upload via LinkedIn's media API

**LinkedIn API Specs:**
- Auth: OAuth 2.0 (simpler than Twitter's OAuth 1.0a)
- Post endpoint: `POST /v2/ugcPosts`
- Scope needed: `w_member_social`
- Rate limit: 100 posts/day
- Character limit: 3000 chars
- Token expiry: 60 days (needs refresh)

**Create `app/auth/linkedin/route.ts`:**
- OAuth callback handler
- Store tokens in accounts table

---

## Phase 3: Content Adaptation

**Strategy:**

**Satirist (single tweets):**
- Post as-is to LinkedIn (200-500 chars works on both)
- Adjust hashtags: 2-3 professional tags max
- No thread consolidation needed

**Note:** Threading support (Business Storyteller) can be added later if needed

---

## Phase 4: Posting Service

**Create `app/api/auto-post-linkedin/route.ts`:**
```typescript
// Query logic - independent of Twitter
const readyTweets = await sql`
  SELECT * FROM tweets
  WHERE status IN ('ready', 'posted')
  AND linkedin_id IS NULL
  AND persona = 'satirist'
  AND account_id = ...
`;

// Post and update
await postToLinkedIn(tweet.content);
tweet.linkedin_id = result.id;

// Mark fully posted when both IDs exist
if (tweet.twitter_id && tweet.linkedin_id) {
  tweet.status = 'posted';
}
```

**Separate Crons:**
- Twitter: `GET /api/auto-post` (existing, runs per schedule)
- LinkedIn: `GET /api/auto-post-linkedin` (new, runs per schedule)
- Order depends on which schedule hits first

**Update `lib/schedule.ts`:**
```typescript
export const LINKEDIN_SCHEDULE = {
  princediwakar25: {
    satirist: [8, 12, 16], // IST hours
  }
};
```

**Posting Strategy:**
- Both platforms independent - whichever cron runs first posts first
- Each checks if their platform_id is null before posting
- Status changes to 'posted' only when both IDs exist
- Schedule offsets prevent racing conditions
- LinkedIn best times: Tue-Thu, 8-10 AM or 12-2 PM IST

---

## Phase 5: Automation

**Cron Job:**
```bash
# vercel.json or cron-job.org
GET /api/auto-post-linkedin
Authorization: Bearer CRON_SECRET
```

**Token Refresh:**
- Check `linkedin_token_expires_at` before posting
- Auto-refresh if < 7 days remaining
- Update encrypted tokens in DB

**Monitoring:**
- Add LinkedIn post tracking to dashboard
- Log to `tweets` table (reuse `twitter_id` for LinkedIn URN)

---

## Testing Checklist

**Phase 1:**
- [ ] Account credential columns added
- [ ] `linkedin_id` column added to tweets table
- [ ] Encryption working for LinkedIn tokens

**Phase 2:**
- [ ] OAuth flow connects account
- [ ] Can post single text post manually
- [ ] Image upload works

**Phase 3:**
- [ ] Single tweet posts correctly
- [ ] Hashtags formatted properly
- [ ] Content displays well on LinkedIn

**Phase 4:**
- [ ] Auto-post endpoint works
- [ ] Scheduled posts execute
- [ ] Token refresh works

---

## Timeline

- **Phase 1:** 1 day (DB + credentials)
- **Phase 2:** 2 days (API + OAuth)
- **Phase 3:** Half day (basic content checks)
- **Phase 4:** 1 day (posting service + schedule)

**Total:** 3-4 days

---

## Future Enhancements

- Thread consolidation for Business Storyteller persona
- Platform-specific analytics
- A/B test posting times
- Cross-platform engagement tracking
- Support for LinkedIn carousel posts
- Video support
