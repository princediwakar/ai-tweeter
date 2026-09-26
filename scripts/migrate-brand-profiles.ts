import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('Starting migration...');
  
  try {
    await sql`ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS twitter_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL;`;
    console.log('Added twitter_account_id');
  } catch (e) {
    console.log('twitter_account_id might already exist or error:', e);
  }

  try {
    await sql`ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS linkedin_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL;`;
    console.log('Added linkedin_account_id');
  } catch (e) {
    console.log('linkedin_account_id might already exist or error:', e);
  }

  try {
    await sql`ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS linkedin_platform_id TEXT;`;
    console.log('Added linkedin_platform_id');
  } catch (e) {
    console.log('linkedin_platform_id might already exist or error:', e);
  }

  console.log('Migration completed!');
  process.exit(0);
}

main().catch(console.error);
