// Check if Gandhi account exists in database
require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function checkAccount() {
  try {
    const result = await sql`
      SELECT id, name, twitter_handle, status
      FROM accounts
      WHERE twitter_handle = '@gandhi_wisdom_'
    `;

    if (result.rows.length > 0) {
      console.log('✅ Account found:', result.rows[0]);
    } else {
      console.log('❌ No account found with handle @gandhi_wisdom_');

      // Check all accounts
      const all = await sql`SELECT id, name, twitter_handle FROM accounts`;
      console.log('\nAll accounts in database:');
      all.rows.forEach(acc => {
        console.log(`  - ${acc.twitter_handle} (${acc.name})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAccount();
