// lib/brandEngine/BrandPromptBuilder.ts

import type { PostPlan } from './types';
import type { Persona } from '../personas';

const CONTENT_LENSES = [
  "The Contrarian View: Challenge a widely accepted truth or best practice in your industry. Why is the status quo broken, and what is the real truth?",
  "The Pain-Point Magnifier: Zoom in deeply on one specific, visceral pain point or frustration your audience experiences. Validate their struggle before showing the paradigm shift.",
  "The Ecosystem Observer: Analyze the broader industry ecosystem. Who are the different players? How are power dynamics or incentives shifting, and where does this brand fit in?",
  "The First-Principles Breakdown: Deconstruct a complex industry problem down to its most basic, undeniable truths, then logically build up to the brand's unique approach.",
  "The Future Visionary: Paint a vivid, opinionated picture of what this industry will look like in 3-5 years, and how this brand is accelerating that inevitable future.",
  "The Myth-Buster: Identify a common misconception or lie your target audience has been told. Dismantle it using logic, then provide the liberating truth.",
  "The Transformation Journey: Frame the narrative around the before-and-after state of the people you serve. What does life look like once the core problem is solved?",
  "The Micro-Observation: Focus intensely on a tiny, often-overlooked detail or daily habit in your industry, and explain why it actually reveals a massive systemic issue.",
  "The Conceptual Enemy: Identify the abstract 'enemy' of your audience (e.g., 'bureaucracy', 'context-switching', 'legacy debt') and rally passionately against it.",
  "The Unconventional Analogy: Compare the industry's problem or the brand's solution to something completely unexpected (e.g., biology, architecture, history, physics) to make the insight click."
];

class BrandPromptBuilder {
  
  build(plan: PostPlan, persona: Persona, externalContext: string = ''): string {
    const pConfig = (persona.config as Record<string, any>) || {};
    const formatRules = Array.isArray(pConfig.format_rules) 
      ? pConfig.format_rules.join(' | ') 
      : 'Write in first person. Short paragraphs. Plain English. No emojis or hashtags.';

    const platformConstraints = plan.platform === 'twitter' 
      ? `Twitter: MAX 240 characters. One clear, standalone take. No threads. No paragraphs. Punchy hook.`
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
CRITICAL SHIFT: You are speaking TO the primary stakeholder, AS one of them. Your goal is engagement, relatability, and empathy. DO NOT pitch the product. DO NOT sound like a marketer.
Tell a story about their daily life, validate their frustrations, or share an inside joke. If the brand or product is mentioned at all, it must be extremely subtle (a "silent sponsor" vibe).
${plan.brand_profile.operating_geography ? `GEOGRAPHIC CONTEXT (CRITICAL): Ensure all cultural references, jokes, jargon, and situations are strictly relevant to the provided OPERATING GEOGRAPHY. NEVER use analogies or localized references from outside this region.` : ''}
You MUST use the "UNIQUE STRATEGIC LENS FOR THIS POST" provided above to shape your entire narrative.
Even though the brand knowledge is static, your application of this specific Lens and empathy for the stakeholder should make this post completely different from anything written before.
NEVER use generic openings like "In today's fast-paced world". Be specific, novel, and relatable.

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
