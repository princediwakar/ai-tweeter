import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { rows } = await sql`SELECT * FROM brand_profiles`;
  console.log('Brands:', rows);
  
  for (const row of rows) {
    if (row.name === 'Test' || row.brand_name === 'Test') {
      console.log('Deleting Test brand with ID:', row.id);
      await sql`DELETE FROM brand_profiles WHERE id = ${row.id}`;
      console.log('Deleted successfully.');
    }
  }
}

main().catch(console.error);
