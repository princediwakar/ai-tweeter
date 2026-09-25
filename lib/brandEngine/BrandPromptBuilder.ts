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
      ? `Twitter: MAX 240 characters. One clear, standalone take. No threads. No paragraphs.`
      : `LinkedIn: 800-1200 characters. Professional but authentic. 2-3 paragraphs with specific examples.`;

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
Write a highly engaging, original post for ${plan.platform}. 
Make sure it aligns with the brand's voice and mission, while specifically targeting the audience's pain points.
DO NOT repeat the exact wording of the narrative context or avoid angles.

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
