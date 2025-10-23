#!/usr/bin/env node

/**
 * Test Script for Multi-Account Content Generation
 * 
 * This script allows testing random content generation for both accounts:
 * - @gibbi_ai: English vocabulary content (single tweets with images)
 * - @princediwakar25: Business/cricket storytelling (threads) + satirical tweets
 * 
 * Usage:
 *   node scripts/test.js                    # Generate random content for random account
 *   node scripts/test.js --account gibbi    # Generate for @gibbi_ai only
 *   node scripts/test.js --account prince   # Generate for @princediwakar25 only
 *   node scripts/test.js --type thread      # Generate threads only
 *   node scripts/test.js --type tweet    # Generate single tweets only
 *   node scripts/test.js --count 5          # Generate 5 pieces of content
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
    gibbi: {
      handle: '@gibbi_ai',
      personas: ['english_vocab_builder'],
      contentTypes: ['single_tweet'],
      description: 'English vocabulary builder with educational images'
    },
    prince: {
      handle: '@princediwakar25', 
      personas: ['satirist', 'pattern_spotter', 'business_storyteller', 'cricket_storyteller'],
      contentTypes: [ 'single_tweet', 'thread'],
      description: 'Business/cricket storytelling threads + satirical tweets'
    }
  }
};

// Utility functions
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    account: null,
    type: null,
    count: 1
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--account':
        options.account = args[i + 1];
        i++;
        break;
      case '--type':
        options.type = args[i + 1];
        i++;
        break;
      case '--count':
        options.count = parseInt(args[i + 1]) || 1;
        i++;
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
🧪 Multi-Account Content Generation Test Script

USAGE:
  node scripts/test.js [options]

OPTIONS:
  --account <gibbi|prince>    Generate for specific account only
  --type <thread|single_tweet>       Generate specific content type only
  --count <number>            Number of content pieces to generate (default: 1)
  --help, -h                  Show this help message

EXAMPLES:
  node scripts/test.js                        # Random generation
  node scripts/test.js --account gibbi        # @gibbi_ai only
  node scripts/test.js --account prince       # @princediwakar25 only
  node scripts/test.js --type thread          # Threads only
  node scripts/test.js --count 3              # Generate 3 pieces

ACCOUNTS:
  gibbi  → @gibbi_ai (English vocab + images)
  prince → @princediwakar25 (Business/cricket threads + satirical tweets)
`);
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      headers: {
        'Authorization': `Bearer ${CONFIG.cronSecret}`,
        'User-Agent': 'Multi-Account-Test-Script/1.0',
        ...options.headers
      },
      timeout: 60000 // 60 second timeout
    };

    const req = client.get(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            error: 'Failed to parse JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function selectRandomGeneration(options) {
  let availableAccounts = Object.keys(CONFIG.accounts);

  // --- 1. Filter accounts based on the requested content type ---
  // If a type is specified, only keep accounts that can generate that type.
  if (options.type) {
    // Basic validation for the type argument itself
    if (!['single_tweet', 'thread'].includes(options.type)) {
      throw new Error(`Invalid content type: "${options.type}". Use 'single_tweet' or 'thread'.`);
    }
    
    availableAccounts = availableAccounts.filter(accName =>
      CONFIG.accounts[accName].contentTypes.includes(options.type)
    );

    // If no accounts support the requested type, it's an impossible request.
    if (availableAccounts.length === 0) {
      throw new Error(`No accounts support the content type "${options.type}".`);
    }
  }

  // --- 2. Filter accounts based on the requested account name ---
  // If an account is specified, it must be within our already-filtered list.
  if (options.account) {
    // Basic validation for the account argument
    if (!CONFIG.accounts[options.account]) {
        throw new Error(`Invalid account: "${options.account}". Use 'gibbi' or 'prince'.`);
    }

    // Check if the requested account is compatible with the requested type (if any).
    if (availableAccounts.includes(options.account)) {
      availableAccounts = [options.account]; // The list now contains only the specified account.
    } else {
      // This case is hit if, for example, the user runs:
      // node scripts/test.js --account gibbi --type thread
      throw new Error(`Conflict: Account "${options.account}" does not support the content type "${options.type}".`);
    }
  }
  
  // --- 3. Select an account from the valid, filtered pool ---
  const selectedAccount = randomChoice(availableAccounts);
  const accountConfig = CONFIG.accounts[selectedAccount];

  // --- 4. Determine the final content type ---
  // If a type was specified in options, we MUST use it. Otherwise, choose randomly.
  const contentType = options.type || randomChoice(accountConfig.contentTypes);

  // --- 5. Select the persona (this logic was good, so we keep it) ---
  let persona = randomChoice(accountConfig.personas);

  // For Prince's single tweets, prefer satirist persona and pattern_spotter
  if (selectedAccount === 'prince' && contentType === 'single_tweet') {
    const personas = ['satirist'];
    persona = randomChoice(personas);
  }

  // For Prince's threads, prefer business/cricket storytellers
  if (selectedAccount === 'prince' && contentType === 'thread') {
    const threadPersonas = ['business_storyteller', 'cricket_storyteller'];
    persona = randomChoice(threadPersonas);
  }

  return {
    account: selectedAccount,
    accountConfig,
    contentType,
    persona
  };
}

async function generateContent(selection) {
  const { account, accountConfig, contentType, persona } = selection;
  
  console.log(`\n🎯 Generating ${contentType} for ${accountConfig.handle}`);
  console.log(`📝 Persona: ${persona}`);
  console.log(`📋 Description: ${accountConfig.description}`);

  const params = new URLSearchParams({
    twitter_handle: accountConfig.handle,
    persona: persona,
    content_type: contentType,
    count: '1',
    debug: 'true'
  });

  const url = `${CONFIG.baseUrl}/api/generate?${params}`;
  console.log(`\n🚀 Making request to: ${CONFIG.baseUrl}/api/generate`);
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(url);
    const duration = Date.now() - startTime;

    if (response.status === 200) {
      const data = response.data;
      console.log(`\n✅ Generation successful (${duration}ms)`);
      console.log(`👤 Account: ${data.accountName || 'Unknown'}`);
      
      if (data.generated) {
        console.log(`📈 Generated: ${data.generated.single_tweets || 0} tweets, ${data.generated.threads || 0} threads`);
        
        if (data.generatedThreads && data.generatedThreads.length > 0) {
          const thread = data.generatedThreads[0];
          if (thread.thread_id !== 'generating-async') {
            console.log(`🧵 Thread: "${thread.title || 'Untitled'}" (${thread.total_tweets} tweets)`);
          } else {
            console.log(`⏳ Thread generating asynchronously...`);
          }
        }
      }

      return {
        success: true,
        account,
        contentType,
        persona,
        data: response.data
      };
    } else {
      console.log(`\n❌ Generation failed (${response.status})`);
      console.log(`Error: ${JSON.stringify(response.data, null, 2)}`);
      return {
        success: false,
        account,
        contentType, 
        persona,
        error: response.data
      };
    }
  } catch (error) {
    console.log(`\n💥 Request failed: ${error.message}`);
    return {
      success: false,
      account,
      contentType,
      persona,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 Multi-Account Content Generation Test');
  console.log('==========================================');

  try {
    const options = parseArgs();
    console.log(`\nOptions: ${JSON.stringify(options, null, 2)}`);

    const results = [];

    for (let i = 0; i < options.count; i++) {
      if (options.count > 1) {
        console.log(`\n--- Generation ${i + 1}/${options.count} ---`);
      }

      const selection = selectRandomGeneration(options);
      const result = await generateContent(selection);
      results.push(result);

      // Add delay between requests to avoid rate limiting
      if (i < options.count - 1) {
        console.log('\n⏳ Waiting 2 seconds before next generation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n📊 GENERATION SUMMARY');
    console.log('====================');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (successful > 0) {
      console.log('\n🎉 Generated Content:');
      results.filter(r => r.success).forEach((result, index) => {
        console.log(`  ${index + 1}. ${CONFIG.accounts[result.account].handle} - ${result.contentType} (${result.persona})`);
      });
    }

    if (failed > 0) {
      console.log('\n💥 Failures:');
      results.filter(r => !r.success).forEach((result, index) => {
        console.log(`  ${index + 1}. ${CONFIG.accounts[result.account].handle} - ${result.error}`);
      });
    }

    process.exit(successful > 0 ? 0 : 1);

  } catch (error) {
    console.error(`\n💥 Script failed: ${error.message}`);
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