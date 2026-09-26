const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    await sql`ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE account_schedules ADD COLUMN IF NOT EXISTS brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE`;
    console.log("Successfully added brand_profile_id");
  } catch (err) {
    console.error(err);
  }
}
run();
