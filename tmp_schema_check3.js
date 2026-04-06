const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function checkSchema() {
  try {
    const tables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, column_name
    `;
    
    let out = "=== TABLES AND COLUMNS ===\n";
    let currentTable = '';
    for (const r of tables.rows) {
      if (r.table_name !== currentTable) {
        currentTable = r.table_name;
        out += `\nTable: ${currentTable}\n`;
      }
      out += `  ${r.column_name} (${r.data_type})\n`;
    }
    
    fs.writeFileSync('/tmp/db_schema_tables.txt', out);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkSchema();
