// lib/brandEngine/BrandPromptBuilder.ts

import type { PostPlan } from './types';
import type { Persona } from '../personas';

const CONTENT_LENSES = [
  "The Sarcastic Rant: A highly dramatic, slightly unhinged vent session about a hyper-specific, mundane annoyance that only someone in this profession understands.",
  "The Inside Joke: A setup and punchline (or humorous observation) relying entirely on industry jargon or shared traumatic experiences that outsiders wouldn't get.",
  "The 'Honest' Scenario: Describe a common interaction (with a client, patient, or boss) but rewrite the dialogue so everyone says exactly what they are actually thinking.",
  "The Survival Tactic: Share a hilarious, ethically-dubious-but-harmless shortcut, mental model, or caffeine habit used purely to survive the shift.",
  "The Client/Patient Archetype Roast: A fond but ruthlessly accurate satirical profile of a specific type of person they have to deal with every day.",
  "The Nostalgic Pain: Reminisce humorously about how terrible training/school was for this profession, or an outdated piece of legacy software/equipment everyone hated but somehow misses.",
  "The 'Unsung Hero' Satire: A mock-heroic tribute to the most random, insignificant object or person that holds their day together (e.g., the one working printer, the receptionist who deflects angry callers).",
  "The Daily Grind Chaos: A fast-paced, chaotic recount of a 5-minute window in their day where absolutely everything goes wrong at once, delivered with dry comedic timing."
];

class BrandPromptBuilder {
  
  build(plan: PostPlan, persona: Persona, externalContext: string = ''): string {
    const pConfig = (persona.config as Record<string, any>) || {};
    const formatRules = Array.isArray(pConfig.format_rules) 
      ? pConfig.format_rules.join(' | ') 
      : 'Write in first person. Short paragraphs. Plain English. No emojis or hashtags.';

    const platformConstraints = plan.platform === 'twitter' 
      ? `Twitter: MAX 280 characters. You MUST use line breaks (paragraphs) for pacing. Do NOT mash everything into one block of text. Tell a specific, meaty micro-story. No threads.`
      : `LinkedIn: MAX 400-600 characters. Keep it brief, punchy, and to the point. No fluff or rambling. Professional, visionary, but authentic. Use whitespace. Start with a contrarian or gripping hook. Share a specific industry insight or personal experience.`;

    const sourceText = externalContext 
      ? `EXTERNAL CONTEXT (Use if relevant to the angle):\n${externalContext}`
      : 'No external sources provided. Use brand knowledge.';

    // Randomly select a narrative lens to guarantee variability even with static input
    const randomLens = CONTENT_LENSES[Math.floor(Math.random() * CONTENT_LENSES.length)];

    return `BRAND: ${plan.brand_profile.brand_name}
${plan.brand_profile.primary_stakeholder_persona ? `PRIMARY STAKEHOLDER PERSONA: ${plan.brand_profile.primary_stakeholder_persona}` : `YOUR AUDIENCE TODAY: ${plan.target_audience}`}
${plan.brand_profile.ecosystem_dynamics ? `ECOSYSTEM DYNAMICS: ${plan.brand_profile.ecosystem_dynamics}` : ''}
${plan.brand_profile.operating_geography ? `OPERATING GEOGRAPHY: ${plan.brand_profile.operating_geography}` : ''}
VOICE: ${plan.brand_profile.brand_voice}

CONTENT PILLAR: ${plan.pillar.name}
${plan.pillar.description ? `PILLAR CONTEXT: ${plan.pillar.description}` : ''}
ANGLE TO TAKE: ${plan.suggested_angle}
${plan.avoid_angles.length > 0 ? `AVOID THESE ANGLES (already covered recently):\n- ${plan.avoid_angles.join('\n- ')}` : ''}

UNIQUE STRATEGIC LENS FOR THIS POST:
${randomLens}

NARRATIVE CONTEXT:
${plan.narrative_context}

BRAND KNOWLEDGE (Auto-enriched context - DO NOT pitch this, use only for deep background):
${plan.brand_knowledge_context}

${sourceText}

STRATEGIC DIRECTION: 
Write a highly engaging, original post for ${plan.platform}.
CRITICAL SHIFT: Your ONLY goal is pure entertainment and humor. You are acting AS a peer to the primary stakeholder, venting and joking about the absurdity of your shared profession.
DO NOT give advice. DO NOT share "learnings". DO NOT be serious. DO NOT be patronizing. DO NOT pitch the product.
Tell a hilarious story about their daily life, vent sarcastically about a shared frustration, or share an inside joke. Your entire job is to make them laugh.
If the brand or product is mentioned at all, it must be extremely subtle (a "silent sponsor" vibe).
${plan.brand_profile.operating_geography ? `GEOGRAPHIC CONTEXT (CRITICAL): Ensure all cultural references, jokes, jargon, and situations are strictly relevant to the provided OPERATING GEOGRAPHY. NEVER use analogies or localized references from outside this region.` : ''}
You MUST use the "UNIQUE STRATEGIC LENS FOR THIS POST" provided above to shape your entire narrative.
Even though the brand knowledge is static, your application of this specific Lens and empathy for the stakeholder should make this post completely different from anything written before.
NEVER use generic openings like "In today's fast-paced world" or "Unpopular truth". Be specific, novel, and conversational.

NEVER SAY: ${plan.brand_profile.never_say.join(', ')}
NEVER DISCUSS: ${plan.brand_profile.never_topics.join(', ')}

PLATFORM CONSTRAINTS: ${platformConstraints}
FORMAT RULES: ${formatRules}

OUTPUT (JSON):
{
  "content": "Your post content here",
  "theme_summary": "One-line summary of what this post is about",
  "narrative_tags": ["tag1", "tag2", "tag3"],
  "selected_url": "Source URL if you used one, else empty string"
}`;
  }
}

export const brandPromptBuilder = new BrandPromptBuilder();
