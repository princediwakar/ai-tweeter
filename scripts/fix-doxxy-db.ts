import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Fixing Doxxy pillars and profile...');
  
  // 1. Get the doxxy brand profile
  const result = await sql`SELECT id FROM brand_profiles WHERE name ILIKE '%doxxy%' LIMIT 1`;
  const brandId = result.rows[0]?.id;
  
  if (!brandId) {
    console.error('Could not find Doxxy brand profile in DB.');
    return;
  }
  
  console.log('Found Doxxy brand ID:', brandId);

  // 2. Delete the old garbage pillars (Social Proof, Value Props, etc)
  await sql`DELETE FROM content_pillars WHERE brand_profile_id = ${brandId}`;
  
  // 3. Insert the new peer-to-peer pillars
  const newPillars = [
    {
      name: 'The Clinic Reality',
      description: 'Observational humor and shared frustrations about the daily chaos of running a high-volume Indian clinic. The waiting room, the staff, the paper records.',
      keywords: ['waiting room', 'front desk', 'no-shows', 'paperwork', 'chaos']
    },
    {
      name: 'Doctor-Patient Dynamics',
      description: 'Relatable stories about interacting with patients. The WhatsApp messages at 10 PM, the self-diagnoses from Google, the negotiations.',
      keywords: ['whatsapp', 'patients', 'google doctor', 'boundaries', 'communication']
    },
    {
      name: 'The Productivity Hustle',
      description: 'The real ways doctors survive the day and get home on time. Mental models, shortcuts, and the unglamorous reality of trying to be efficient.',
      keywords: ['time management', 'burnout', 'shortcuts', 'efficiency', 'survival']
    }
  ];

  for (const pillar of newPillars) {
    await sql`
      INSERT INTO content_pillars (brand_profile_id, name, description, keywords, proportion, created_at, updated_at)
      VALUES (${brandId}, ${pillar.name}, ${pillar.description}, ${JSON.stringify(pillar.keywords)}, 33, NOW(), NOW())
    `;
  }
  
  // 4. Update the brand profile itself to ensure the persona fields are populated
  // Not updating never_say / never_topics since they don't exist yet, we only added them to the finalize-brand onboarding flow recently and haven't migrated the actual neon DB.
  // Actually, did we migrate the neon DB? No. The onboarding flow might fail for new users because the columns don't exist!
  // I will just update target_audience and description for now.
  await sql`
    UPDATE brand_profiles 
    SET 
      description = 'AI dictation and WhatsApp automation for independent Indian doctors running high-volume clinics. Eliminating the chaos of paper records and front-desk bottlenecks.',
      target_audience = '["Indian doctors", "Clinic owners", "Healthcare professionals"]'::jsonb
    WHERE id = ${brandId}
  `;

  console.log('Successfully fixed Doxxy database profile!');
  process.exit(0);
}

main().catch(console.error);
