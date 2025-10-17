# Database Schema Documentation

**Database:** Neon PostgreSQL
**Project ID:** round-sun-88150229
**Connection:** `DATABASE_URL` environment variable

---

## Tables

### `accounts`
Stores multi-account Twitter credentials and configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique account identifier |
| `name` | VARCHAR | NOT NULL | Display name for the account |
| `twitter_handle` | VARCHAR | NOT NULL, UNIQUE | Twitter handle (with or without @) |
| `status` | VARCHAR | NOT NULL | Account status: 'active', 'inactive', 'suspended' |
| `twitter_api_key_encrypted` | TEXT | NOT NULL | Encrypted Twitter API key |
| `twitter_api_secret_encrypted` | TEXT | NOT NULL | Encrypted Twitter API secret |
| `twitter_access_token_encrypted` | TEXT | NOT NULL | Encrypted Twitter access token |
| `twitter_access_token_secret_encrypted` | TEXT | NOT NULL | Encrypted Twitter access token secret |
| `cloudinary_cloud_name_encrypted` | TEXT | NULLABLE | Encrypted Cloudinary cloud name |
| `cloudinary_api_key_encrypted` | TEXT | NULLABLE | Encrypted Cloudinary API key |
| `cloudinary_api_secret_encrypted` | TEXT | NULLABLE | Encrypted Cloudinary API secret |
| `personas` | JSONB | NOT NULL | Array of persona IDs available to this account |
| `branding` | JSONB | NOT NULL | Account branding config (theme, audience, tone, cta) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `PRIMARY KEY (id)`
- `UNIQUE (twitter_handle)`

**Sample `branding` JSON:**
```json
{
  "theme": "educational",
  "audience": "general",
  "tone": "professional",
  "cta_frequency": 5,
  "cta_message": "Follow for more!"
}
```

---

### `tweets`
Stores individual tweets and thread components.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | VARCHAR | PRIMARY KEY | Unique tweet identifier (generated) |
| `account_id` | UUID | NOT NULL, FOREIGN KEY → accounts(id) | Account that owns this tweet |
| `content` | TEXT | NOT NULL | Tweet text content (ready to post) |
| `hashtags` | JSONB | NOT NULL, DEFAULT '[]' | Array of hashtags (kept empty per project rules) |
| `persona` | VARCHAR | NOT NULL | Persona used to generate (e.g., 'english_vocab_builder') |
| `status` | VARCHAR | NOT NULL | Tweet status: 'ready', 'posted', 'failed', 'draft', 'scheduled' |
| `posted_at` | TIMESTAMP | NULLABLE | When tweet was posted to Twitter |
| `twitter_id` | VARCHAR | NULLABLE | Twitter's ID for posted tweet |
| `twitter_url` | VARCHAR | NULLABLE | Full URL to posted tweet |
| `error_message` | TEXT | NULLABLE | Error details if posting failed |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Tweet generation timestamp |
| `content_type` | VARCHAR | NOT NULL, DEFAULT 'single_tweet' | 'single_tweet' or 'thread' |
| `thread_id` | UUID | NULLABLE, FOREIGN KEY → threads(id) | Thread this tweet belongs to |
| `thread_sequence` | INTEGER | NULLABLE | Position in thread (1-indexed) |
| `parent_twitter_id` | VARCHAR | NULLABLE | Twitter ID of parent tweet for replies |
| `image_url` | VARCHAR | NULLABLE | Cloudinary URL for image tweets |
| `image_status` | VARCHAR | DEFAULT 'none' | 'none', 'pending', 'processing', 'completed', 'failed' |
| `card_data` | TEXT | NULLABLE | JSON-encoded VocabularyCard for async image generation |

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX (account_id)`
- `INDEX (status)`
- `INDEX (thread_id, thread_sequence)`
- `INDEX (image_status)` (for image queue processing)

**Important Notes:**
- `hashtags` field is kept empty; hashtags are embedded directly in `content`
- `content` is exactly what gets posted (no modifications during posting)
- Threading uses `thread_id` + `thread_sequence` for ordering

---

### `threads`
Stores thread metadata and posting progress.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique thread identifier |
| `account_id` | UUID | NOT NULL, FOREIGN KEY → accounts(id) | Account that owns this thread |
| `title` | VARCHAR | NOT NULL | Thread title/summary |
| `persona` | VARCHAR | NOT NULL | Persona used (e.g., 'business_storyteller') |
| `story_category` | VARCHAR | NOT NULL | Category (e.g., 'indian_business', 'cricket') |
| `total_tweets` | INTEGER | NOT NULL | Total number of tweets in thread |
| `current_tweet` | INTEGER | NOT NULL, DEFAULT 1 | Next tweet to post (1-indexed) |
| `parent_tweet_id` | VARCHAR | NULLABLE | Twitter ID of first tweet in thread |
| `status` | VARCHAR | NOT NULL | 'ready', 'posting', 'completed', 'failed' |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Thread creation timestamp |

**Indexes:**
- `PRIMARY KEY (id)`
- `INDEX (account_id)`
- `INDEX (status)` (for scheduled posting queries)

**Threading Workflow:**
1. Thread created with `status='ready'`
2. `startThreadPosting()` sets `status='posting'`,
3. Each posted tweet updates `current_tweet++`, 
4. When `current_tweet > total_tweets`, set `status='completed'`

---

## Relationships

```
accounts (1) ─────< (many) tweets
accounts (1) ─────< (many) threads
threads (1) ──────< (many) tweets (via thread_id)
```

---

## Multi-Account Support

All queries **must** filter by `account_id` to maintain account isolation:

```sql
-- ✅ CORRECT: Account-aware query
SELECT * FROM tweets WHERE account_id = $1 AND status = 'ready';

-- ❌ WRONG: Missing account filter
SELECT * FROM tweets WHERE status = 'ready';
```

---

## Common Queries

### Get active accounts
```sql
SELECT * FROM accounts WHERE status = 'active' ORDER BY created_at ASC;
```

### Get ready tweets for an account
```sql
SELECT * FROM tweets
WHERE account_id = $1 AND status = 'ready'
ORDER BY created_at ASC;
```

### Get thread with next scheduled tweet
```sql
SELECT * FROM threads
WHERE account_id = $1
  AND status = 'posting'
LIMIT 1;
```

### Get tweets needing image generation
```sql
SELECT * FROM tweets
WHERE (image_status = 'pending' OR image_status = 'failed')
  AND account_id = $1
ORDER BY created_at ASC
LIMIT 5;
```

---

## Encryption

Twitter and Cloudinary credentials are encrypted using a simple base64 encoding with `enc:` prefix:

```typescript
// Encryption (simplified for backward compatibility)
encrypted = "enc:" + base64(plaintext)

// Decryption
plaintext = base64_decode(encrypted.substring(4))
```

**Environment Variable:** `ENCRYPTION_KEY` (currently uses fallback)

---

## Access via Shell

Since MCP servers are disabled, use direct `psql` commands:

```bash
# Single query
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM accounts"

# Interactive shell
psql "$DATABASE_URL"
```

---

## Notes

- **No ORM**: Direct SQL queries via `@vercel/postgres` library
- **Account Isolation**: Enforced at application level, not database constraints
- **Thread Posting**: Uses 5-minute intervals between tweets
- **Image Generation**: Async queue-based processing (Cloudinary)
- **Hashtags**: Embedded in `content`, not stored separately
