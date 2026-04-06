-- Migration: Add personas column to connected_accounts table
-- This column stores array of persona keys associated with the account
-- Run with: psql "$DATABASE_URL" -f scripts/add-personas-column-to-connected-accounts.sql

-- Add personas column if it doesn't exist
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS personas JSONB DEFAULT '[]'::jsonb;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_personas ON connected_accounts USING GIN (personas);

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'connected_accounts' AND column_name = 'personas';

SELECT 'Migration complete: personas column added to connected_accounts' as status;