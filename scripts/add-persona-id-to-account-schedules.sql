-- Migration: Add persona_id to account_schedules table
-- This ensures the ScheduleBuilder component works with personas

-- Create account_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS account_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  schedule_config JSONB DEFAULT '{}'::jsonb,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  start_time INTEGER DEFAULT 0,
  end_time INTEGER DEFAULT 1439,
  is_active BOOLEAN DEFAULT true,
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add persona_id column if table exists but column doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_schedules' AND column_name = 'persona_id'
  ) THEN
    ALTER TABLE account_schedules ADD COLUMN persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Remove max_posts_per_day column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_schedules' AND column_name = 'max_posts_per_day'
  ) THEN
    ALTER TABLE account_schedules DROP COLUMN max_posts_per_day;
  END IF;
END $$;

SELECT 'Migration complete: account_schedules ready with persona_id' as status;
