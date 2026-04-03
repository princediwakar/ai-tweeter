const fs = require('fs');
const path = require('path');
const http = require('http');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const cronSecretMatch = envContent.match(/CRON_SECRET=([^\n]+)/);
const CRON_SECRET = cronSecretMatch ? cronSecretMatch[1].replace(/['"]/g, '').trim() : '';

async function makeRequest(apiPath, method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: apiPath,
      method: method,
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Testing @princediwakar25 POSTING...');
  try {
    const pRes = await makeRequest('/api/auto-post', 'POST', { twitter_handle: '@princediwakar25', debug: true });
    console.log(JSON.stringify(pRes.data, null, 2));
  } catch (e) { console.error('Error:', e.message); }

  console.log('\nTesting @gibbi_ai POSTING...');
  try {
    const gRes = await makeRequest('/api/auto-post', 'POST', { twitter_handle: '@gibbi_ai', debug: true });
    console.log(JSON.stringify(gRes.data, null, 2));
  } catch (e) { console.error('Error:', e.message); }
}

run();
