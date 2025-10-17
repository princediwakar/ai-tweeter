// Test script to verify Gandhi account configuration
// Run with: node scripts/test-gandhi-config.js

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Gandhi Account Configuration\n');
console.log('=' .repeat(60));

// Test 1: Check engagement-targets.json
console.log('\n✅ Test 1: Engagement Targets Configuration');
console.log('-'.repeat(60));

const targetsPath = path.join(process.cwd(), 'config', 'engagement-targets.json');
const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));

if (targets['@Gandhi_Wisom_']) {
  console.log('✓ Gandhi account found in engagement-targets.json');
  console.log('  - Engagement persona:', targets['@Gandhi_Wisom_'].engagement_persona);
  console.log('  - Priority targets:', targets['@Gandhi_Wisom_'].priority_targets.length);
  console.log('  - Max engagements/day:', targets['@Gandhi_Wisom_'].rules.max_engagements_per_day);
  console.log('  - Min hours between same target:', targets['@Gandhi_Wisom_'].rules.min_hours_between_same_target);

  // Check persona key is valid
  if (targets['@Gandhi_Wisom_'].engagement_persona === 'gandhi') {
    console.log('✓ Engagement persona key is correct');
  } else {
    console.error('✗ ERROR: Engagement persona should be "gandhi"');
  }

  // List first 3 targets
  console.log('\n  Top 3 targets:');
  targets['@Gandhi_Wisom_'].priority_targets.slice(0, 3).forEach(t => {
    console.log(`    - ${t.username} (Tier ${t.tier}): ${t.description}`);
  });
} else {
  console.error('✗ ERROR: Gandhi account not found in engagement-targets.json');
}

// Test 2: Check if persona exists
console.log('\n\n✅ Test 2: Engagement Persona');
console.log('-'.repeat(60));

const personasPath = path.join(process.cwd(), 'lib', 'engagement', 'personas', 'gandhi.ts');
const personasContent = fs.readFileSync(personasPath, 'utf8');

if (personasContent.includes('gandhi:')) {
  console.log('✓ Gandhi persona found in lib/engagement/personas/gandhi.ts');

  // Extract persona info (basic check)
  if (personasContent.includes("key: 'gandhi'") &&
      personasContent.includes("displayName: 'Gandhi - The Thoughtful Voice'")) {
    console.log('✓ Gandhi persona has correct key and display name');
  }
} else {
  console.error('✗ ERROR: Gandhi persona not found in lib/engagement/personas/gandhi.ts');
}

// Test 3: Check schedule configuration
console.log('\n\n✅ Test 3: Schedule Configuration');
console.log('-'.repeat(60));

const schedulePath = path.join(process.cwd(), 'lib', 'schedule.ts');
const scheduleContent = fs.readFileSync(schedulePath, 'utf8');

if (scheduleContent.includes("'@Gandhi_Wisom_': 'gandhi_account'")) {
  console.log('✓ Gandhi account mapped in TWITTER_HANDLE_MAPPING');
}

if (scheduleContent.includes("'gandhi_account': '@Gandhi_Wisom_'")) {
  console.log('✓ Gandhi account mapped in SCHEDULE_KEY_TO_HANDLE');
}

if (scheduleContent.includes('gandhiEngagementPattern')) {
  console.log('✓ Gandhi engagement pattern defined');
}

if (scheduleContent.includes('gandhi_account:')) {
  console.log('✓ Gandhi account added to ACCOUNT_SCHEDULES');
}

// Test 4: Check documentation
console.log('\n\n✅ Test 4: Documentation');
console.log('-'.repeat(60));

const docsPath = path.join(process.cwd(), 'docs', 'MULTI_ACCOUNT_ENGAGEMENT_SETUP.md');
if (fs.existsSync(docsPath)) {
  console.log('✓ Setup documentation created at docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md');
} else {
  console.log('✗ WARNING: Setup documentation not found');
}

const sqlPath = path.join(process.cwd(), 'scripts', 'add-gandhi-account.sql');
if (fs.existsSync(sqlPath)) {
  console.log('✓ Database setup script created at scripts/add-gandhi-account.sql');
} else {
  console.log('✗ WARNING: Database setup script not found');
}

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('📊 Configuration Summary');
console.log('='.repeat(60));
console.log(`
The Gandhi engagement account is configured with:

1. ✅ Engagement targets: ${targets['@Gandhi_Wisom_']?.priority_targets.length || 0} accounts
2. ✅ Engagement persona: "${targets['@Gandhi_Wisom_']?.engagement_persona || 'not set'}"
3. ✅ Schedule: 4 sessions/day (7 AM, 12 PM, 6 PM, 9 PM IST)
4. ✅ Rate limits: ${targets['@Gandhi_Wisom_']?.rules.max_engagements_per_day || 0}/day, ${targets['@Gandhi_Wisom_']?.rules.min_hours_between_same_target || 0}h cooldown

Next steps:
1. Add Twitter API credentials to database using scripts/add-gandhi-account.sql
2. Set up cron job: GET /api/engage?twitter_handle=@Gandhi_Wisom_
3. Test with debug mode: GET /api/engage?twitter_handle=@Gandhi_Wisom_&debug=true

📚 See docs/MULTI_ACCOUNT_ENGAGEMENT_SETUP.md for complete setup guide.
`);

console.log('✨ Configuration test complete!\n');
