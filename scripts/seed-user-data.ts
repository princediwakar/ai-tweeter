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

  // 2. Get all existing accounts
  console.log('\n--- Step 2: Get existing accounts ---');
  const accounts = await sql`
    SELECT id, name, twitter_handle FROM accounts WHERE owner_id IS NULL OR owner_id != ${userId}
  `;
  console.log(`Found ${accounts.rows.length} accounts to link`);

  // 3. Link accounts to user
  console.log('\n--- Step 3: Link accounts to user ---');
  for (const account of accounts.rows) {
    // Check if already linked
    const existingLink = await sql`
      SELECT * FROM user_accounts WHERE user_id = ${userId} AND account_id = ${account.id}
    `;
    
    if (existingLink.rows.length === 0) {
      await sql`
        INSERT INTO user_accounts (user_id, account_id, role, created_at)
        VALUES (${userId}, ${account.id}, 'owner', NOW())
      `;
      console.log(`  ✓ Linked account: ${account.name} (@${account.twitter_handle})`);
    }

    // Update account owner_id
    await sql`
      UPDATE accounts SET owner_id = ${userId} WHERE id = ${account.id}
    `;
  }

  // 4. Seed custom_personas for each account
  console.log('\n--- Step 4: Seed custom_personas ---');
  const builtInPersonas = [
    {
      key: 'satirist',
      name: 'The Signal Finder',
      description: 'Extracts non-obvious insights from news using specific data and evidence.',
      base_persona: 'satirist',
      min_length: 100,
      max_length: 280
    },
    {
      key: 'pattern_spotter',
      name: 'The Pattern Spotter',
      description: 'Finds non-obvious patterns across multiple news stories.',
      base_persona: 'pattern_spotter',
      min_length: 100,
      max_length: 280
    },
    {
      key: 'business_storyteller',
      name: 'Business Storyteller',
      description: 'Compelling Indian business stories with emotional depth and strategic insights.',
      base_persona: 'business_storyteller',
      min_length: 600,
      max_length: 2500
    },
    {
      key: 'cricket_storyteller',
      name: 'Cricket Storyteller',
      description: 'Human stories with cricket as the backdrop - exploring character and life lessons.',
      base_persona: 'cricket_storyteller',
      min_length: 600,
      max_length: 2500
    },
    {
      key: 'english_vocab_builder',
      name: 'Vocabulary Builder',
      description: 'Master new words, meanings, and usage in engaging ways.',
      base_persona: 'english_vocab_builder',
      min_length: 50,
      max_length: 280
    },
    {
      key: 'linkedin_analyst',
      name: 'LinkedIn Analyst',
      description: 'Creates meaningful, long-form content on AI, products, startups, and trends.',
      base_persona: 'linkedin_analyst',
      min_length: 600,
      max_length: 2500
    }
  ];

  for (const account of accounts.rows) {
    // Check if personas already exist for this account
    const existingPersonas = await sql`
      SELECT id FROM custom_personas WHERE account_id = ${account.id}
    `;

    if (existingPersonas.rows.length === 0) {
      for (const persona of builtInPersonas) {
        await sql`
          INSERT INTO custom_personas (
            id, account_id, name, description, base_persona, min_length, max_length, is_active, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${account.id},
            ${persona.name},
            ${persona.description},
            ${persona.base_persona},
            ${persona.min_length},
            ${persona.max_length},
            true,
            NOW(),
            NOW()
          )
        `;
      }
      console.log(`  ✓ Seeded ${builtInPersonas.length} personas for ${account.name}`);
    } else {
      console.log(`  - Skipped ${account.name} (personas already exist)`);
    }
  }

  // 5. Seed default schedules for each account
  console.log('\n--- Step 5: Seed account_schedules ---');
  
  for (const account of accounts.rows) {
    // Check if schedules already exist
    const existingSchedules = await sql`
      SELECT id FROM account_schedules WHERE account_id = ${account.id}
    `;

    if (existingSchedules.rows.length === 0) {
      // Create a default active schedule
      await sql`
        INSERT INTO account_schedules (
          id, account_id, name, timezone, schedule_config, days_of_week, 
          start_time, end_time, is_active, max_posts_per_day, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${account.id},
          'Default Schedule',
          'Asia/Kolkata',
          '{}',
          '{0,1,2,3,4,5,6}',
          480,  -- 8:00 AM = 8*60 = 480
          1260, -- 9:00 PM = 21*60 = 1260
          true,
          10,
          NOW(),
          NOW()
        )
      `;
      console.log(`  ✓ Seeded default schedule for ${account.name}`);
    } else {
      console.log(`  - Skipped ${account.name} (schedules already exist)`);
    }
  }

  // 6. Verify
  console.log('\n--- Verification ---');
  const verification = await sql`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE email = 'princediwakar25@gmail.com') as user_count,
      (SELECT COUNT(*) FROM accounts WHERE owner_id = ${userId}) as account_count,
      (SELECT COUNT(*) FROM custom_personas) as persona_count,
      (SELECT COUNT(*) FROM account_schedules) as schedule_count
  `;
  
  console.log(`
    Users with email princediwakar25@gmail.com: ${verification.rows[0].user_count}
    Accounts owned by user: ${verification.rows[0].account_count}
    Total custom_personas: ${verification.rows[0].persona_count}
    Total account_schedules: ${verification.rows[0].schedule_count}
  `);

  console.log('\n✅ Seed completed successfully!');
}

seedData().catch(console.error);