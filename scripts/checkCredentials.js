// scripts/checkCredentials.js
// Quick diagnostic to check what credentials are in the database

require('dotenv').config({ path: '.env.local' });
const { accountService } = require('../lib/accountService');

async function checkCredentials() {
  try {
    console.log('\n🔍 Checking credentials for @princediwakar25...\n');

    const account = await accountService.getAccountByTwitterHandle('@princediwakar25');

    if (!account) {
      console.log('❌ Account not found in database');
      return;
    }

    console.log('✅ Account found:');
    console.log(`   Name: ${account.name}`);
    console.log(`   Handle: ${account.twitter_handle}`);
    console.log(`   ID: ${account.id}`);
    console.log('\n📝 Credential previews (first 10 chars):');
    console.log(`   API Key: ${account.twitter_api_key?.substring(0, 10)}...`);
    console.log(`   API Secret: ${account.twitter_api_secret?.substring(0, 10)}...`);
    console.log(`   Access Token: ${account.twitter_access_token?.substring(0, 10)}...`);
    console.log(`   Access Secret: ${account.twitter_access_token_secret?.substring(0, 10)}...`);

    console.log('\n🔐 Comparing with .env.local:');
    console.log(`   .env API Key: ${process.env.TWITTER_API_KEY?.substring(0, 10)}...`);
    console.log(`   .env Access Token: ${process.env.TWITTER_ACCESS_TOKEN?.substring(0, 10)}...`);

    const apiKeyMatch = account.twitter_api_key === process.env.TWITTER_API_KEY;
    const tokenMatch = account.twitter_access_token === process.env.TWITTER_ACCESS_TOKEN;

    console.log('\n📊 Match Status:');
    console.log(`   API Key matches: ${apiKeyMatch ? '✅' : '❌'}`);
    console.log(`   Access Token matches: ${tokenMatch ? '✅' : '❌'}`);

    if (!apiKeyMatch || !tokenMatch) {
      console.log('\n⚠️  MISMATCH DETECTED! Your database has different credentials than your .env.local file.');
      console.log('   This is why engagement replies fail but auto-post works (if it uses same DB creds).');
      console.log('\n💡 Solution: Update database credentials to match your .env.local:');
      console.log('   Run: node scripts/updateAccount.js');
    } else {
      console.log('\n✅ Credentials match! The issue must be something else.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkCredentials();
