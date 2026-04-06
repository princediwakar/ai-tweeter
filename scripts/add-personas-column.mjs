import { sql } from '@vercel/postgres';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function run() {
  try {
    console.log('Checking connected_accounts table for personas column...');

    // Check if personas column already exists
    const checkResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'connected_accounts' AND column_name = 'personas'
    `;

    if (checkResult.rows.length === 0) {
      console.log('Adding personas column to connected_accounts table...');

      await sql`
        ALTER TABLE connected_accounts
        ADD COLUMN personas JSONB DEFAULT '[]'::jsonb
      `;

      console.log('✅ Added personas column');

      // Add index for performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_connected_accounts_personas
        ON connected_accounts USING GIN (personas)
      `;

      console.log('✅ Created index on personas column');
    } else {
      console.log('✅ personas column already exists');
    }

    // Verify column details
    const verifyResult = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'connected_accounts' AND column_name = 'personas'
    `;

    console.log('Column details:', verifyResult.rows[0]);
    console.log('Migration completed successfully');

  } catch (err) {
    console.error('Migration Error:', err.message);
    process.exit(1);
  }
}

run();