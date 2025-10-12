// Generate LinkedIn OAuth authorization URL
// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const clientId = process.env.LINKEDIN_CLIENT_ID;

if (!clientId) {
  console.error('❌ LINKEDIN_CLIENT_ID not configured in .env.local');
  process.exit(1);
}

// Determine redirect URI based on environment
const redirectUri = process.env.NODE_ENV === 'production'
  ? 'https://aitweeter.vercel.app/auth/linkedin'
  : 'http://localhost:3000/auth/linkedin';

// Generate a random state for CSRF protection
const state = Math.random().toString(36).substring(7);

const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  state,
  scope: 'openid profile email w_member_social',
});

const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

console.log('\n🔗 LinkedIn OAuth Authorization URL:\n');
console.log(authUrl);
console.log('\n📋 Instructions:');
console.log('1. Visit the URL above in your browser');
console.log('2. Sign in with your LinkedIn account');
console.log('3. Authorize the application');
console.log('4. You will be redirected to your callback URL');
console.log('5. LinkedIn credentials will be saved automatically\n');
console.log('⚠️  State parameter (save this for verification):', state, '\n');
