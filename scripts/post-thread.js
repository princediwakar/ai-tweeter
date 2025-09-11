#!/usr/bin/env node

/**
 * Direct Thread Posting Script
 * Posts a specific thread bypassing schedule restrictions
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const https = require('https');
const http = require('http');

if (!process.env.CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is required');
  process.exit(1);
}

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  cronSecret: process.env.CRON_SECRET
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.cronSecret}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000
    };

    const req = client.request(url, requestOptions, (res) => {
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

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function postThread() {
  console.log('🚀 Direct Thread Posting Script');
  console.log('================================');

  try {
    // Force post by overriding schedule check
    const url = `${CONFIG.baseUrl}/api/auto-post`;
    
    console.log('\n📡 Making POST request to auto-post...');
    
    const response = await makeRequest(url, {
      method: 'POST',
      body: {
        twitter_handle: '@princediwakar25',
        debug: true
      }
    });

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.success) {
      if (response.data.threadsPosted > 0) {
        console.log(`\n🎉 Success! Posted ${response.data.threadsPosted} thread(s)`);
        console.log(`📈 Total tweets posted: ${response.data.totalPosted}`);
      } else {
        console.log('\n⚠️ No threads were posted. This might be due to:');
        console.log('   - No matching personas scheduled for current time');
        console.log('   - No ready threads available');
        console.log('   - Thread persona doesn\'t match scheduled personas');
      }
    } else {
      console.log('\n❌ Posting failed');
    }

    process.exit(response.data.threadsPosted > 0 ? 0 : 1);

  } catch (error) {
    console.error(`\n💥 Script failed: ${error.message}`);
    process.exit(1);
  }
}

postThread();