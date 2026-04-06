const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Basic .env parser
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

async function run() {
  loadEnv();
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database');

    // Check if personas column already exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'connected_accounts' AND column_name = 'personas'
    `);

    if (checkResult.rows.length === 0) {
      console.log('Adding personas column to connected_accounts table...');
      await client.query(`
        ALTER TABLE connected_accounts
        ADD COLUMN personas JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added personas column');

      // Add index for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_connected_accounts_personas
        ON connected_accounts USING GIN (personas)
      `);
      console.log('✅ Created index on personas column');
    } else {
      console.log('✅ personas column already exists');
    }

    // Verify column details
    const verifyResult = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'connected_accounts' AND column_name = 'personas'
    `);

    console.log('Column details:', verifyResult.rows[0]);

  } catch (err) {
    console.error('Migration Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Migration completed');
  }
}

run();