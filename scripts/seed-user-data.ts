import { sql } from '@vercel/postgres';

async function seedData() {
  console.log('Starting seed data process...');

  // 1. Find or create the user
  console.log('\n--- Step 1: Find or create user ---');
  const existingUser = await sql`
    SELECT id, email, name FROM users WHERE email = 'princediwakar25@gmail.com'
  `;

  let userId: string;

  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    console.log(`Found existing user: ${existingUser.rows[0].email} (${userId})`);
  } else {
    const newUser = await sql`
      INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Prince Diwakar', 'princediwakar25@gmail.com', NOW(), NOW(), NOW())
      RETURNING id
    `;
    userId = newUser.rows[0].id;
    console.log(`Created new user: princediwakar25@gmail.com (${userId})`);
  }

  // 2. Get or create connected accounts for the user
  console.log('\n--- Step 2: Get or create connected accounts ---');
  const platforms = ['twitter', 'linkedin'];
  const connectedAccounts = [];

  for (const platform of platforms) {
    const existingAccount = await sql`
      SELECT id, account_username, platform FROM connected_accounts
      WHERE user_id = ${userId} AND platform = ${platform}
    `;

    if (existingAccount.rows.length > 0) {
      console.log(`  Found existing ${platform} account: @${existingAccount.rows[0].account_username}`);
      connectedAccounts.push(existingAccount.rows[0]);
    } else {
      // Create a dummy connected account for seeding
      const username = platform === 'twitter' ? 'test_twitter' : 'test_linkedin';
      const newAccount = await sql`
        INSERT INTO connected_accounts (
          id, user_id, platform, account_username, account_name, platform_user_id,
          access_token_encrypted, refresh_token_encrypted, token_expires_at,
          is_active, connected_at, last_used_at
        ) VALUES (
          gen_random_uuid(), ${userId}, ${platform}, ${username}, 'Test Account', 'test123',
          '', '', NULL, true, NOW(), NOW()
        )
        RETURNING id, account_username, platform
      `;
      console.log(`  Created new ${platform} account: @${newAccount.rows[0].account_username}`);
      connectedAccounts.push(newAccount.rows[0]);
    }
  }

  // 3. Seed personas for each connected account
  console.log('\n--- Step 3: Seed personas ---');

  // Persona definitions per platform
  const personaDefinitions = [
    {
      platform: 'twitter',
      name: 'Pattern Spotter',
      description: 'Finds non-obvious patterns across multiple news stories.',
      config: { key: 'pattern_spotter', displayName: 'Pattern Spotter' },
      min_length: 100,
      max_length: 280,
      tone: 'analytical',
      topics: ['news', 'patterns'],
      is_default: true
    },
    {
      platform: 'twitter',
      name: 'The Signal Finder',
      description: 'Extracts non-obvious insights from news using specific data and evidence.',
      config: { key: 'satirist', displayName: 'The Signal Finder' },
      min_length: 100,
      max_length: 280,
      tone: 'insightful',
      topics: ['news', 'analysis'],
      is_default: false
    },
    {
      platform: 'linkedin',
      name: 'Business Analyst',
      description: 'Creates meaningful, long-form content on AI, products, startups, trends.',
      config: { key: 'linkedin_analyst', displayName: 'Business Analyst' },
      min_length: 600,
      max_length: 2500,
      tone: 'professional',
      topics: ['AI', 'business', 'startups'],
      is_default: true
    }
  ];

  for (const account of connectedAccounts) {
    // Check if personas already exist for this account
    const existingPersonas = await sql`
      SELECT id FROM personas WHERE connected_account_id = ${account.id}
    `;

    if (existingPersonas.rows.length > 0) {
      console.log(`  Skipping personas for account @${account.account_username} (already exist)`);
      continue;
    }

    const accountPersonas = personaDefinitions.filter(p => p.platform === account.platform);
    let defaultCreated = false;

    for (const personaDef of accountPersonas) {
      const topicsArray = personaDef.topics ? `{${personaDef.topics.join(',')}}` : '{}';
      await sql`
        INSERT INTO personas (
          id, connected_account_id, name, description, rss_sources, config,
          min_length, max_length, tone, topics, is_active, is_default,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${account.id},
          ${personaDef.name},
          ${personaDef.description},
          '[]'::jsonb,
          ${JSON.stringify(personaDef.config)}::jsonb,
          ${personaDef.min_length},
          ${personaDef.max_length},
          ${personaDef.tone},
          ${topicsArray}::text[],
          true,
          ${personaDef.is_default},
          NOW(),
          NOW()
        )
      `;
      if (personaDef.is_default) {
        defaultCreated = true;
      }
    }
    console.log(`  Seeded ${accountPersonas.length} personas for @${account.account_username} (${account.platform})`);
    if (defaultCreated) {
      console.log(`    - Default persona created`);
    }
  }

  // 4. Seed default schedules for each account
  console.log('\n--- Step 4: Seed schedules ---');

  for (const account of connectedAccounts) {
    // Check if schedules already exist
    const existingSchedules = await sql`
      SELECT id FROM schedules WHERE connected_account_id = ${account.id}
    `;

    if (existingSchedules.rows.length > 0) {
      console.log(`  Skipping schedules for account @${account.account_username} (already exist)`);
      continue;
    }

    // Get default persona for this account
    const defaultPersona = await sql`
      SELECT id FROM personas
      WHERE connected_account_id = ${account.id} AND is_default = true
      LIMIT 1
    `;

    const personaId = defaultPersona.rows[0]?.id || null;

    await sql`
      INSERT INTO schedules (
        id, user_id, connected_account_id, name, description, persona_id,
        cron_expression, timezone, use_trending, include_hashtags, bulk_count,
        is_active, last_run_at, next_run_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${userId},
        ${account.id},
        'Default Schedule',
        'Automatically generated schedule',
        ${personaId},
        '0 * * * *',
        'UTC',
        false,
        true,
        1,
        true,
        NULL,
        NULL,
        NOW(),
        NOW()
      )
    `;
    console.log(`  Seeded default schedule for @${account.account_username}`);
  }

  // 5. Verification
  console.log('\n--- Verification ---');
  const verification = await sql`
    SELECT
      (SELECT COUNT(*) FROM users WHERE email = 'princediwakar25@gmail.com') as user_count,
      (SELECT COUNT(*) FROM connected_accounts WHERE user_id = ${userId}) as account_count,
      (SELECT COUNT(*) FROM personas WHERE connected_account_id IN (SELECT id FROM connected_accounts WHERE user_id = ${userId})) as persona_count,
      (SELECT COUNT(*) FROM schedules WHERE user_id = ${userId}) as schedule_count
  `;

  console.log(`
    Users with email princediwakar25@gmail.com: ${verification.rows[0].user_count}
    Connected accounts owned by user: ${verification.rows[0].account_count}
    Total personas: ${verification.rows[0].persona_count}
    Total schedules: ${verification.rows[0].schedule_count}
  `);

  console.log('\n✅ Seed completed successfully!');
}

seedData().catch(console.error);