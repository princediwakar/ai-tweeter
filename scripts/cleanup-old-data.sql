-- Cleanup script: Remove old account-based data, keep only platform settings
-- Run: psql "$DATABASE_URL" -f scripts/cleanup-old-data.sql

-- 1. Delete all accounts (user will connect via OAuth now)
DELETE FROM accounts;

-- 2. Delete old persona tables if they exist
DROP TABLE IF EXISTS custom_personas CASCADE;
DROP TABLE IF EXISTS account_schedules CASCADE;

-- 3. Delete any old engagement logs
DROP TABLE IF EXISTS engagement_log CASCADE;

-- 4. Clear tweets (regenerate from new system)
-- Optional: DELETE FROM tweets;

-- 5. Delete old user-account mappings
DROP TABLE IF EXISTS user_accounts CASCADE;

-- 6. Verify platform settings remain
SELECT setting_key, is_active, cloud_name, 
       CASE WHEN client_id_encrypted IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as client_id,
       CASE WHEN api_key_encrypted IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as api_key
FROM platform_settings;

SELECT 'Cleanup complete' as status;