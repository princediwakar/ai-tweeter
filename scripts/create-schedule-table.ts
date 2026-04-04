import { sql } from '@vercel/postgres';

export async function createScheduleTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS account_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      timezone VARCHAR(100) DEFAULT 'UTC',
      
      -- Schedule configuration stored as JSON
      schedule_config JSONB NOT NULL DEFAULT '{}',
      
      -- Days of week (0=Sunday, 6=Saturday)
      days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
      
      -- Time window for posting (in minutes from midnight)
      start_time INTEGER DEFAULT 0,
      end_time INTEGER DEFAULT 1439,
      
      -- Enable/disable
      is_active BOOLEAN DEFAULT true,
      
      -- Limits
      max_posts_per_day INTEGER DEFAULT 10,
      
      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_account_schedules_account_id 
    ON account_schedules(account_id);
  `;

  console.log('✅ account_schedules table created');
}