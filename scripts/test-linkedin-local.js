// Test LinkedIn integration locally
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function testLinkedInIntegration() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('\n🧪 Testing LinkedIn Integration Locally\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Check if account exists
  console.log('Step 1: Checking account...');
  const accountResult = await sql`
    SELECT id, name, twitter_handle, linkedin_enabled,
           linkedin_access_token_encrypted IS NOT NULL as has_token
    FROM accounts
    WHERE id = 'princediwakar25'
  `;

  if (accountResult.length === 0) {
    console.log('❌ Account "princediwakar25" not found in database');
    return;
  }

  const account = accountResult[0];
  console.log(`✅ Account found: ${account.name} (${account.twitter_handle})`);
  console.log(`   LinkedIn Enabled: ${account.linkedin_enabled ? '✅' : '❌'}`);
  console.log(`   Has Access Token: ${account.has_token ? '✅' : '❌'}\n`);

  if (!account.linkedin_enabled || !account.has_token) {
    console.log('⚠️  LinkedIn not configured. To set up:');
    console.log('   1. Run: node scripts/get-linkedin-auth-url.js');
    console.log('   2. Visit the URL and authorize');
    console.log('   3. Complete OAuth flow\n');
    return;
  }

  // Step 2: Check schedule
  console.log('Step 2: Checking LinkedIn posting schedule...');
  const { isLinkedInPostingScheduled } = require('../lib/schedule');
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const isScheduled = isLinkedInPostingScheduled(account.twitter_handle, now);

  console.log(`   Current time (IST): ${istDate.toLocaleString()}`);
  console.log(`   Day: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][istDate.getDay()]}`);
  console.log(`   Hour: ${istDate.getHours()}:00`);
  console.log(`   Scheduled for LinkedIn: ${isScheduled ? '✅ Yes' : '❌ No'}`);
  console.log(`   (LinkedIn posts: Tue-Thu at 9 AM & 1 PM IST)\n`);

  // Step 3: Check for ready tweets
  console.log('Step 3: Checking for tweets ready to post to LinkedIn...');
  const tweetsResult = await sql`
    SELECT id, content, persona, status, twitter_id, linkedin_id, created_at
    FROM tweets
    WHERE account_id = ${account.id}
    AND status IN ('ready', 'posted')
    AND linkedin_id IS NULL
    AND content_type = 'single_tweet'
    AND persona = 'satirist'
    ORDER BY created_at ASC
    LIMIT 5
  `;

  console.log(`   Found ${tweetsResult.length} tweets ready for LinkedIn\n`);

  if (tweetsResult.length === 0) {
    console.log('⚠️  No tweets ready for LinkedIn posting');
    console.log('   Generate satirist tweets first: npm run generate\n');
    return;
  }

  // Display tweets
  tweetsResult.forEach((tweet, i) => {
    console.log(`   Tweet ${i + 1}:`);
    console.log(`   └─ ID: ${tweet.id}`);
    console.log(`   └─ Content: ${tweet.content.substring(0, 80)}...`);
    console.log(`   └─ Status: ${tweet.status}`);
    console.log(`   └─ Posted to Twitter: ${tweet.twitter_id ? '✅' : '❌'}`);
    console.log(`   └─ Posted to LinkedIn: ${tweet.linkedin_id ? '✅' : '❌'}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════');
  console.log('\n✅ Test Summary:');
  console.log(`   • Account configured: ${account.has_token ? '✅' : '❌'}`);
  console.log(`   • Currently scheduled: ${isScheduled ? '✅' : '❌'}`);
  console.log(`   • Tweets ready: ${tweetsResult.length > 0 ? '✅' : '❌'}`);
  console.log('');

  if (account.has_token && tweetsResult.length > 0) {
    console.log('🚀 To test the auto-post endpoint locally:');
    console.log('   1. Start dev server: npm run dev');
    console.log('   2. In another terminal, run:');
    console.log('      curl http://localhost:3000/api/auto-post-linkedin \\');
    console.log('        -H "Authorization: Bearer 4Hqw8Wp0otUVOR9oRKl3MJyKGq/Sj9kOkEASqUn8Lt4="\n');
  }
}

testLinkedInIntegration().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
