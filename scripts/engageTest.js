#!/usr/bin/env node

/**
 * Test Script for the Engagement System
 * * This script triggers the engagement API endpoint to simulate the cron job.
 * It's designed to test the entire flow: scouting, selection, rate-limiting, and replying.
 * * Usage:
 * node scripts/test-engagement.js          # Trigger one engagement check (respects schedule)
 * node scripts/test-engagement.js --count 4  # Simulate 4 consecutive checks (e.g., a full 1-hour window)
 * node scripts/test-engagement.js --debug    # Bypass schedule and run one check immediately
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const https = require('https');
const http = require('http');

// Validate required environment variables
if (!process.env.CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is required');
  console.error('   Make sure it\'s set in your .env.local file');
  process.exit(1);
}

// Configuration
const CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://aitweeter.vercel.app' 
    : 'http://localhost:3000',
  cronSecret: process.env.CRON_SECRET,
  accounts: {
    prince: {
      handle: '@princediwakar25', 
      description: 'Business Thought Leader Engagement'
    },
    indusvalley: {
      handle: '@IndusValleyAI',
      description: 'Indus Valley Context AI Engagement'
    }
  }
};

// --- Utility Functions ---

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    account: 'prince',
    count: 1,
    debug: false 
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--account':
        options.account = args[i + 1];
        i++;
        break;
      case '--count':
        options.count = parseInt(args[i + 1]) || 1;
        i++;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  return options;
}

function showHelp() {
  console.log(`
🤝 Engagement System Test Script

   Simulates the cron job that checks for opportunities to engage with target accounts.

USAGE:
  node scripts/test-engagement.js [options]

OPTIONS:
  --account <prince|indusvalley>    Test a specific account (default: prince)
  --count <number>      Number of times to run the check (default: 1)
  --debug               Bypass the schedule check for immediate testing
  --help, -h            Show this help message

EXAMPLES:
  node scripts/test-engagement.js          # Run a single check, respects schedule
  node scripts/test-engagement.js --debug    # Run a single check, bypassing schedule
`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      headers: {
        'Authorization': `Bearer ${CONFIG.cronSecret}`,
        'User-Agent': 'Engagement-Test-Script/1.0',
        ...options.headers
      },
      timeout: 90000
    };

    const req = client.get(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, error: 'Failed to parse JSON' });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// --- Main Execution Logic ---

async function triggerEngagementCheck(accountKey, options) {
  const accountConfig = CONFIG.accounts[accountKey];
  if (!accountConfig) {
    throw new Error(`Invalid account key: ${accountKey}. Available: ${Object.keys(CONFIG.accounts).join(', ')}`);
  }
  
  console.log(`\n🎯 Triggering engagement check for ${accountConfig.handle}`);
  
  const params = new URLSearchParams({
    twitter_handle: accountConfig.handle,
  });

  if (options.debug) {
    params.append('debug', 'true');
  }

  const url = `${CONFIG.baseUrl}/api/engage?${params}`;
  console.log(`🚀 Making request to: ${CONFIG.baseUrl}/api/engage${options.debug ? ' (DEBUG)' : ''}`);

  try {
    const startTime = Date.now();
    const response = await makeRequest(url);
    const duration = Date.now() - startTime;

    if (response.status === 200) {
      const { success, message, engagement } = response.data;
      if (success) {
        console.log(`\n✅ ENGAGEMENT SUCCESSFUL (${duration}ms)`);
        console.log(`   - Target: ${engagement.target}`);
        console.log(`   - Reply URL: ${engagement.replyUrl}`);
        return { status: 'success', message: message };
      } else {
        console.log(`\n☑️ SKIPPED (${duration}ms): ${message}`);
        return { status: 'skipped', message: message };
      }
    } else {
      console.log(`\n❌ FAILED (${response.status})`);
      console.log(`   Error: ${JSON.stringify(response.data, null, 2)}`);
      return { status: 'failed', message: response.data.error || 'Unknown server error' };
    }
  } catch (error) {
    console.log(`\n💥 REQUEST FAILED: ${error.message}`);
    return { status: 'failed', message: error.message };
  }
}

async function main() {
  console.log('🤝 Engagement System Test');
  console.log('========================');

  try {
    const options = parseArgs();
    
    // +++ THE FIX +++
    // Allow DEBUG_MODE from .env to override the default, making logs accurate.
    if (process.env.DEBUG_MODE === 'true' && !options.debug) {
      console.log("... INFO: DEBUG_MODE=true found in .env file. Forcing debug mode.");
      options.debug = true;
    }

    console.log(`\nOptions: ${JSON.stringify(options, null, 2)}`);

    const results = [];

    for (let i = 0; i < options.count; i++) {
      if (options.count > 1) {
        console.log(`\n--- Check ${i + 1}/${options.count} ---`);
      }
      const result = await triggerEngagementCheck(options.account, options);
      results.push(result);

      if (i < options.count - 1) {
        console.log('\n⏳ Waiting 2 seconds before next check...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n📊 ENGAGEMENT CHECK SUMMARY');
    console.log('============================');
    const successes = results.filter(r => r.status === 'success').length;
    const skips = results.filter(r => r.status === 'skipped').length;
    const failures = results.filter(r => r.status === 'failed').length;
    
    console.log(`✅ Successful Engagements: ${successes}`);
    console.log(`☑️ Skipped Checks: ${skips}`);
    console.log(`❌ Failed Checks: ${failures}`);

    if (failures > 0) {
      console.log('\n💥 Failure Details:');
      results.filter(r => r.status === 'failed').forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.message}`);
      });
      process.exit(1);
    }

    console.log("\n🎉 Script finished successfully.");
    process.exit(0);

  } catch (error) {
    console.error(`\n💥 SCRIPT FAILED: ${error.message}`);
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