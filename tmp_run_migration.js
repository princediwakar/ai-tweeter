const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, 'scripts', 'migrations', 'fix-schema-relations.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Executing migration: ${migrationPath}`);
    
    // Split on double newlines to run statements independently, or just run it natively.
    // The @vercel/postgres client `sql` tag doesn't easily run multiple statements separated by semicolon in a single tagged template literal if it has multiple operations.
    // However, if we just use Neon pool or direct string query using the Vercel postgres client `query` method.
    
    const { createPool } = require('@vercel/postgres');
    const pool = createPool();
    await pool.query(sqlContent);
    
    console.log("Migration executed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
