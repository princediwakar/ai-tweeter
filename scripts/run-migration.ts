import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

async function runMigration() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const migrationPath = join(__dirname, 'migrate-user-tables.sql');
  const sqlContent = readFileSync(migrationPath, 'utf8');

  // Remove comments (optional) and split into statements
  const statements = splitSQL(sqlContent);

  console.log(`Found ${statements.length} statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    console.log(`Executing statement ${i + 1}: ${stmt.substring(0, 100)}...`);
    try {
      await sql.query(stmt);
      console.log(`  ✓ Success`);
    } catch (error) {
      console.error(`  ✗ Failed:`, error instanceof Error ? error.message : String(error));
      // Depending on error, maybe continue? Some statements may fail due to IF NOT EXISTS.
      // We'll log and continue.
    }
  }

  console.log('Migration completed');
}

function splitSQL(content: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringDelimiter = '';
  let inDollarQuote = false;
  let dollarTag = '';

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1] || '';

    // Handle dollar-quoted strings
    if (!inString && char === '$' && nextChar === '$') {
      // Start of dollar quote
      inDollarQuote = true;
      // Capture the tag after $$
      let tagStart = i + 2;
      let tag = '';
      while (tagStart < content.length && /[A-Za-z0-9_]/.test(content[tagStart])) {
        tag += content[tagStart];
        tagStart++;
      }
      dollarTag = tag;
      current += char;
      continue;
    }

    if (inDollarQuote) {
      current += char;
      // Check for closing $$
      if (char === '$' && nextChar === '$') {
        // Check if the tag matches
        let closeTag = '';
        let tagStart = i + 2;
        while (tagStart < content.length && /[A-Za-z0-9_]/.test(content[tagStart])) {
          closeTag += content[tagStart];
          tagStart++;
        }
        if (closeTag === dollarTag) {
          // Closing tag found
          inDollarQuote = false;
          dollarTag = '';
        }
      }
      continue;
    }

    // Handle regular string literals
    if (char === "'" || char === '"') {
      if (!inString) {
        inString = true;
        stringDelimiter = char;
      } else if (stringDelimiter === char) {
        // Check for escaped quote
        if (content[i - 1] === '\\') {
          // escaped, treat as part of string
        } else {
          inString = false;
          stringDelimiter = '';
        }
      }
    }

    current += char;

    // End of statement (semicolon outside of strings)
    if (char === ';' && !inString && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Add any remaining content as a statement (maybe missing semicolon)
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s.length > 0);
}

runMigration().catch(console.error);