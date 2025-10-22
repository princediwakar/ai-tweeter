INSERT INTO accounts (
  id,
  name,
  twitter_handle,
  status,
  twitter_api_key_encrypted,
  twitter_api_secret_encrypted,
  twitter_access_token_encrypted,
  twitter_access_token_secret_encrypted,
  personas,
  branding,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Gandhi Wisdom',
  '@gandhi_wisdom_',
  'active',
  'enc:' || encode('GANDHI_TWITTER_API_KEY'::bytea, 'base64'),
  'enc:' || encode('GANDHI_TWITTER_API_SECRET'::bytea, 'base64'),
  'enc:' || encode('GANDHI_TWITTER_ACCESS_TOKEN'::bytea, 'base64'),
  'enc:' || encode('GANDHI_TWITTER_ACCESS_TOKEN_SECRET'::bytea, 'base64'),
  '[]'::jsonb,
  '{
    "theme": "wisdom",
    "audience": "social_leaders",
    "tone": "thoughtful"
  }'::jsonb,
  NOW(),
  NOW()
);


SELECT
  id,
  name,
  twitter_handle,
  status,
  personas,
  branding,
  created_at
FROM accounts
WHERE twitter_handle = '@gandhi_wisdom_';


SELECT COUNT(*) as engagement_count
FROM engagement_log
WHERE account_id = (SELECT id FROM accounts WHERE twitter_handle = '@gandhi_wisdom_');

-- Expected output: 0 (no engagements yet)

-- ============================================================================
-- How to get Twitter API credentials:
-- ============================================================================
-- 1. Go to https://developer.twitter.com/en/portal/dashboard
-- 2. Create a new app or use existing app
-- 3. Go to "Keys and tokens" tab
-- 4. Generate/Copy:
--    - API Key (Consumer Key) -> YOUR_TWITTER_API_KEY
--    - API Secret (Consumer Secret) -> YOUR_TWITTER_API_SECRET
--    - Access Token -> YOUR_TWITTER_ACCESS_TOKEN
--    - Access Token Secret -> YOUR_TWITTER_ACCESS_TOKEN_SECRET
--
-- Required permissions:
-- - Read and Write (to post replies)
-- - OAuth 1.0a user context
--
-- ============================================================================

-- ============================================================================
-- To run this script:
-- ============================================================================
-- Method 1: Direct psql
-- psql "$DATABASE_URL" -f scripts/add-gandhi-account.sql

-- Method 2: Interactive psql
-- psql "$DATABASE_URL"
-- \i scripts/add-gandhi-account.sql

-- Method 3: Copy-paste into psql terminal
-- psql "$DATABASE_URL"
-- Then copy-paste the INSERT statement above (with your credentials)
-- ============================================================================
