import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

async function runPerformanceIndexes() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const sqlPath = join(__dirname, 'add-performance-indexes.sql');
  const sqlContent = readFileSync(sqlPath, 'utf8');

  const statements = splitSQL(sqlContent);

  console.log(`Found ${statements.length} statements to execute`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    console.log(`Executing ${i + 1}/${statements.length}: ${stmt.substring(0, 80)}...`);
    try {
      await sql.query(stmt);
      console.log(`  ✓ Success`);
      success++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('already exists')) {
        console.log(`  - Skipped (already exists)`);
        skipped++;
      } else {
        console.error(`  ✗ Failed: ${msg}`);
        failed++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nPerformance indexes applied!`);
}

function splitSQL(content: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringDelimiter = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === "'" || char === '"') {
      if (!inString) {
        inString = true;
        stringDelimiter = char;
      } else if (stringDelimiter === char && content[i - 1] !== '\\') {
        inString = false;
        stringDelimiter = '';
      }
    }

    current += char;

    if (char === ';' && !inString) {
      statements.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s.length > 0);
}

runPerformanceIndexes().catch(console.error);
