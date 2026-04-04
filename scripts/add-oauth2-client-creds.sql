-- Add Twitter OAuth 2.0 client credentials columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_oauth2_client_id_encrypted TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_oauth2_client_secret_encrypted TEXT;
