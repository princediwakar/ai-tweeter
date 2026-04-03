import { sql } from '@vercel/postgres';

async function checkReady() {
  try {
    const result = await sql`
      SELECT id, account_id, status, content FROM tweets WHERE status = 'ready';
    `;
    console.log('Ready Tweets:', result.rows.length);
    const threads = await sql`
      SELECT id, account_id, title FROM threads WHERE status = 'ready';
    `;
    console.log('Ready Threads:', threads.rows.length);
  } catch (err) {
    console.error(err);
  }
}

checkReady();
