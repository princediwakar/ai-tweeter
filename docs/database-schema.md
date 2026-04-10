# Database Schema - AI Tweeter

Generated from Neon database `ai-tweeter` (Project ID: `round-sun-88150229`)

## Overview

| Table | Schema | Size |
|-------|--------|------|
| users | public | 112 kB |
| sessions | public | 40 kB |
| connected_accounts | public | 128 kB |
| account_credentials | public | 64 kB |
| account_schedules | public | 112 kB |
| generation_slots | public | 120 kB |
| personas | public | 200 kB |
| posts | public | 304 kB |
| threads | public | 80 kB |
| social_posts | public | 40 kB |
| posting_jobs | public | 160 kB |
| global_integrations | public | 48 kB |
| oauth_states | public | 48 kB |

---

## users

Core user table with authentication and onboarding data.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| name | varchar | NULL | - | - |
| email | varchar | NOT NULL | - | UNIQUE |
| email_verified | timestamptz | NULL | - | - |
| image | text | NULL | - | - |
| created_at | timestamptz | NOT NULL | now() | - |
| updated_at | timestamptz | NOT NULL | now() | - |
| hashed_password | text | NULL | - | - |
| is_admin | boolean | NULL | false | - |
| plan | varchar | NULL | 'free' | - |
| onboarding_completed | boolean | NULL | false | - |
| onboarding_step | integer | NULL | 1 | - |
| onboarding_topics | text[] | NULL | '{}' | - |
| onboarding_post_frequency | integer | NULL | 3 | - |
| onboarding_post_time | varchar | NULL | 'morning' | - |

**Indexes:**
- `users_pkey` - UNIQUE on (id)
- `users_email_key` - UNIQUE on (email)
- `idx_users_email` - on (email)
- `idx_users_email_verified` - on (email_verified)

---

## sessions

User session tokens for authentication.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| user_id | uuid | NOT NULL | - | FK -> users(id) |
| expires | timestamptz | NOT NULL | - | - |
| session_token | varchar | NOT NULL | - | UNIQUE |
| created_at | timestamptz | NOT NULL | now() | - |

**Indexes:**
- `sessions_pkey` - UNIQUE on (id)
- `sessions_session_token_key` - UNIQUE on (session_token)
- `idx_sessions_user_id` - on (user_id)
- `idx_sessions_session_token` - on (session_token)
- `idx_sessions_expires` - on (expires)

**Foreign Keys:**
- `sessions_user_id_fkey` -> users(id) ON DELETE CASCADE

---

## connected_accounts

Connected social media accounts (Twitter, LinkedIn).

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| user_id | uuid | NOT NULL | - | FK -> users(id) |
| platform | varchar | NOT NULL | - | CHECK: 'twitter' or 'linkedin' |
| account_username | varchar | NOT NULL | - | - |
| platform_user_id | varchar | NULL | - | - |
| is_active | boolean | NULL | true | - |
| connected_at | timestamp | NULL | now() | - |
| name | varchar | NULL | - | - |
| status | varchar | NULL | 'active' | - |
| updated_at | timestamp | NULL | now() | - |

**Indexes:**
- `connected_accounts_pkey` - UNIQUE on (id)
- `connected_accounts_user_id_platform_account_username_key` - UNIQUE on (user_id, platform, account_username)
- `idx_connected_accounts_user` - on (user_id)
- `idx_connected_accounts_platform` - on (platform)
- `idx_connected_accounts_username` - on (account_username)

**Constraints:**
- CHECK: platform IN ('twitter', 'linkedin')

**Foreign Keys:**
- `connected_accounts_user_id_fkey` -> users(id) ON DELETE CASCADE

---

## account_credentials

OAuth/API credentials for connected accounts.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| connected_account_id | uuid | NOT NULL | - | FK -> connected_accounts(id) |
| auth_type | varchar | NOT NULL | - | CHECK: 'oauth1', 'oauth2', or 'api_key' |
| access_token_encrypted | text | NULL | - | - |
| refresh_token_encrypted | text | NULL | - | - |
| token_expires_at | timestamptz | NULL | - | - |
| api_key_encrypted | text | NULL | - | - |
| api_secret_encrypted | text | NULL | - | - |
| is_active | boolean | NULL | true | - |
| created_at | timestamptz | NULL | now() | - |
| updated_at | timestamptz | NULL | now() | - |

