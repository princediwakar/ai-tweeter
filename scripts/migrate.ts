import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      
      try {
        await sql.query(sqlContent);
        console.log(`Success: ${file}`);
      } catch (e: any) {
        console.error(`Failed to run ${file}:`, e.message);
      }
    }
  }
}

runMigrations().then(() => {
  console.log('Migrations complete.');
  process.exit(0);
});
