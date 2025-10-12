// List all accounts in the database
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function listAccounts() {
  const sql = neon(process.env.DATABASE_URL);

  const result = await sql`
    SELECT id, name, twitter_handle, status, personas
    FROM accounts
    WHERE status = 'active'
  `;

  console.log('\n📋 Active Accounts:\n');
  console.log('─────────────────────────────────────────────────────────');

  result.forEach(account => {
    console.log(`ID: ${account.id}`);
    console.log(`Name: ${account.name}`);
    console.log(`Twitter: ${account.twitter_handle}`);
    console.log(`Personas: ${account.personas.join(', ')}`);
    console.log('─────────────────────────────────────────────────────────');
  });

  console.log(`\nTotal: ${result.length} account(s)\n`);
}

listAccounts().catch(console.error);
