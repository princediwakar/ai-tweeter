import { sql } from '@vercel/postgres';

async function test() {
  try {
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='account_schedules'
        AND column_name='days_of_week';
    `;
    console.log('Column exists?', result.rows.length > 0);
    if (result.rows.length > 0) {
      console.log('Column:', result.rows[0]);
    }
    // Also check the table structure
    const table = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name='account_schedules'
      ORDER BY ordinal_position;
    `;
    console.log('All columns in account_schedules:');
    table.rows.forEach(row => console.log(row.column_name, row.data_type));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

test();