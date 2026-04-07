-- Remove unused columns from account_schedules
-- These columns exist but are never used in the codebase

ALTER TABLE account_schedules DROP COLUMN IF EXISTS last_generated_at;
ALTER TABLE account_schedules DROP COLUMN IF EXISTS last_posted_at;