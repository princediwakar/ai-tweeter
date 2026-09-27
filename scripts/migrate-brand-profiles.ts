import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Migrating brand_profiles table...');
  
  try {
    await sql`
      ALTER TABLE brand_profiles 
      ADD COLUMN IF NOT EXISTS primary_stakeholder_persona TEXT,
      ADD COLUMN IF NOT EXISTS ecosystem_dynamics TEXT,
      ADD COLUMN IF NOT EXISTS operating_geography TEXT,
      ADD COLUMN IF NOT EXISTS never_say JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS never_topics JSONB DEFAULT '[]'::jsonb;
    `;
    console.log('Successfully added deep ecosystem columns to brand_profiles!');
  } catch (e) {
    console.error('Migration failed:', e);
  }
  process.exit(0);
}

main();
