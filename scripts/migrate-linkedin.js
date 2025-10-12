const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Adding LinkedIn columns to accounts table...');
  await sql`
    ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS linkedin_access_token_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_refresh_token_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_user_id VARCHAR,
    ADD COLUMN IF NOT EXISTS linkedin_org_id VARCHAR,
    ADD COLUMN IF NOT EXISTS linkedin_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMP;
  `;
  console.log('✓ Accounts table updated');

  console.log('Adding linkedin_id column to tweets table...');
  await sql`
    ALTER TABLE tweets
    ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR;
  `;
  console.log('✓ Tweets table updated');

  console.log('\n✓ LinkedIn migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
