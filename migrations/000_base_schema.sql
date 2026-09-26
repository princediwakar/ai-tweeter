CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users & Auth ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE,
  hashed_password TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_username TEXT,
  name TEXT,
  platform_user_id TEXT,
  auth_type VARCHAR(20) DEFAULT 'oauth2',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  profile_url TEXT,
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, platform, account_username)
);

CREATE TABLE IF NOT EXISTS global_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key character varying NOT NULL UNIQUE,
  api_key_encrypted text,
  api_secret_encrypted text,
  client_id_encrypted text,
  client_secret_encrypted text,
  cloud_name text,
  extra_settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

-- Insert defaults
INSERT INTO global_integrations (setting_key, is_active) 
VALUES ('twitter', true), ('linkedin', true) 
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS oauth_states (
  state character varying PRIMARY KEY,
  code_verifier text,
  user_email character varying NOT NULL,
  platform character varying NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  is_signup boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_created ON oauth_states(created_at);

-- ─── Brand Engine ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    tone_of_voice JSONB NOT NULL DEFAULT '[]',
    target_audience JSONB NOT NULL DEFAULT '[]',
    core_values JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brand_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL, 
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    keywords JSONB NOT NULL DEFAULT '[]',
    proportion INTEGER NOT NULL DEFAULT 20, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Content Pipeline ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  status TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL,
  pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
  calendar_id UUID,
  content TEXT,
  status TEXT,
  target_audience TEXT,
  narrative_tags JSONB DEFAULT '[]',
  theme_summary TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  platform_post_id TEXT,
  media_urls JSONB,
  error_message TEXT,
  analytics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_brand ON posts(brand_profile_id);
CREATE INDEX IF NOT EXISTS idx_posts_pillar ON posts(pillar_id);

CREATE TABLE IF NOT EXISTS content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    planned_platform TEXT NOT NULL DEFAULT 'linkedin',
    pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
    angle TEXT NOT NULL DEFAULT '',
    target_audience TEXT,
    builds_on_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    narrative_note TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    generated_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_brand_date ON content_calendar(brand_profile_id, planned_date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'posts_calendar_id_fkey'
    ) THEN
        ALTER TABLE posts ADD CONSTRAINT posts_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES content_calendar(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS narrative_arcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    stages JSONB NOT NULL DEFAULT '[]',
    current_stage INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arcs_brand ON narrative_arcs(brand_profile_id);

-- ─── Ingestion ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    rss_url TEXT,
    source_type VARCHAR(50) DEFAULT 'rss',
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── Automation & Legacy ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  timezone TEXT,
  brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  posting_times JSONB,
  days_of_week JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generation_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES account_schedules(id) ON DELETE CASCADE,
  slot_date TEXT,
  slot_hour INTEGER,
  slot_minute INTEGER,
  generation_count INTEGER DEFAULT 0,
  posting_count INTEGER DEFAULT 0,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  last_posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posting_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  status TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS engagement_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  action TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
