// scripts/test-linkedin-local.js
// Full LinkedIn flow: check status, generate, and optionally post
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const http = require('http');
const https = require('https');

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = 'http://localhost:3000';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` },
      timeout: 120000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data, error: 'Not JSON' });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'status'; // status | generate | post | full

  console.log('\n🔗 LinkedIn Analyst — Local Test\n');
  console.log('═══════════════════════════════════════\n');

  const sql = neon(process.env.DATABASE_URL);
  const handle = '@princediwakar25';

  // --- Check account ---
  const accounts = await sql`
    SELECT id, name, twitter_handle, linkedin_enabled,
      CASE WHEN linkedin_access_token_encrypted IS NOT NULL THEN 'Yes' ELSE 'No' END as has_token
    FROM accounts WHERE twitter_handle = ${handle} AND status = 'active'
  `;

  if (accounts.length === 0) {
    console.log('❌ Account not found'); return;
  }
  const account = accounts[0];
  console.log(`✅ Account: ${account.name}`);
  console.log(`   LinkedIn: ${account.linkedin_enabled ? '✅ Enabled' : '❌ Disabled'} | Token: ${account.has_token === 'Yes' ? '✅' : '❌'}\n`);

  // --- Check ready tweets ---
  const ready = await sql`
    SELECT id, content, persona, status, linkedin_id, created_at
    FROM tweets
    WHERE account_id = ${account.id}
    AND status IN ('ready', 'posted')
    AND linkedin_id IS NULL
    AND content_type = 'single_tweet'
    AND persona = 'linkedin_analyst'
    ORDER BY created_at ASC
    LIMIT 5
  `;

  console.log(`📋 Ready for LinkedIn: ${ready.length} tweets\n`);
  ready.forEach((t, i) => {
    console.log(`   ${i + 1}. [${t.status}] ${t.content.substring(0, 80)}...`);
    console.log(`      (${t.content.length} chars, created ${t.created_at})\n`);
  });

  if (action === 'status') {
    console.log('═══════════════════════════════════════');
    console.log('\nUsage:');
    console.log('  node scripts/test-linkedin-local.js status    # Check ready tweets (default)');
    console.log('  node scripts/test-linkedin-local.js generate  # Generate a new linkedin_analyst tweet');
    console.log('  node scripts/test-linkedin-local.js post      # Post next ready tweet to LinkedIn');
    console.log('  node scripts/test-linkedin-local.js full      # Generate + Post in one go\n');
    return;
  }

  // --- Generate ---
  if (action === 'generate' || action === 'full') {
    console.log('🤖 Generating linkedin_analyst content...\n');
    try {
      const url = `${BASE_URL}/api/generate?twitter_handle=${encodeURIComponent(handle)}&persona=linkedin_analyst&debug=true`;
      const res = await makeRequest(url);
      if (res.status === 200 && res.data.success) {
        const tweets = res.data.generatedTweets || [];
        console.log(`✅ Generated ${res.data.generated?.single_tweets || 0} tweet(s) in ${res.data.duration_s}s`);
        if (tweets.length > 0) {
          console.log(`   Length: ${tweets[0].length} chars`);
          console.log(`   Source: ${tweets[0].sourceUrl || 'N/A'}\n`);
        }
      } else {
        console.log(`❌ Generation failed (HTTP ${res.status}):`, res.data.error || res.data.message || 'Unknown');
        if (action === 'full') { console.log('   Skipping post step.\n'); return; }
      }
    } catch (err) {
      console.log(`❌ Generation request failed: ${err.message}`);
      console.log('   Make sure dev server is running: npm run dev\n');
      return;
    }
  }

  // --- Post ---
  if (action === 'post' || action === 'full') {
    // Re-check ready tweets after generation
    const postReady = await sql`
      SELECT id, content FROM tweets
      WHERE account_id = ${account.id}
      AND status IN ('ready', 'posted') AND linkedin_id IS NULL
      AND content_type = 'single_tweet' AND persona = 'linkedin_analyst'
      ORDER BY created_at ASC LIMIT 1
    `;

    if (postReady.length === 0) {
      console.log('⚠️  No tweets ready to post. Generate first.\n');
      return;
    }

    console.log(`📤 Posting to LinkedIn: "${postReady[0].content.substring(0, 60)}..."\n`);
    try {
      const res = await makeRequest(`${BASE_URL}/api/auto-post-linkedin`);
      if (res.status === 200 && res.data.success) {
        console.log(`✅ LinkedIn posted! (${res.data.totalPosted} posted, ${res.data.totalErrors} errors)\n`);
      } else {
        console.log(`❌ Posting failed (HTTP ${res.status}):`, res.data.error || 'Unknown\n');
      }
    } catch (err) {
      console.log(`❌ Post request failed: ${err.message}`);
      console.log('   Make sure dev server is running: npm run dev\n');
    }
  }
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1); });