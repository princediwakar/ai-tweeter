-- Performance optimization: Add indexes for frequently queried columns
-- Run this script to improve query performance

-- Indexes for tweets table
CREATE INDEX IF NOT EXISTS idx_tweets_status ON tweets(status);
CREATE INDEX IF NOT EXISTS idx_tweets_connected_account_id ON tweets(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_account_status ON tweets(connected_account_id, status);
CREATE INDEX IF NOT EXISTS idx_tweets_persona ON tweets(persona);
CREATE INDEX IF NOT EXISTS idx_tweets_image_status ON tweets(image_status) WHERE image_status IN ('pending', 'failed');

-- Indexes for threads table
CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
CREATE INDEX IF NOT EXISTS idx_threads_account_status ON threads(connected_account_id, status);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at);

-- Indexes for engagement_log table
CREATE INDEX IF NOT EXISTS idx_engagement_log_account_date ON engagement_log(connected_account_id, DATE(engaged_at));
CREATE INDEX IF NOT EXISTS idx_engagement_log_target ON engagement_log(connected_account_id, target_username);
CREATE INDEX IF NOT EXISTS idx_engagement_log_tweet ON engagement_log(connected_account_id, target_tweet_id);

-- Indexes for connected_accounts table
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform ON connected_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_username ON connected_accounts(account_username);

-- Indexes for account_schedules table
CREATE INDEX IF NOT EXISTS idx_account_schedules_account ON account_schedules(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_account_schedules_active ON account_schedules(connected_account_id, is_active) WHERE is_active = true;

-- Indexes for personas table
CREATE INDEX IF NOT EXISTS idx_personas_account ON personas(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_personas_active ON personas(connected_account_id, is_active) WHERE is_active = true;

-- Index for posting_jobs (already has some but add composite)
CREATE INDEX IF NOT EXISTS idx_posting_jobs_platform_status ON posting_jobs(platform, status);

-- Analyze tables after creating indexes (optional but recommended)
-- ANALYZE tweets;
-- ANALYZE threads;
-- ANALYZE engagement_log;
-- ANALYZE connected_accounts;
-- ANALYZE account_schedules;
-- ANALYZE personas;
-- ANALYZE posting_jobs;
