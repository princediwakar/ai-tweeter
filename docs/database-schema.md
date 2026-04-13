# Database Schema - ai-tweeter

## Tables

- [account_schedules](#account_schedules)
- [blog_sources](#blog_sources)
- [connected_accounts](#connected_accounts)
- [generation_slots](#generation_slots)
- [global_integrations](#global_integrations)
- [oauth_states](#oauth_states)
- [personas](#personas)
- [posting_jobs](#posting_jobs)
- [posts](#posts)
- [sessions](#sessions)
- [social_posts](#social_posts)
- [threads](#threads)
- [users](#users)

---

## account_schedules

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| name | text | NOT NULL | |
| timezone | text | NULL | 'UTC'::text |
| schedule_config | jsonb | NULL | '{}'::jsonb |
| days_of_week | ARRAY | NULL | '{0,1,2,3,4,5,6}'::integer[] |
| start_time | integer | NULL | 0 |
| end_time | integer | NULL | 1439 |
| is_active | boolean | NULL | true |
| max_posts_per_day | integer | NULL | 10 |
| created_at | timestamp without time zone | NULL | now() |
| updated_at | timestamp without time zone | NULL | now() |
| connected_account_id | uuid | NULL | |
| persona_id | uuid | NULL | |

**Indexes:**
- `account_schedules_pkey` - UNIQUE btree on (id)
- `idx_account_schedules_connected_account` - btree on (connected_account_id)
- `idx_account_schedules_active` - btree on (connected_account_id, is_active) WHERE is_active = true
- `idx_account_schedules_lookup` - btree on (connected_account_id, persona_id, is_active)

**Constraints:**
- PRIMARY KEY (id)
- FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL
- FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE

**Size:** 8 KB table, 104 KB indexes

---

## blog_sources

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| name | text | NOT NULL | |
| url | text | NOT NULL | |
| feed_url | text | NOT NULL | |
| category | text | NOT NULL | |
| topics | ARRAY | NULL | '{}'::text[] |
| is_active | boolean | NULL | true |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |

**Indexes:**
- `blog_sources_pkey` - UNIQUE btree on (id)
- `idx_blog_sources_category` - btree on (category)
- `idx_blog_sources_topics` - gin on (topics)
- `idx_blog_sources_active` - btree on (is_active) WHERE is_active = true
- `idx_blog_sources_url` - UNIQUE btree on (url)

**Constraints:**
- PRIMARY KEY (id)

**Size:** 32 KB table, 152 KB indexes

---

## connected_accounts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| user_id | uuid | NOT NULL | |
| platform | character varying | NOT NULL | |
| account_username | character varying | NOT NULL | |
| platform_user_id | character varying | NULL | |
| is_active | boolean | NULL | true |
| connected_at | timestamp without time zone | NULL | now() |
| name | character varying | NULL | |
| status | character varying | NULL | 'active'::character varying |
| updated_at | timestamp without time zone | NULL | now() |
| auth_type | character varying | NULL | 'oauth2'::character varying |
| access_token_encrypted | text | NULL | |
| refresh_token_encrypted | text | NULL | |
| token_expires_at | timestamp with time zone | NULL | |
| api_key_encrypted | text | NULL | |
| api_secret_encrypted | text | NULL | |

**Platforms:** twitter, linkedin

**Indexes:**
- `connected_accounts_pkey` - UNIQUE btree on (id)
- `connected_accounts_user_id_platform_account_username_key` - UNIQUE btree on (user_id, platform, account_username)
- `idx_connected_accounts_user` - btree on (user_id)
- `idx_connected_accounts_platform` - btree on (platform)
- `idx_connected_accounts_username` - btree on (account_username)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (user_id, platform, account_username)
- CHECK (platform IN ('twitter', 'linkedin'))
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**Size:** 16 KB table, 112 KB indexes

---

## generation_slots

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| connected_account_id | uuid | NOT NULL | |
| schedule_id | uuid | NULL | |
| slot_date | date | NOT NULL | |
| slot_hour | integer | NOT NULL | |
| slot_minute | integer | NOT NULL | |
| generation_count | integer | NULL | 0 |
| last_generated_at | timestamp with time zone | NULL | |
| created_at | timestamp with time zone | NULL | now() |
| updated_at | timestamp with time zone | NULL | now() |
| posting_count | integer | NULL | 0 |
| last_posted_at | timestamp with time zone | NULL | |

**Indexes:**
- `generation_slots_pkey` - UNIQUE btree on (id)
- `generation_slots_connected_account_id_slot_date_slot_hour_s_key` - UNIQUE btree on (connected_account_id, slot_date, slot_hour, slot_minute)
- `idx_generation_slots_lookup` - btree on (connected_account_id, slot_date, slot_hour, slot_minute)
- `idx_generation_slots_time` - btree on (slot_date, slot_hour, slot_minute) WHERE generation_count = 0
- `idx_generation_slots_schedule_id` - btree on (schedule_id, slot_date)
- `generation_slots_schedule_slot_unique` - UNIQUE btree on (connected_account_id, schedule_id, slot_date)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (connected_account_id, slot_date, slot_hour, slot_minute)
- UNIQUE (connected_account_id, schedule_id, slot_date)
- FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
- FOREIGN KEY (schedule_id) REFERENCES account_schedules(id) ON DELETE CASCADE

**Size:** 8 KB table, 112 KB indexes

---

## global_integrations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| setting_key | character varying | NOT NULL | |
| api_key_encrypted | text | NULL | |
| api_secret_encrypted | text | NULL | |
| client_id_encrypted | text | NULL | |
| client_secret_encrypted | text | NULL | |
| cloud_name | text | NULL | |
| extra_settings | jsonb | NULL | '{}'::jsonb |
| is_active | boolean | NULL | true |
| created_at | timestamp without time zone | NULL | now() |
| updated_at | timestamp without time zone | NULL | now() |

**Indexes:**
- `platform_settings_pkey` - UNIQUE btree on (id)
- `platform_settings_setting_key_key` - UNIQUE btree on (setting_key)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (setting_key)

**Size:** 8 KB table, 40 KB indexes

---

## oauth_states

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| state | character varying | NOT NULL | |
| code_verifier | text | NULL | |
| user_email | character varying | NOT NULL | |
| platform | character varying | NOT NULL | |
| created_at | timestamp without time zone | NULL | now() |
| is_signup | boolean | NULL | false |

**Indexes:**
- `oauth_states_pkey` - UNIQUE btree on (state)
- `idx_oauth_states_created` - btree on (created_at)

**Constraints:**
- PRIMARY KEY (state)

**Size:** 8 KB table, 40 KB indexes

---

## personas

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| name | character varying | NOT NULL | |
| description | text | NULL | |
| config | jsonb | NULL | '{}'::jsonb |
| min_length | integer | NULL | 200 |
| max_length | integer | NULL | 280 |
| tone | character varying | NULL | |
| topics | ARRAY | NULL | |
| is_active | boolean | NULL | true |
| created_at | timestamp without time zone | NULL | now() |
| updated_at | timestamp without time zone | NULL | now() |
| connected_account_id | uuid | NULL | |
| rss_sources | jsonb | NULL | '[]'::jsonb |
| is_default | boolean | NULL | false |
| key | character varying | NULL | |
| user_id | uuid | NULL | |

**Indexes:**
- `personas_pkey` - UNIQUE btree on (id)
- `idx_personas_account` - btree on (connected_account_id)
- `idx_personas_active` - btree on (connected_account_id, is_active) WHERE is_active = true
- `personas_key_per_account` - UNIQUE btree on (connected_account_id, key) WHERE key IS NOT NULL

**Constraints:**
- PRIMARY KEY (id)
- FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE

**Size:** 8 KB table, 192 KB indexes

---

## posting_jobs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| account_id | uuid | NOT NULL | |
| platform | character varying | NOT NULL | |
| status | character varying | NOT NULL | 'pending'::character varying |
| batch_index | integer | NULL | 0 |
| tweets_count | integer | NULL | 0 |
| attempts | integer | NULL | 0 |
| max_attempts | integer | NULL | 3 |
| error_message | text | NULL | |
| started_at | timestamp without time zone | NULL | |
| completed_at | timestamp without time zone | NULL | |
| created_at | timestamp without time zone | NULL | now() |
| updated_at | timestamp without time zone | NULL | now() |
| user_id | uuid | NULL | |
| schedule_id | uuid | NULL | |
| scheduled_date | date | NULL | |

**Platforms:** twitter, linkedin

**Statuses:** pending, processing, completed, failed

**Indexes:**
- `posting_jobs_pkey` - UNIQUE btree on (id)
- `idx_posting_jobs_status` - btree on (status, created_at) WHERE status IN ('pending', 'processing')
- `idx_posting_jobs_account_platform` - btree on (account_id, platform)
- `idx_posting_jobs_created` - btree on (created_at DESC)
- `idx_posting_jobs_platform_status` - btree on (platform, status)
- `unique_posting_job_per_schedule_day` - UNIQUE btree on (account_id, platform, schedule_id, scheduled_date)
- `idx_posting_jobs_schedule` - btree on (schedule_id)
- `idx_posting_jobs_scheduled_date` - btree on (scheduled_date)
- `idx_posting_jobs_user` - btree on (user_id)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (account_id, platform, schedule_id, scheduled_date)
- CHECK (platform IN ('twitter', 'linkedin'))
- CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
- FOREIGN KEY (account_id) REFERENCES connected_accounts(id) ON DELETE CASCADE
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
- FOREIGN KEY (schedule_id) REFERENCES account_schedules(id) ON DELETE CASCADE

**Size:** 8 KB table, 152 KB indexes

---

## posts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | text | NOT NULL | |
| content | text | NOT NULL | |
| hashtags | jsonb | NULL | '[]'::jsonb |
| persona | text | NOT NULL | |
| posted_at | timestamp with time zone | NULL | |
| error_message | text | NULL | |
| status | text | NOT NULL | 'draft'::text |
| created_at | timestamp with time zone | NOT NULL | now() |
| thread_id | uuid | NULL | |
| thread_sequence | integer | NULL | |
| content_type | character varying | NULL | 'single_tweet'::character varying |
| image_url | text | NULL | |
| image_status | character varying | NULL | 'none'::character varying |
| card_data | text | NULL | |
| source_url | text | NULL | |
| user_id | uuid | NULL | |
| connected_account_id | uuid | NULL | |
| schedule_id | uuid | NULL | |
| persona_id | uuid | NULL | |

**Statuses:** draft, scheduled, ready, posted, failed

**Content Types:** single_tweet

**Image Statuses:** none, pending, processing, completed, failed

**Indexes:**
- `posts_pkey` - UNIQUE btree on (id)
- `idx_posts_created_at` - btree on (created_at DESC)
- `idx_posts_status` - btree on (status)
- `idx_posts_thread_sequence` - btree on (thread_id, thread_sequence)
- `idx_posts_content_type` - btree on (content_type, status)
- `idx_posts_image_status` - btree on (image_status, created_at) WHERE image_status = 'pending'
- `idx_posts_user` - btree on (user_id)
- `idx_posts_connected_account_id` - btree on (connected_account_id)
- `idx_posts_account_status` - btree on (connected_account_id, status)
- `idx_posts_persona` - btree on (persona)
- `idx_posts_persona_id` - btree on (persona_id)
- `idx_posts_schedule_id` - btree on (schedule_id)

**Constraints:**
- PRIMARY KEY (id)
- CHECK (status IN ('draft', 'scheduled', 'ready', 'posted', 'failed'))
- CHECK (image_status IN ('none', 'pending', 'processing', 'completed', 'failed'))
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
- FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id) ON DELETE SET NULL
- FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL
- FOREIGN KEY (schedule_id) REFERENCES account_schedules(id) ON DELETE SET NULL
- FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE SET NULL

**Size:** 24 KB table, 280 KB indexes

---

## sessions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| user_id | uuid | NOT NULL | |
| expires | timestamp without time zone | NOT NULL | |
| session_token | character varying | NOT NULL | |
| created_at | timestamp without time zone | NOT NULL | now() |

**Indexes:**
- `sessions_pkey` - UNIQUE btree on (id)
- `sessions_session_token_key` - UNIQUE btree on (session_token)
- `idx_sessions_user_id` - btree on (user_id)
- `idx_sessions_session_token` - btree on (session_token)
- `idx_sessions_expires` - btree on (expires)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (session_token)
- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**Size:** 0 bytes table, 40 KB indexes

---

## social_posts

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | gen_random_uuid() |
| post_id | uuid | NOT NULL | |
| platform | character varying | NOT NULL | |
| platform_post_id | character varying | NULL | |
| platform_post_url | text | NULL | |
| metadata | jsonb | NULL | '{}'::jsonb |
| created_at | timestamp with time zone | NULL | now() |

**Platforms:** twitter, linkedin

**Indexes:**
- `social_posts_pkey` - UNIQUE btree on (id)
- `social_posts_post_id_platform_key` - UNIQUE btree on (post_id, platform)
- `idx_social_posts_post` - btree on (post_id)
- `idx_social_posts_platform` - btree on (platform)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (post_id, platform)
- CHECK (platform IN ('twitter', 'linkedin'))

**Size:** 0 bytes table, 40 KB indexes

---

## threads

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | |
| title | character varying | NULL | |
| persona | character varying | NULL | |
| total_tweets | integer | NULL | |
| current_tweet | integer | NULL | 1 |
| parent_tweet_id | character varying | NULL | |
| status | character varying | NULL | 'ready'::character varying |
| story_category | character varying | NULL | |
| created_at | timestamp without time zone | NULL | now() |
| connected_account_id | uuid | NULL | |

**Statuses:** ready

**Indexes:**
- `threads_pkey` - UNIQUE btree on (id)
- `idx_threads_connected_account` - btree on (connected_account_id)
- `idx_threads_status` - btree on (status)
- `idx_threads_account_status` - btree on (connected_account_id, status)
- `idx_threads_created_at` - btree on (created_at)

**Constraints:**
- PRIMARY KEY (id)
- FOREIGN KEY (connected_account_id) REFERENCES connected_accounts(id) ON DELETE SET NULL

**Size:** 8 KB table, 72 KB indexes

---

## users

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NOT NULL | uuid_generate_v4() |
| name | character varying | NULL | |
| email | character varying | NOT NULL | |
| email_verified | timestamp without time zone | NULL | |
| image | text | NULL | |
| created_at | timestamp without time zone | NOT NULL | now() |
| updated_at | timestamp without time zone | NOT NULL | now() |
| hashed_password | text | NULL | |
| is_admin | boolean | NULL | false |
| plan | character varying | NULL | 'free'::character varying |
| onboarding_completed | boolean | NULL | false |
| onboarding_step | integer | NULL | 1 |
| onboarding_topics | ARRAY | NULL | '{}'::text[] |
| onboarding_post_frequency | integer | NULL | 3 |
| onboarding_post_time | character varying | NULL | 'morning'::character varying |

**Plans:** free

**Indexes:**
- `users_pkey` - UNIQUE btree on (id)
- `users_email_key` - UNIQUE btree on (email)
- `idx_users_email` - btree on (email)
- `idx_users_email_verified` - btree on (email_verified)

**Constraints:**
- PRIMARY KEY (id)
- UNIQUE (email)

**Size:** 8 KB table, 104 KB indexes

---

## Entity Relationship Diagram

```
users
  ├── connected_accounts (1:N)
  ├── personas (1:N)
  ├── sessions (1:N)
  ├── posting_jobs (1:N)
  └── posts (1:N)

connected_accounts
  ├── account_schedules (1:N)
  ├── personas (1:N)
  ├── generation_slots (1:N)
  ├── posting_jobs (1:N)
  ├── posts (1:N)
  ├── threads (1:N)
  └── social_posts (1:N)

account_schedules
  ├── generation_slots (1:N)
  └── posting_jobs (1:N)

personas
  ├── posts (1:N)
  └── account_schedules (1:N)

threads
  └── posts (1:N)

posts
  └── social_posts (1:N)

oauth_states (standalone)

global_integrations (standalone)

blog_sources (standalone)
```
