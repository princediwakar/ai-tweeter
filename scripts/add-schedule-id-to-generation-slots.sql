-- Fix constraint for per-schedule deduplication
-- Run this to allow multiple schedules per account

-- Find and drop existing unique constraint (if any)
DO $$
BEGIN
  -- Try to find constraints on generation_slots
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'generation_slots'::regclass 
    AND contype = 'u'
  ) THEN
    -- Drop all unique constraints on this table
    ALTER TABLE generation_slots DROP CONSTRAINT IF EXISTS generation_slots_connected_account_id_slot_date_slot_hour_slot_minute_key;
    ALTER TABLE generation_slots DROP CONSTRAINT IF EXISTS generation_slots_schedule_slot_unique;
  END IF;
END
$$;

-- Add new constraint with schedule_id
ALTER TABLE generation_slots 
ADD CONSTRAINT generation_slots_schedule_slot_unique 
UNIQUE (connected_account_id, schedule_id, slot_date);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_slots_schedule_id 
ON generation_slots(schedule_id, slot_date);