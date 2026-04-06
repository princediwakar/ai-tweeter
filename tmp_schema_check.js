const { db, sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  try {
    const tables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
    `;
    const fks = await sql`
      SELECT 
          tc.constraint_name, tc.table_name, kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;
    
    console.log("=== FOREIGN KEYS ===");
    console.table(fks.rows);
    
    console.log("\n=== TABLES ===");
    const tableMap = {};
    for (const r of tables.rows) {
      if (!tableMap[r.table_name]) tableMap[r.table_name] = [];
      tableMap[r.table_name].push(`${r.column_name} (${r.data_type})`);
    }
    for (const [tName, cols] of Object.entries(tableMap)) {
      console.log(`\nTable: ${tName}`);
      console.log(cols.join('\n'));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkSchema();
