-- Add schedule_id column to generation_slots for per-schedule deduplication
-- This allows multiple schedules (e.g., 5 posts per hour) instead of 1 per hour

ALTER TABLE generation_slots 
ADD COLUMN IF NOT EXISTS schedule_id UUID;

-- Drop existing constraint and add new one with schedule_id
ALTER TABLE generation_slots 
DROP CONSTRAINT IF EXISTS generation_slots_connected_account_id_slot_date_slot_hour_slot_minute_key;

ALTER TABLE generation_slots 
ADD CONSTRAINT generation_slots_schedule_slot_unique 
UNIQUE (connected_account_id, schedule_id, slot_date);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_slots_schedule_id 
ON generation_slots(schedule_id, slot_date);

-- Update existing rows to set schedule_id from account_schedules
-- This is a one-time migration
UPDATE generation_slots gs
SET schedule_id = (
  SELECT s.id FROM account_schedules s 
  WHERE s.connected_account_id = gs.connected_account_id 
  ORDER BY s.created_at 
  LIMIT 1
)
WHERE gs.schedule_id IS NULL;