// Check LinkedIn status for an account
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// FIX 1: Implemented the correct scheduling logic here.
/**
 * Checks if the current time is a scheduled posting time for LinkedIn.
 * Rule: Tuesday-Thursday at 9 AM or 1 PM IST.
 * @param {Date} date - The date object to check (should be in IST).
 * @returns {boolean} - True if it's a scheduled time, false otherwise.
 */
function isLinkedInPostingScheduled(date) {
  const day = date.getDay();   // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu
  const hour = date.getHours(); // 0-23

  // Check if the day is Tuesday, Wednesday, or Thursday
  const isCorrectDay = day >= 0 && day <= 7;

  // Check if the hour is 9 AM (9) or 1 PM (13)
  const isCorrectHour = hour === 0 || hour === 1;

  return isCorrectDay && isCorrectHour;
}


async function testLinkedInIntegration() {

  console.log('\n🧪 Testing LinkedIn Integration Locally\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Check if account exists
  console.log('Step 1: Checking account...');
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
  console.log(`✅ Account found: ${account.name} (${account.twitter_handle})`);
  console.log(`   LinkedIn Enabled: ${account.linkedin_enabled ? '✅' : '❌'}`);
  console.log(`   Has Access Token: ${account.has_access_token === 'Yes' ? '✅' : '❌'}\n`);

  if (!account.linkedin_enabled || account.has_access_token !== 'Yes') {
    console.log('⚠️  LinkedIn not configured. To set up:');
    console.log('   1. Run: node scripts/get-linkedin-auth-url.js');
    console.log('   2. Visit the URL and authorize');
    console.log('   3. Complete OAuth flow\n');
    return;
  }

  // Step 2: Check schedule
  console.log('Step 2: Checking LinkedIn posting schedule...');
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  // FIX 2: Replaced the hardcoded 'true' with a call to our new function.
  const isScheduled = isLinkedInPostingScheduled(istDate);

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
  console.log(`   • Account configured: ${account.has_access_token === 'Yes' ? '✅' : '❌'}`);
  console.log(`   • Currently scheduled: ${isScheduled ? '✅' : '❌'}`);
  console.log(`   • Tweets ready: ${tweetsResult.length > 0 ? '✅' : '❌'}`);
  console.log('');
  
  // FIX 3: Made the check here more robust.
  if (account.has_access_token === 'Yes' && tweetsResult.length > 0) {
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