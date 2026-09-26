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
MISSION: ${plan.brand_profile.brand_mission || 'Not specified'}
VOICE: ${plan.brand_profile.brand_voice}
${persona.description ? `PERSONA STYLE: ${persona.description}` : ''}

YOUR AUDIENCE TODAY: ${plan.target_audience}
${plan.value_proposition ? `VALUE TO HIGHLIGHT: ${plan.value_proposition}` : ''}

CONTENT PILLAR: ${plan.pillar.name}
${plan.pillar.description ? `PILLAR CONTEXT: ${plan.pillar.description}` : ''}
ANGLE TO TAKE: ${plan.suggested_angle}
${plan.avoid_angles.length > 0 ? `AVOID THESE ANGLES (already covered recently):\n- ${plan.avoid_angles.join('\n- ')}` : ''}

UNIQUE STRATEGIC LENS FOR THIS POST:
${randomLens}

NARRATIVE CONTEXT:
${plan.narrative_context}

BRAND KNOWLEDGE (Auto-enriched context):
${plan.brand_knowledge_context}

${sourceText}

STRATEGIC DIRECTION: 
Write a highly engaging, original thought-leadership post for ${plan.platform}. 
CRITICAL: You MUST use the "UNIQUE STRATEGIC LENS FOR THIS POST" provided above to shape your entire narrative. Do not just list features. Use the lens to create a completely unique angle based on the brand's ecosystem, the pain points it solves, or the people it serves.
Even though the brand knowledge is static, your application of this specific Lens should make this post completely different from anything written before.
Aim for the stars: create truly universal, fascinating content that provides immense value to both the core target audience and a broader professional audience. 
Focus on deep insights, systemic challenges, paradigm shifts, or the unique mechanisms behind the brand's vision. Make the concepts sound amazing and the real-world impact profound.
DO NOT write a sales pitch or an ad. DO NOT sound like a marketer. Sound like a visionary builder, founder, or practitioner sharing hard-earned insights.
DO NOT repeat the exact wording of the narrative context or avoid angles.
NEVER use generic openings like "In today's fast-paced world". Be specific, novel, and relatable. Make it worth reading.

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
