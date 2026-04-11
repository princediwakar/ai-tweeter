-- Migration: Merge account_credentials into connected_accounts
-- Run this SQL to add credential columns to connected_accounts table

-- Step 1: Add new columns (nullable initially)
ALTER TABLE connected_accounts 
ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) DEFAULT 'oauth2',
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS api_secret_encrypted TEXT;

-- Step 2: Migrate data from account_credentials to connected_accounts
UPDATE connected_accounts ca
SET 
    auth_type = ac.auth_type,
    access_token_encrypted = ac.access_token_encrypted,
    refresh_token_encrypted = ac.refresh_token_encrypted,
    token_expires_at = ac.token_expires_at,
    api_key_encrypted = ac.api_key_encrypted,
    api_secret_encrypted = ac.api_secret_encrypted
FROM account_credentials ac
WHERE ca.id = ac.connected_account_id
AND ac.is_active = true;

-- Step 3: Set default auth_type for existing records that don't have credentials
UPDATE connected_accounts 
SET auth_type = 'oauth2'
WHERE auth_type IS NULL;

-- Step 4: Drop the old table after confirming migration
DROP TABLE IF EXISTS account_credentials;

-- Step 5: (Optional) Add not null constraints after migration
-- ALTER TABLE connected_accounts ALTER COLUMN auth_type SET NOT NULL;