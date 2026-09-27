import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const res = await sql`SELECT MAX(planned_date) as max_date FROM content_calendar`;
  console.log("max_date type:", typeof res.rows[0].max_date);
  console.log("max_date value:", res.rows[0].max_date);
  
  if (res.rows[0].max_date) {
    const d = new Date(res.rows[0].max_date);
    console.log("Parsed Date:", d);
    d.setDate(d.getDate() + 1);
    console.log("Next Date:", d);
    const nextDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    console.log("Formatted:", nextDateStr);
  }
}
main().catch(console.error).finally(() => process.exit(0));
