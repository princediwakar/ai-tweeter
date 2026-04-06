require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function main() {
  try {
    const res = await sql`SELECT id, email FROM users LIMIT 1`;
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  }
}
main();
