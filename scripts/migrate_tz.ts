import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  await sql`UPDATE account_schedules SET timezone = 'Asia/Kolkata' WHERE timezone = 'UTC' OR timezone IS NULL`;
  console.log('Updated existing account schedules to Asia/Kolkata');
}
main().catch(console.error);
