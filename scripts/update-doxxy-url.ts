import { sql } from '@vercel/postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

async function run() {
  try {
    await sql`ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS brand_url VARCHAR(255)`;
    const res = await sql`UPDATE brand_profiles SET brand_url = 'https://doxxy.in' WHERE name ILIKE '%Doxxy%' RETURNING id, name, brand_url`;
    console.log('Updated:', res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}
run();
