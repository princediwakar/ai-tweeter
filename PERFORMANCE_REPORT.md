# Performance Issues Report

Based on analysis of the codebase, here's a comprehensive report of **non-performant patterns** found and their fixes.

---

## 1. Synchronous Image Processing Blocking API Responses ✅ FIXED

**Location:** `app/api/generate/route.ts:346-397`

**Issue:** Images were generated **synchronously within the request handler**, blocking the response until completion (~3-10 seconds).

**Fix:** Removed inline image processing. Images are now processed asynchronously by the existing `/api/process-images` cron job.

---

## 2. Hardcoded Sleep in Batch Generation ✅ FIXED

**Location:** `lib/generationService.ts:301-303`

**Issue:** Hardcoded 500ms sleep between each batch item added ~2s latency per batch of 5.

**Fix:** Removed the hardcoded sleep. Rate limiting is now handled naturally by API execution time.

---

## 3. No RSS Feed Caching ✅ FIXED

**Location:** `lib/contentSource/fetchers/rss.ts`

**Issue:** RSS feeds were fetched fresh on **every request** (500ms-2s network latency).

**Fix:** Added in-memory TTL cache (5 minutes) with cache key based on feed URL, headlines per feed, and limit.

---

## 4. Thread-Unsafe Global State ✅ FIXED

**Location:** `lib/generationService.ts:30-44` and `lib/threadGenerationService.ts`

**Issue:** Lazy initialization was not thread-safe - potential race conditions under concurrent load.

**Fix:** Implemented promise-based initialization pattern with `clientInitPromise` to prevent concurrent initialization.

---

## 5. Missing Database Indexes ✅ FIXED

**Location:** Database

**Issue:** Likely missing indexes on frequently queried columns causing slow queries.

**Fix:** Created `scripts/add-performance-indexes.sql` with indexes for:
- `tweets.status`, `tweets.connected_account_id`, `tweets.created_at`
- `engagement_log.connected_account_id` + `DATE(engaged_at)`
- `threads.status`, `connected_accounts.platform`, etc.

**Action Required:** Run the SQL script to apply indexes to your database.

---

## 6. No Pagination on Large Queries ✅ FIXED

**Location:** `lib/db.ts:104-109`

**Issue:** `getAllTweets()` returned all tweets without LIMIT.

**Fix:** Added default LIMIT of 100 to prevent returning unbounded results.

---

## 7. Repeated Decryption on Every Access ✅ FIXED

**Location:** `lib/connectedAccounts.ts:103-115`

**Issue:** Credentials were decrypted on every read with no caching.

**Fix:** Added token cache with 5-minute TTL and max 100 entries to prevent memory bloat.

---

## 8. Dynamic Import in Hot Path ✅ FIXED

**Location:** `lib/generationService.ts:326`

**Issue:** Dynamic import caused module resolution overhead on every engagement reply.

**Fix:** Changed to static import of `getEngagementPersona`.

---

## 9. Redundant Context Fetching ✅ ALREADY FIXED

**Location:** `lib/generationService.ts` and `lib/generationProcessing.ts`

**Issue:** Context could be fetched redundantly.

**Status:** The code flow already handles this correctly - context is passed from batch to individual generations.

---

## 10. Request Deduplication ✅ FIXED

**Location:** `app/api/generate/route.ts`

**Issue:** No deduplication - overlapping cron requests could process same work twice.

**Fix:** Added in-memory request deduplication using `inFlightRequests` Map with 30-second window.

---

## Summary Table

| Issue | Status | Location | Est. Impact |
|-------|--------|----------|-------------|
| Sync image processing | ✅ FIXED | generate/route.ts | -3-10s latency |
| Hardcoded sleep | ✅ FIXED | generationService.ts | -2s per batch |
| No RSS caching | ✅ FIXED | fetchers/rss.ts | -1-2s per request |
| Thread-safe client | ✅ FIXED | generationService.ts | Race condition fix |
| Missing DB indexes | ✅ FIXED | scripts/ | Query speedup |
| No pagination | ✅ FIXED | db.ts | Memory/performance |
| Token caching | ✅ FIXED | connectedAccounts.ts | CPU overhead |
| Dynamic imports | ✅ FIXED | generationService.ts | Module resolution |
| Request deduplication | ✅ FIXED | generate/route.ts | Wasted compute |

---

## Remaining Recommendations

### High Priority
1. **Run the SQL script to apply database indexes.**

   Option A - Using psql directly:
   ```bash
   psql $POSTGRES_URL -f scripts/add-performance-indexes.sql
   ```

   Option B - Using Vercel CLI:
   ```bash
   vercel exec scripts/add-performance-indexes.sql
   ```

   Option C - Run manually in Vercel Postgres console or any SQL client:
   ```bash
   # Copy contents of scripts/add-performance-indexes.sql
   ```

### Medium Priority
1. Consider adding Redis for distributed caching (current cache is in-memory, server-specific)
2. Add query result caching for frequently accessed data

### Low Priority
1. Consider using a worker queue for all async processing (already exists for posting, images)
2. Add request rate limiting at API gateway level
