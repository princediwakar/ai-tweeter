import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Pivoting Doxxy to pure comedy...');
  
  const result = await sql`SELECT id FROM brand_profiles WHERE name ILIKE '%doxxy%' LIMIT 1`;
  const brandId = result.rows[0]?.id;
  
  if (!brandId) {
    console.error('Could not find Doxxy brand profile in DB.');
    return;
  }

  // 1. Delete existing pillars
  await sql`DELETE FROM content_pillars WHERE brand_profile_id = ${brandId}`;
  
  // 2. Insert comedy pillars
  const comedyPillars = [
    {
      name: 'Specialty Roasts & Stereotypes',
      description: 'Pure humor about the differences between specialties. Ortho vs Neuro, Pediatricians vs Surgeons. Inside jokes about how each specialty behaves.',
      keywords: ['stereotypes', 'ortho', 'neuro', 'surgeon', 'roast']
    },
    {
      name: 'The WebMD Patient',
      description: 'Hilarious, exasperated observations about patients who self-diagnose using Google, send WhatsApps at 2 AM, or argue with a medical degree using a Facebook post.',
      keywords: ['webmd', 'google doctor', '2am text', 'sarcasm', 'patients']
    },
    {
      name: 'Clinic Absurdity',
      description: 'Stand-up comedy style observations about the ridiculous daily reality of running a clinic. Surviving on cold coffee, fighting with printers, the sheer chaos of the waiting room.',
      keywords: ['chaos', 'humor', 'coffee', 'waiting room', 'survival']
    }
  ];

  for (const pillar of comedyPillars) {
    await sql`
      INSERT INTO content_pillars (brand_profile_id, name, description, keywords, proportion, created_at, updated_at)
      VALUES (${brandId}, ${pillar.name}, ${pillar.description}, ${JSON.stringify(pillar.keywords)}, 33, NOW(), NOW())
    `;
  }
  
  // 3. Update the brand profile voice and rules to be STRICTLY humor
  const toneOfVoice = JSON.stringify("Pure stand-up comedy. Extremely sarcastic, witty, and relatable. Absolutely zero serious advice. Exclusively humor and entertainment.");
  const customInstructions = JSON.stringify("To make doctors laugh at the absurdity of their daily lives.");
  
  await sql`
    UPDATE brand_profiles 
    SET 
      tone_of_voice = ${toneOfVoice}::jsonb,
      custom_instructions = ${customInstructions}::jsonb,
      never_say = '["advice", "productivity", "efficiency", "here is how", "tips", "hustle", "optimize"]'::jsonb,
      primary_stakeholder_persona = 'The exhausted Indian doctor who just wants to laugh at how ridiculous their job is.'
    WHERE id = ${brandId}
  `;

  console.log('Successfully pivoted Doxxy to pure humor!');
  process.exit(0);
}

main().catch(console.error);
