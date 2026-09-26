import { config } from 'dotenv';
config({ path: '.env.local' });

import { sql } from '@vercel/postgres';
import { connectedAccountsService } from '../lib/connectedAccounts';
import { brandPromptBuilder } from '../lib/brandEngine/BrandPromptBuilder';
import { getDeepseekClientAsync } from '../lib/generationService';
import { generatePostId } from '../lib/db';

async function main() {
  console.log("Starting generation test script...");

  // Find calendar entries that are stuck (no matching post)
  const pendingEntries = await sql`
    SELECT c.*, p.id as post_id 
    FROM content_calendar c
    LEFT JOIN posts p ON p.calendar_id = c.id
    WHERE p.id IS NULL AND c.status = 'planned'
    ORDER BY c.planned_date ASC
  `;

  if (pendingEntries.rows.length === 0) {
    console.log("No pending calendar entries found. All good!");
    return;
  }

  console.log(`Found ${pendingEntries.rows.length} pending calendar entries to test generate.`);

  const allAccounts = await sql`SELECT * FROM connected_accounts`;

  for (const entry of pendingEntries.rows) {
    console.log(`\nProcessing calendar entry ${entry.id} (brand: ${entry.brand_profile_id})...`);

    // Check again
    const doubleCheck = await sql`SELECT id FROM posts WHERE calendar_id = ${entry.id}`;
    if (doubleCheck.rows.length > 0) {
      console.log(`Post already exists, skipping.`);
      continue;
    }

    // Load the brand from the CORRECT schema
    const brandRes = await sql`SELECT * FROM brand_profiles WHERE id = ${entry.brand_profile_id}`;
    const brand = brandRes.rows[0];
    if (!brand) {
      console.error(`Brand profile ${entry.brand_profile_id} not found, skipping.`);
      continue;
    }

    // Load the pillar
    const pillarRes = await sql`SELECT * FROM content_pillars WHERE id = ${entry.pillar_id}`;
    const pillar = pillarRes.rows[0];
    if (!pillar) {
      console.error(`Pillar ${entry.pillar_id} not found, skipping.`);
      continue;
    }

    const account = allAccounts.rows.find(a => a.brand_profile_id === entry.brand_profile_id);
    if (!account) {
      console.error(`No connected account for brand ${entry.brand_profile_id}, skipping.`);
      continue;
    }

    console.log(`Generating post for account ${account.account_username} on ${entry.planned_platform}...`);

    // Manually construct the plan matching the old schema properties
    const plan = {
      brand_profile: {
        brand_name: brand.name,
        brand_mission: '',
        brand_voice: typeof brand.tone_of_voice === 'string' ? brand.tone_of_voice : JSON.stringify(brand.tone_of_voice),
        never_say: [],
        never_topics: []
      },
      target_audience: typeof brand.target_audience === 'string' ? brand.target_audience : JSON.stringify(brand.target_audience),
      value_proposition: typeof brand.core_values === 'string' ? brand.core_values : JSON.stringify(brand.core_values),
      pillar: {
        name: pillar.name,
        description: pillar.description
      },
      suggested_angle: pillar.keywords ? (typeof pillar.keywords === 'string' ? pillar.keywords : JSON.stringify(pillar.keywords)) : 'General insights',
      avoid_angles: [],
      narrative_context: 'Scheduled calendar post',
      brand_knowledge_context: brand.description || '',
      platform: entry.planned_platform || 'linkedin'
    };

    const mockPersona = {
      description: 'You are a thought leader.',
      config: {
        format_rules: ['Short paragraphs. Professional yet conversational.']
      }
    } as any;

    try {
      // 1. Build prompt
      const prompt = brandPromptBuilder.build(plan as any, mockPersona, '');

      // 2. Call AI
      const client = await getDeepseekClientAsync();
      const response = await client.chat.completions.create({
        model: "deepseek-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0].message.content;
      if (!raw) throw new Error("AI returned no content.");
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());

      console.log(`Successfully generated post! Saving to DB directly...`);

      const newId = generatePostId();
      await sql`
        INSERT INTO posts (
          id,
          user_id,
          connected_account_id,
          brand_profile_id,
          pillar_id,
          calendar_id,
          content,
          status,
          created_at,
          updated_at,
          narrative_tags,
          theme_summary
        ) VALUES (
          ${newId},
          ${account.user_id},
          ${account.id},
          ${brand.id},
          ${pillar.id},
          ${entry.id},
          ${parsed.content},
          'ready',
          NOW(),
          NOW(),
          ${JSON.stringify(parsed.narrative_tags || [])},
          ${parsed.theme_summary || null}
        )
      `;

      console.log(`Saved post for calendar entry ${entry.id}`);

    } catch (e) {
      console.error(`Error processing entry ${entry.id}:`, e);
    }
  }

  console.log("\nFinished generating for pending entries!");
}

main().catch(console.error).finally(() => process.exit(0));