**Indexes:**
- `account_credentials_pkey` - UNIQUE on (id)
- `account_credentials_connected_account_id_auth_type_key` - UNIQUE on (connected_account_id, auth_type)
- `idx_account_credentials_account` - on (connected_account_id)

**Constraints:**
- CHECK: auth_type IN ('oauth1', 'oauth2', 'api_key')

**Foreign Keys:**
- `account_credentials_connected_account_id_fkey` -> connected_accounts(id) ON DELETE CASCADE

---

## account_schedules

Posting schedules for connected accounts.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| name | text | NOT NULL | - | - |
| timezone | text | NULL | 'UTC' | - |
| schedule_config | jsonb | NULL | '{}' | - |
| days_of_week | integer[] | NULL | '{0,1,2,3,4,5,6}' | - |
| start_time | integer | NULL | 0 | - |
| end_time | integer | NULL | 1439 | - |
| is_active | boolean | NULL | true | - |
| max_posts_per_day | integer | NULL | 10 | - |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |
| connected_account_id | uuid | NULL | - | FK -> connected_accounts(id) |
| persona_id | uuid | NULL | - | FK -> personas(id) |

**Indexes:**
- `account_schedules_pkey` - UNIQUE on (id)
- `idx_account_schedules_connected_account` - on (connected_account_id)
- `idx_account_schedules_active` - on (connected_account_id, is_active) WHERE is_active = true
- `idx_account_schedules_lookup` - on (connected_account_id, persona_id, is_active)

**Foreign Keys:**
- `account_schedules_connected_account_id_fkey` -> connected_accounts(id) ON DELETE CASCADE
- `account_schedules_persona_id_fkey` -> personas(id) ON DELETE SET NULL

---

## generation_slots

Daily generation slots for AI content creation.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| connected_account_id | uuid | NOT NULL | - | FK -> connected_accounts(id) |
| schedule_id | uuid | NULL | - | FK -> account_schedules(id) |
| slot_date | date | NOT NULL | - | - |
| slot_hour | integer | NOT NULL | - | - |
| slot_minute | integer | NOT NULL | - | - |
| generation_count | integer | NULL | 0 | - |
| last_generated_at | timestamptz | NULL | - | - |
| created_at | timestamptz | NULL | now() | - |
| updated_at | timestamptz | NULL | now() | - |
| posting_count | integer | NULL | 0 | - |
| last_posted_at | timestamptz | NULL | - | - |

**Indexes:**
- `generation_slots_pkey` - UNIQUE on (id)
- `generation_slots_connected_account_id_slot_date_slot_hour_s_key` - UNIQUE on (connected_account_id, slot_date, slot_hour, slot_minute)
- `idx_generation_slots_lookup` - on (connected_account_id, slot_date, slot_hour, slot_minute)
- `idx_generation_slots_time` - on (slot_date, slot_hour, slot_minute) WHERE generation_count = 0
- `idx_generation_slots_schedule_id` - on (schedule_id, slot_date)
- `generation_slots_schedule_slot_unique` - UNIQUE on (connected_account_id, schedule_id, slot_date)

**Foreign Keys:**
- `generation_slots_connected_account_id_fkey` -> connected_accounts(id) ON DELETE CASCADE
- `generation_slots_schedule_id_fkey` -> account_schedules(id) ON DELETE CASCADE

---

## personas

AI persona configurations for content generation.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| name | varchar | NOT NULL | - | - |
| description | text | NULL | - | - |
| config | jsonb | NULL | '{}' | - |
| min_length | integer | NULL | 200 | - |
| max_length | integer | NULL | 280 | - |
| tone | varchar | NULL | - | - |
| topics | text[] | NULL | - | - |
| is_active | boolean | NULL | true | - |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |
| connected_account_id | uuid | NULL | - | FK -> connected_accounts(id) |
| rss_sources | jsonb | NULL | '[]' | - |
| is_default | boolean | NULL | false | - |
| key | varchar | NULL | - | - |

**Indexes:**
- `personas_pkey` - UNIQUE on (id)
- `idx_personas_account` - on (connected_account_id)
- `idx_personas_active` - on (connected_account_id, is_active) WHERE is_active = true
- `personas_key_per_account` - UNIQUE on (connected_account_id, key) WHERE key IS NOT NULL

**Foreign Keys:**
- `personas_connected_account_id_fkey` -> connected_accounts(id) ON DELETE CASCADE

---

## posts

