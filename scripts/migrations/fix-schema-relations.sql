-- Fix Database Schema Constraints

-- ============================================================================
-- 1. FIX TWEETS TABLE SCHEDULE DEPENDENCY (Currently missing entirely)
-- ============================================================================
-- First, ensure any orphaned schedule_ids are nulled out to avoid constraint violation errors.
UPDATE tweets 
SET schedule_id = NULL 
WHERE schedule_id IS NOT NULL 
  AND schedule_id NOT IN (SELECT id FROM account_schedules);

-- If an overly generic or incorrect fkey exists (from older scripts), remove it.
ALTER TABLE tweets DROP CONSTRAINT IF EXISTS tweets_schedule_id_fkey;

-- Add the correct constraint to `account_schedules`
ALTER TABLE tweets 
  ADD CONSTRAINT tweets_schedule_id_fkey 
  FOREIGN KEY (schedule_id) 
  REFERENCES account_schedules(id) 
  ON DELETE SET NULL;


-- ============================================================================
-- 2. FIX ACCOUNT_SCHEDULES CASCADING DELETES
-- ============================================================================
ALTER TABLE account_schedules DROP CONSTRAINT IF EXISTS account_schedules_connected_account_id_fkey;

ALTER TABLE account_schedules
  ADD CONSTRAINT account_schedules_connected_account_id_fkey
  FOREIGN KEY (connected_account_id)
  REFERENCES connected_accounts(id)
  ON DELETE CASCADE;


-- ============================================================================
-- 3. FIX GENERATION_SLOTS CASCADING DELETES
-- ============================================================================
-- Prevent orphaned tracking slots from sticking around when a schedule is deleted
ALTER TABLE generation_slots DROP CONSTRAINT IF EXISTS generation_slots_schedule_id_fkey;

ALTER TABLE generation_slots
  ADD CONSTRAINT generation_slots_schedule_id_fkey
  FOREIGN KEY (schedule_id)
  REFERENCES account_schedules(id)
  ON DELETE CASCADE;


-- ============================================================================
-- 4. FIX TWEETS TO THREADS CASCADING DELETES
-- ============================================================================
-- If a thread is deleted, we should untether its tweets so they just become standalone drafts.
-- It is currently ON DELETE NO ACTION which causes errors if user deletes a thread.
ALTER TABLE tweets DROP CONSTRAINT IF EXISTS tweets_thread_id_fkey;

ALTER TABLE tweets
  ADD CONSTRAINT tweets_thread_id_fkey
  FOREIGN KEY (thread_id)
  REFERENCES threads(id)
  ON DELETE SET NULL;

-- Finally, confirm that personas delete properly on connected account deletion (Re-asserting it)
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_connected_account_id_fkey;

ALTER TABLE personas
  ADD CONSTRAINT personas_connected_account_id_fkey
  FOREIGN KEY (connected_account_id)
  REFERENCES connected_accounts(id)
  ON DELETE CASCADE;

SELECT 'Migration complete: Schema constraints fixed' as status;
