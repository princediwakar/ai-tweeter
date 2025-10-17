// Fix Gandhi account encryption to use proper AES-256-GCM format
require('dotenv').config({ path: '.env.local' });
const { accountService } = require('../lib/accountService.ts');

async function fixEncryption() {
  try {
    console.log('🔧 Fixing Gandhi account encryption...\n');

    const apiKey = process.env.GANDHI_TWITTER_API_KEY;
    const apiSecret = process.env.GANDHI_TWITTER_API_SECRET;
    const accessToken = process.env.GANDHI_TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.GANDHI_TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error('❌ Missing Gandhi credentials in environment');
      process.exit(1);
    }

    // Update the account with properly encrypted credentials
    const updated = await accountService.updateAccount('165f7f23-a315-4285-919e-be16951494ba', {
      twitter_api_key: apiKey,
      twitter_api_secret: apiSecret,
      twitter_access_token: accessToken,
      twitter_access_token_secret: accessSecret
    });

    console.log('✅ Successfully updated Gandhi account with proper encryption!');
    console.log('Account ID:', updated.id);
    console.log('Twitter Handle:', updated.twitter_handle);
    console.log('\n✅ Credentials are now properly encrypted and ready to use!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixEncryption();
