const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  try {
    console.log('Adding brand_profile_id to connected_accounts...');
    await sql`
      ALTER TABLE connected_accounts 
      ADD COLUMN IF NOT EXISTS brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE;
    `;
    
    console.log('Adding brand_profile_id to account_schedules...');
    await sql`
      ALTER TABLE account_schedules 
      ADD COLUMN IF NOT EXISTS brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE;
    `;
    
    console.log('Creating index for fast lookups...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_connected_accounts_brand ON connected_accounts(brand_profile_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_account_schedules_brand ON account_schedules(brand_profile_id);
    `;
    
    // For existing accounts, let's just assign them to the first brand profile of the user if possible
    console.log('Backfilling existing accounts...');
    await sql`
      UPDATE connected_accounts ca
      SET brand_profile_id = bp.id
      FROM brand_profiles bp
      WHERE ca.user_id = bp.user_id AND ca.brand_profile_id IS NULL;
    `;
    await sql`
      UPDATE account_schedules asched
      SET brand_profile_id = bp.id
      FROM brand_profiles bp
      WHERE asched.user_id = bp.user_id AND asched.brand_profile_id IS NULL;
    `;
    
    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
