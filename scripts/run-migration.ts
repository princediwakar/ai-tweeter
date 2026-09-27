import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const client = createClient({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  try {
    await client.connect();
    const filePath = path.join(__dirname, '../migrations/004_geography.sql');
    const query = fs.readFileSync(filePath, 'utf8');
    await client.query(query);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

run();
