// Script to insert Gandhi account into database
// Run with: node scripts/insert-gandhi-account.js

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { sql } = require('@vercel/postgres');

async function insertGandhiAccount() {
  try {
    console.log('🔄 Inserting Gandhi Wisdom account into database...\n');

    // Check if account already exists
    const existingCheck = await sql`
      SELECT id, twitter_handle FROM accounts
      WHERE twitter_handle = '@gandhi_wisdom_'
    `;

    if (existingCheck.rows.length > 0) {
      console.log('⚠️  Account already exists!');
      console.log('Account ID:', existingCheck.rows[0].id);
      console.log('Twitter Handle:', existingCheck.rows[0].twitter_handle);
      console.log('\nSkipping insertion. If you want to update, delete the account first.');
      return;
    }

    // Read credentials from environment variables
    const apiKey = process.env.GANDHI_TWITTER_API_KEY;
    const apiSecret = process.env.GANDHI_TWITTER_API_SECRET;
    const accessToken = process.env.GANDHI_TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.GANDHI_TWITTER_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error('❌ Error: Missing environment variables!');
      console.error('\nPlease set the following environment variables:');
      console.error('  - GANDHI_TWITTER_API_KEY');
      console.error('  - GANDHI_TWITTER_API_SECRET');
      console.error('  - GANDHI_TWITTER_ACCESS_TOKEN');
      console.error('  - GANDHI_TWITTER_ACCESS_TOKEN_SECRET');
      console.error('\nExample:');
      console.error('  export GANDHI_TWITTER_API_KEY="your_api_key"');
      console.error('  export GANDHI_TWITTER_API_SECRET="your_api_secret"');
      console.error('  export GANDHI_TWITTER_ACCESS_TOKEN="your_access_token"');
      console.error('  export GANDHI_TWITTER_ACCESS_TOKEN_SECRET="your_access_secret"');
      process.exit(1);
    }

    // Encrypt credentials (simple base64 encoding with 'enc:' prefix)
    const encryptedApiKey = 'enc:' + Buffer.from(apiKey).toString('base64');
    const encryptedApiSecret = 'enc:' + Buffer.from(apiSecret).toString('base64');
    const encryptedAccessToken = 'enc:' + Buffer.from(accessToken).toString('base64');
    const encryptedAccessSecret = 'enc:' + Buffer.from(accessSecret).toString('base64');

    // Insert account
    const result = await sql`
      INSERT INTO accounts (
        id,
        name,
        twitter_handle,
        status,
        twitter_api_key_encrypted,
        twitter_api_secret_encrypted,
        twitter_access_token_encrypted,
        twitter_access_token_secret_encrypted,
        personas,
        branding,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'Gandhi Wisdom',
        '@gandhi_wisdom_',
        'active',
        ${encryptedApiKey},
        ${encryptedApiSecret},
        ${encryptedAccessToken},
        ${encryptedAccessSecret},
        ARRAY[]::text[],
        '{"theme": "wisdom", "audience": "social_leaders", "tone": "thoughtful"}'::jsonb,
        NOW(),
        NOW()
      )
      RETURNING id, name, twitter_handle, status
    `;

    console.log('✅ Successfully inserted Gandhi Wisdom account!\n');
    console.log('Account Details:');
    console.log('  ID:', result.rows[0].id);
    console.log('  Name:', result.rows[0].name);
    console.log('  Twitter Handle:', result.rows[0].twitter_handle);
    console.log('  Status:', result.rows[0].status);

    // Verify engagement log is ready
    const engagementCheck = await sql`
      SELECT COUNT(*) as engagement_count
      FROM engagement_log
      WHERE account_id = ${result.rows[0].id}
    `;

    console.log('\n✅ Engagement log ready (current count: ' + engagementCheck.rows[0].engagement_count + ')');

    console.log('\n📝 Next steps:');
    console.log('1. Set up cron job for engagement:');
    console.log('   GET /api/engage?twitter_handle=@gandhi_wisdom_');
    console.log('2. Test with debug mode:');
    console.log('   curl -H "Authorization: Bearer $CRON_SECRET" \\');
    console.log('     "http://localhost:3000/api/engage?twitter_handle=@gandhi_wisdom_&debug=true"');

  } catch (error) {
    console.error('❌ Error inserting account:', error);
    process.exit(1);
  }
}

insertGandhiAccount();
