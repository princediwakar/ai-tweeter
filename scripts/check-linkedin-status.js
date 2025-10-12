// Check LinkedIn status for an account
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function checkStatus() {
  const sql = neon(process.env.DATABASE_URL);
  const twitterHandle = '@princediwakar25';

  const result = await sql`
    SELECT
      id,
      name,
      twitter_handle,
      linkedin_enabled,
      linkedin_user_id,
      linkedin_token_expires_at,
      CASE
        WHEN linkedin_access_token_encrypted IS NOT NULL THEN 'Yes'
        ELSE 'No'
      END as has_access_token
    FROM accounts
    WHERE twitter_handle = ${twitterHandle}
    AND status = 'active'
  `;

  if (result.length === 0) {
    console.log('❌ Account not found for Twitter handle:', twitterHandle);
    return;
  }

  const account = result[0];
  console.log('\n📊 LinkedIn Status for', account.name);
  console.log('─────────────────────────────────────');
  console.log('Twitter Handle:', account.twitter_handle);
  console.log('LinkedIn Enabled:', account.linkedin_enabled ? '✅ Yes' : '❌ No');
  console.log('Has Access Token:', account.has_access_token);
  console.log('LinkedIn User ID:', account.linkedin_user_id || '(not set)');
  console.log('Token Expires:', account.linkedin_token_expires_at || '(not set)');
  console.log('─────────────────────────────────────\n');

  if (!account.linkedin_enabled) {
    console.log('⚠️  LinkedIn is not enabled. Complete OAuth flow first.\n');
  } else if (account.has_access_token === 'No') {
    console.log('⚠️  No access token found. Complete OAuth flow first.\n');
  } else {
    console.log('✅ LinkedIn is configured and ready to use!\n');
  }
}

checkStatus().catch(console.error);
