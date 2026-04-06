const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function checkSchema() {
  try {
    const fks = await sql`
      SELECT 
          tc.constraint_name, tc.table_name, kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('tweets', 'personas', 'account_schedules', 'posting_jobs', 'generation_slots')
    `;
    
    let out = "=== FOREIGN KEYS ===\n";
    for (const r of fks.rows) {
      out += `${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name} (ON DELETE ${r.delete_rule}) [C: ${r.constraint_name}]\n`;
    }
    
    console.log(out);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkSchema();
