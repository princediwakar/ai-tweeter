-- AI Social Media Automation SaaS - Database Schema
-- Product: Users connect accounts → Create personas → Set schedules → Auto-generate & post

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USERS - Already exists via NextAuth, add admin field
-- =============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';

-- =============================================================================
-- 2. CONNECTED ACCOUNTS - User's social media accounts (OAuth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
  account_username VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  platform_user_id VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  UNIQUE(user_id, platform, account_username)
);

-- =============================================================================
-- 3. PLATFORM SETTINGS - Shared credentials (admin configured)
-- =============================================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  client_id_encrypted TEXT,
  client_secret_encrypted TEXT,
  cloud_name TEXT,
  extra_settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, is_active) VALUES 
  ('twitter_app', true), 
  ('cloudinary', true), 
  ('linkedin_app', true)
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================================================
-- 4. PERSONAS - User's content generation styles
-- =============================================================================
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rss_sources JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  min_length INTEGER DEFAULT 200,
  max_length INTEGER DEFAULT 280,
  tone VARCHAR(50),
  topics TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 5. SCHEDULES - Auto-generation timing
-- =============================================================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  cron_expression VARCHAR(100) DEFAULT '0 * * * *',
  timezone VARCHAR(50) DEFAULT 'UTC',
  use_trending BOOLEAN DEFAULT false,
  include_hashtags BOOLEAN DEFAULT true,
  bulk_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- 6. TWEETS - Generated content
-- =============================================================================
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;
ALTER TABLE tweets ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;

-- =============================================================================
-- DONE
-- =============================================================================
SELECT 'Migration complete' as status;
