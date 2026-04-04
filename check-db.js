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
    const res = await client.query('SELECT id, platform, account_username, is_active FROM connected_accounts');
    console.log('--- Connected Accounts ---');
    console.log(JSON.stringify(res.rows, null, 2));
    console.log('---------------------------');
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
