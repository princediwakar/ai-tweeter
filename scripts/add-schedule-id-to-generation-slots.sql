-- Migration already applied - just fix constraint
-- The schedule_id column already exists, just need the new constraint

-- Drop existing constraint and add new one with schedule_id
ALTER TABLE generation_slots 
DROP CONSTRAINT IF EXISTS generation_slots_connected_account_id_slot_date_slot_hour_slot_minute_key;

ALTER TABLE generation_slots 
ADD CONSTRAINT generation_slots_schedule_slot_unique 
UNIQUE (connected_account_id, schedule_id, slot_date);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_generation_slots_schedule_id 
ON generation_slots(schedule_id, slot_date);