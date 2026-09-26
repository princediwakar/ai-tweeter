// lib/brandEngine/BrandPromptBuilder.ts

import type { PostPlan } from './types';
import type { Persona } from '../personas';

class BrandPromptBuilder {
  
  build(plan: PostPlan, persona: Persona, externalContext: string = ''): string {
    const pConfig = (persona.config as Record<string, any>) || {};
    const formatRules = Array.isArray(pConfig.format_rules) 
      ? pConfig.format_rules.join(' | ') 
      : 'Write in first person. Short paragraphs. Plain English. No emojis or hashtags.';

    const platformConstraints = plan.platform === 'twitter' 
      ? `Twitter: MAX 240 characters. One clear, standalone take. No threads. No paragraphs. Punchy hook.`
      : `LinkedIn: 800-1200 characters. Professional, visionary, but authentic. Use whitespace. Start with a contrarian or gripping hook. Share a specific industry insight or personal experience.`;

    const sourceText = externalContext 
      ? `EXTERNAL CONTEXT (Use if relevant to the angle):\n${externalContext}`
      : 'No external sources provided. Use brand knowledge.';

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

NARRATIVE CONTEXT:
${plan.narrative_context}

BRAND KNOWLEDGE (Auto-enriched context):
${plan.brand_knowledge_context}

${sourceText}

STRATEGIC DIRECTION: 
Write a highly engaging, original thought-leadership post for ${plan.platform}. 
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
