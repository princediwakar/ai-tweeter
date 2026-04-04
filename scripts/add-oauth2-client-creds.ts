import { sql } from '@vercel/postgres';

async function runMigration() {
  try {
    console.log('Adding twitter_oauth2_client_id_encrypted column...');
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_oauth2_client_id_encrypted TEXT`;
    console.log('✓ Added twitter_oauth2_client_id_encrypted');
    
    console.log('Adding twitter_oauth2_client_secret_encrypted column...');
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_oauth2_client_secret_encrypted TEXT`;
    console.log('✓ Added twitter_oauth2_client_secret_encrypted');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

runMigration().catch(console.error);
