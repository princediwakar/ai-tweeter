import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  console.log('Deleting from content_calendar and posts...');
  
  await sql`DELETE FROM content_calendar`;
  await sql`DELETE FROM posts WHERE status != 'posted'`;
  
  console.log('Deleted successfully.');
}

main().catch(console.error);