Generated posts/tweets content.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | text | NOT NULL | - | PRIMARY KEY |
| content | text | NOT NULL | - | - |
| hashtags | jsonb | NULL | '[]' | - |
| persona | text | NOT NULL | - | - |
| posted_at | timestamptz | NULL | - | - |
| error_message | text | NULL | - | - |
| status | text | NOT NULL | 'draft' | CHECK |
| created_at | timestamptz | NOT NULL | now() | - |
| thread_id | uuid | NULL | - | FK -> threads(id) |
| thread_sequence | integer | NULL | - | - |
| content_type | varchar | NULL | 'single_tweet' | - |
| image_url | text | NULL | - | - |
| image_status | varchar | NULL | 'none' | CHECK |
| card_data | text | NULL | - | - |
| source_url | text | NULL | - | - |
| user_id | uuid | NULL | - | FK -> users(id) |
| connected_account_id | uuid | NULL | - | FK -> connected_accounts(id) |
| schedule_id | uuid | NULL | - | FK -> account_schedules(id) |
| persona_id | uuid | NULL | - | FK -> personas(id) |

**Indexes:**
- `posts_pkey` - UNIQUE on (id)
- `idx_posts_created_at` - on (created_at DESC)
- `idx_posts_status` - on (status)
- `idx_posts_thread_sequence` - on (thread_id, thread_sequence)
- `idx_posts_content_type` - on (content_type, status)
- `idx_posts_image_status` - on (image_status, created_at) WHERE image_status = 'pending'
- `idx_posts_user` - on (user_id)
- `idx_posts_connected_account_id` - on (connected_account_id)
- `idx_posts_account_status` - on (connected_account_id, status)
- `idx_posts_persona` - on (persona)
- `idx_posts_persona_id` - on (persona_id)
- `idx_posts_schedule_id` - on (schedule_id)

**Constraints:**
- CHECK: status IN ('draft', 'scheduled', 'ready', 'posted', 'failed')
- CHECK: image_status IN ('none', 'pending', 'processing', 'completed', 'failed')

**Foreign Keys:**
- `posts_user_id_fkey` -> users(id) ON DELETE SET NULL
- `posts_connected_account_id_fkey` -> connected_accounts(id) ON DELETE SET NULL
- `posts_persona_id_fkey` -> personas(id) ON DELETE SET NULL
- `posts_schedule_id_fkey` -> account_schedules(id) ON DELETE SET NULL
- `posts_thread_id_fkey` -> threads(id) ON DELETE SET NULL

---

## threads

Thread (multi-tweet) groupings.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | - | PRIMARY KEY |
| title | varchar | NULL | - | - |
| persona | varchar | NULL | - | - |
| total_tweets | integer | NULL | - | - |
| current_tweet | integer | NULL | 1 | - |
| parent_tweet_id | varchar | NULL | - | - |
| status | varchar | NULL | 'ready' | - |
| story_category | varchar | NULL | - | - |
| created_at | timestamp | NULL | now() | - |
| connected_account_id | uuid | NULL | - | FK -> connected_accounts(id) |

**Indexes:**
- `threads_pkey` - UNIQUE on (id)
- `idx_threads_connected_account` - on (connected_account_id)
- `idx_threads_status` - on (status)
- `idx_threads_account_status` - on (connected_account_id, status)
- `idx_threads_created_at` - on (created_at)

**Foreign Keys:**
- `threads_connected_account_id_fkey` -> connected_accounts(id) ON DELETE SET NULL

---

## social_posts

Posted content to social platforms with platform IDs.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | gen_random_uuid() | PRIMARY KEY |
| post_id | uuid | NOT NULL | - | FK -> posts(id) |
| platform | varchar | NOT NULL | - | CHECK: 'twitter' or 'linkedin' |
| platform_post_id | varchar | NULL | - | - |
| platform_post_url | text | NULL | - | - |
| metadata | jsonb | NULL | '{}' | - |
| created_at | timestamptz | NULL | now() | - |

**Indexes:**
- `social_posts_pkey` - UNIQUE on (id)
- `social_posts_post_id_platform_key` - UNIQUE on (post_id, platform)
- `idx_social_posts_post` - on (post_id)
- `idx_social_posts_platform` - on (platform)

**Constraints:**
- CHECK: platform IN ('twitter', 'linkedin')

---

## posting_jobs

