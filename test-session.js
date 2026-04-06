const { sql } = require('@vercel/postgres');
async function run() {
  const res = await sql`SELECT * FROM users LIMIT 1`;
  console.log(res.rows[0]);
}
run();
