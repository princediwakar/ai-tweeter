# Generation Configuration Mapping

This document maps all generation-related configuration values to their current locations in the codebase. Use this to refactor hardcoded values to use the centralized `lib/generation/config.ts` file.

## Configuration File Location
`lib/generation/config.ts` - Centralized configuration for all generation settings

---

## RSS Feed & Article Fetching

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `headlinesPerFeed` | `lib/contentSource.ts:136` | `2` | Headlines fetched per individual RSS feed |
| `maxTotalHeadlines` | `lib/contentSource.ts:168` | `20` | Maximum headlines from all business RSS feeds |
| `selectedHeadlinesForSatirist` | `lib/contentSource.ts:382` | `5` | Headlines passed to satirist enrichment |
| `cacheTTL` | `lib/contentSource.ts:36` | `5 * 60 * 1000` | Cache duration for RSS content |
| `fetchTimeout` | `lib/contentSource.ts:92, 126, 178` | `4000` | Timeout for RSS feed requests |

---

## Article Enrichment

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `maxConcurrent` | `lib/generation/articleEnricher.ts:199` | `3` | Concurrent article enrichment processes |
| `maxConcurrent` (call site) | `lib/contentSource.ts:386` | `3` | Where enrichArticles is called |
| `fullTextLimit` | `lib/generation/articleEnricher.ts:182` | `3000` | Max characters from article text |
t| `maxEntities` | `lib/generation/articleEnricher.ts:104` | `10` | Max entity names extracted |
| `articleFetchTimeout` | `lib/generation/articleEnricher.ts:147` | `8000` | Timeout for article page fetching |
| `homepageFetchTimeout` | `lib/generation/articleEnricher.ts:121` | `5000` | Timeout for homepage fetching (disabled) |
| `batchDelay` | `lib/generation/articleEnricher.ts:216` | `500` | Delay between enrichment batches |

---

## Deduplication

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `satiristSourceDays` | `lib/contentSource.ts:365` | `5` | Days to check for used satirist sources |
| `vocabularyWordDays` | `lib/generationService.ts:376` | `30` | Days to check for used vocabulary words |
| `vocabularyWordLimit` | `lib/generationService.ts:343` | `100` | Max recent vocabulary words to fetch |

**Database Query:** `lib/db.ts:890-927` - `getRecentSatiristSources(accountId, days)`

---

## Image Generation

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `satiristImagePercentage` | `lib/generationService.ts:96` | `1.0` (100%) | Changed from `Math.random() < 1` |

**Note:** Currently set to 100%. Every satirist tweet gets an image. Change to `0.3` for 30% image rate.

---

## AI Generation

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `temperature` | `lib/generationService.ts:270` | `0.9` | AI creativity parameter |
| `maxTokens` | `lib/generationService.ts:271` | `500` | Max tokens for AI response |
| `model` | `lib/generationService.ts:268` | `"deepseek-chat"` | AI model identifier |

---

## Batch Generation

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `defaultBatchSize` | `lib/schedule.ts:394` | `1` | Default batch size |
| `gibbiBatchSize` | `lib/schedule.ts:396` | `1` | Batch size for @gibbi_ai |
| `princeBatchSize` | `lib/schedule.ts:400-404` | `1` | Batch size for @princediwakar25 |

---

## Satirist Persona

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `availableHeadlinesInPrompt` | `lib/generation/personas/satirist.ts:20` | `5` | Headlines AI can choose from |
| `tweetTextCharLimit` | `lib/generation/personas/satirist.ts:37` | `250` | Text-only tweet limit |
| `imageFormatTweetTextLimit` | `lib/generation/personas/satirist.ts:157` | `120` | Image format hook limit |
| `imageContentCharLimit` | `lib/generation/personas/satirist.ts:159` | `240` | Image content limit |

---

## Content Source Feeds

| Config Value | Current Location | Current Value | Notes |
|-------------|------------------|---------------|-------|
| `feeds.business` | `lib/contentSource.ts:115-119` | 3 feeds | Indian startup/business RSS feeds |
| `feeds.cricket` | `lib/contentSource.ts:173` | 3 feeds | Cricket news RSS feeds |

**Business Feeds:**
- Indian Startup News RSS
- Inc42 Feed
- Economic Times Tech/Startups

**Cricket Feeds:**
- ESPN Cricinfo
- The Hindu Cricket
- NDTV Cricket

---

## Refactoring Guide

To migrate from hardcoded values to centralized config:

```typescript
// Before
const headlinesPerFeed = 2;

// After
import { GENERATION_CONFIG } from '@/lib/generation/config';
const headlinesPerFeed = GENERATION_CONFIG.rss.headlinesPerFeed;
```

### Priority Refactoring Tasks

1. **High Priority** - Values that change frequently:
   - `satiristImagePercentage`
   - `selectedHeadlinesForSatirist`
   - `satiristSourceDays`

2. **Medium Priority** - Values that may need tuning:
   - All AI generation configs (temperature, maxTokens)
   - Batch sizes
   - Cache TTL

3. **Low Priority** - Stable values:
   - Timeouts
   - Character limits (Twitter constraints)
   - Feed URLs

---

## Testing Impact

When changing these values, test the following:

- **RSS configs** → Run `/api/generate` endpoint
- **Enrichment configs** → Check article fetching logs
- **Deduplication** → Verify no duplicate content in consecutive generations
- **Image generation** → Check image creation rate matches percentage
- **AI configs** → Validate tweet quality and character limits
- **Batch sizes** → Verify correct number of tweets generated per cron run

---

## Environment-Specific Overrides

Consider adding environment variable overrides for frequently changed values:

```typescript
// Example: Allow runtime override via env var
satiristImagePercentage: parseFloat(process.env.SATIRIST_IMAGE_PERCENTAGE || '1.0'),
```