Batch posting job tracking.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| account_id | uuid | NOT NULL | - | FK -> connected_accounts(id) |
| platform | varchar | NOT NULL | - | CHECK: 'twitter' or 'linkedin' |
| status | varchar | NOT NULL | 'pending' | CHECK |
| batch_index | integer | NULL | 0 | - |
| tweets_count | integer | NULL | 0 | - |
| attempts | integer | NULL | 0 | - |
| max_attempts | integer | NULL | 3 | - |
| error_message | text | NULL | - | - |
| started_at | timestamp | NULL | - | - |
| completed_at | timestamp | NULL | - | - |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |
| user_id | uuid | NULL | - | FK -> users(id) |
| schedule_id | uuid | NULL | - | FK -> account_schedules(id) |
| scheduled_date | date | NULL | - | - |

**Indexes:**
- `posting_jobs_pkey` - UNIQUE on (id)
- `idx_posting_jobs_status` - on (status, created_at) WHERE status IN ('pending', 'processing')
- `idx_posting_jobs_account_platform` - on (account_id, platform)
- `idx_posting_jobs_created` - on (created_at DESC)
- `idx_posting_jobs_platform_status` - on (platform, status)
- `unique_posting_job_per_schedule_day` - UNIQUE on (account_id, platform, schedule_id, scheduled_date)
- `idx_posting_jobs_schedule` - on (schedule_id)
- `idx_posting_jobs_scheduled_date` - on (scheduled_date)
- `idx_posting_jobs_user` - on (user_id)

**Constraints:**
- CHECK: platform IN ('twitter', 'linkedin')
- CHECK: status IN ('pending', 'processing', 'completed', 'failed')

**Foreign Keys:**
- `posting_jobs_account_id_fkey` -> connected_accounts(id) ON DELETE CASCADE
- `posting_jobs_user_id_fkey` -> users(id) ON DELETE CASCADE
- `posting_jobs_schedule_id_fkey` -> account_schedules(id) ON DELETE CASCADE

---

## global_integrations

Global API keys and platform settings.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| id | uuid | NOT NULL | uuid_generate_v4() | PRIMARY KEY |
| setting_key | varchar | NOT NULL | - | UNIQUE |
| api_key_encrypted | text | NULL | - | - |
| api_secret_encrypted | text | NULL | - | - |
| client_id_encrypted | text | NULL | - | - |
| client_secret_encrypted | text | NULL | - | - |
| cloud_name | text | NULL | - | - |
| extra_settings | jsonb | NULL | '{}' | - |
| is_active | boolean | NULL | true | - |
| created_at | timestamp | NULL | now() | - |
| updated_at | timestamp | NULL | now() | - |

**Indexes:**
- `platform_settings_pkey` - UNIQUE on (id)
- `platform_settings_setting_key_key` - UNIQUE on (setting_key)

---

## oauth_states

OAuth state tokens for OAuth flow validation.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| state | varchar | NOT NULL | - | PRIMARY KEY |
| code_verifier | text | NULL | - | - |
| user_email | varchar | NOT NULL | - | - |
| platform | varchar | NOT NULL | - | - |
| created_at | timestamp | NULL | now() | - |
| is_signup | boolean | NULL | false | - |

**Indexes:**
- `oauth_states_pkey` - UNIQUE on (state)
- `idx_oauth_states_created` - on (created_at)

---

## ER Diagram

```
users
  │
  ├── sessions (user_id)
  │
  └── connected_accounts (user_id)
        │
        ├── account_credentials (connected_account_id)
        ├── account_schedules (connected_account_id)
        │     │
        │     └── generation_slots (schedule_id, connected_account_id)
        │
        ├── personas (connected_account_id)
        │
        ├── threads (connected_account_id)
        │
        └── posts (connected_account_id, user_id, persona_id, schedule_id, thread_id)
              │
              └── social_posts (post_id)

  posting_jobs (account_id, user_id, schedule_id)
        │
        └── (references connected_accounts, users, account_schedules)

global_integrations (standalone)

oauth_states (standalone)
```

---

## Notes

- PostgreSQL version: 17
- Primary keys use `uuid_generate_v4()` or `gen_random_uuid()` for IDs
- All tables include `created_at` and `updated_at` timestamps where applicable
- Token/credential columns are encrypted (suffix: `_encrypted`)
- Foreign keys use CASCADE or SET NULL deletion strategies
- Check constraints enforce platform values ('twitter', 'linkedin')