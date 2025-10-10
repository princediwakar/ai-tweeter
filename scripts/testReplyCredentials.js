#!/usr/bin/env node

/**
 * Reply Credentials Diagnostic Test
 *
 * Tests if database credentials can post both regular tweets and replies
 * to diagnose engagement API reply failures.
 *
 * Usage:
 *   node scripts/testReplyCredentials.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const TEST_TWEET_ID = '1976295083470201101'; // The @stats_feed tweet from earlier

// Validate required environment variables
if (!process.env.ENCRYPTION_KEY && !process.env.NEXTAUTH_SECRET) {
  console.error('❌ ENCRYPTION_KEY or NEXTAUTH_SECRET environment variable is required');
  console.error('   Make sure it\'s set in your .env.local file');
  process.exit(1);
}

async function main() {
  console.log('\n🔍 Reply Credentials Diagnostic Test');
  console.log('=====================================\n');

  try {
    // Import modules after environment is loaded
    const { accountService } = require('../lib/accountService');
    const { postTweet, postReplyTweet } = require('../lib/twitter');

    // 1. Get account credentials from database
    console.log('📦 Fetching account credentials from database...');
    const account = await accountService.getAccountByTwitterHandle('@princediwakar25');

    if (!account) {
      console.error('❌ Account not found in database');
      process.exit(1);
    }

    console.log('✅ Account found:', account.name);
    console.log(`   Handle: ${account.twitter_handle}`);
    console.log(`   ID: ${account.id}`);
    console.log(`   API Key (preview): ${account.twitter_api_key?.substring(0, 10)}...`);
    console.log(`   Access Token (preview): ${account.twitter_access_token?.substring(0, 10)}...\n`);

    const credentials = {
      apiKey: account.twitter_api_key,
      apiSecret: account.twitter_api_secret,
      accessToken: account.twitter_access_token,
      accessSecret: account.twitter_access_token_secret,
    };

    // 2. Test regular tweet posting
    console.log('🧪 TEST 1: Posting a regular tweet');
    console.log('-----------------------------------');
    try {
      const testContent = `Testing credentials at ${new Date().toISOString().substring(11, 19)} - Regular tweet`;
      console.log(`Content: "${testContent}"`);

      const result = await postTweet(testContent, credentials);

      console.log('✅ SUCCESS: Regular tweet posted!');
      console.log(`   Tweet ID: ${result.data.id}`);
      console.log(`   URL: https://x.com/princediwakar25/status/${result.data.id}\n`);
    } catch (error) {
      console.error('❌ FAILED: Regular tweet posting failed');
      console.error(`   Error: ${error.message}\n`);
      console.log('Stopping here - if regular tweets fail, replies will definitely fail.\n');
      process.exit(1);
    }

    // 3. Test reply tweet posting
    console.log('🧪 TEST 2: Posting a reply to an existing tweet');
    console.log('------------------------------------------------');
    console.log(`Target tweet ID: ${TEST_TWEET_ID}`);
    console.log(`Target tweet URL: https://x.com/stats_feed/status/${TEST_TWEET_ID}`);

    try {
      const replyContent = `Testing reply functionality at ${new Date().toISOString().substring(11, 19)}`;
      console.log(`Reply content: "${replyContent}"`);

      const result = await postReplyTweet(replyContent, TEST_TWEET_ID, credentials);

      console.log('✅ SUCCESS: Reply posted!');
      console.log(`   Reply ID: ${result.data.id}`);
      console.log(`   URL: https://x.com/princediwakar25/status/${result.data.id}\n`);
    } catch (error) {
      console.error('❌ FAILED: Reply posting failed');
      console.error(`   Error: ${error.message}`);
      console.log('\n📊 DIAGNOSIS:');
      console.log('   - Regular tweets: ✅ Working');
      console.log('   - Reply tweets: ❌ Failing');
      console.log('\n💡 This suggests one of the following:');
      console.log('   1. Twitter API app settings restrict reply functionality');
      console.log('   2. The target tweet has reply restrictions');
      console.log('   3. There\'s a rate limit on replies (separate from regular tweets)');
      console.log('   4. The OAuth signature generation differs for replies\n');
      process.exit(1);
    }

    console.log('🎉 FINAL RESULT: Both regular tweets AND replies work!');
    console.log('   The issue must be somewhere else in the engagement flow.\n');
    process.exit(0);

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
main();
