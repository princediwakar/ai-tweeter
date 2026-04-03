require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const http = require('http');

const CRON_SECRET = process.env.CRON_SECRET;

async function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Testing @princediwakar25 (POST /api/auto-post)');
  try {
    const pRes = await makeRequest('/api/auto-post', 'POST', { twitter_handle: '@princediwakar25', debug: true });
    console.log(pRes.data);
  } catch (e) { console.error('Error:', e.message); }

  console.log('\nTesting @gibbi_ai (POST /api/auto-post)');
  try {
    const gRes = await makeRequest('/api/auto-post', 'POST', { twitter_handle: '@gibbi_ai', debug: true });
    console.log(gRes.data);
  } catch (e) { console.error('Error:', e.message); }

  console.log('\nTesting @IndusValleyAI (GET /api/engage)');
  try {
    const iRes = await makeRequest('/api/engage?twitter_handle=@IndusValleyAI&debug=true', 'GET');
    console.log(iRes.data);
  } catch (e) { console.error('Error:', e.message); }
}

run();
