// lib/brandEngine/BrandPromptBuilder.ts

import type { PostPlan } from './types';
import type { Persona } from '../personas';

const CONTENT_LENSES = [
  {
    name: "Field Observation",
    directive: "A candid, photographic snapshot of what you actually see happening in the real world (e.g. at the desk, in the room, on the screen). Show the scene as it is without preaching or adding a moral at the end."
  },
  {
    name: "Honest Builder Note",
    directive: "A transparent product or engineering reflection. Talk about a trade-off, an unexpected user behavior, a bug, or an assumption that broke when real people used the product. Curious and unvarnished."
  },
  {
    name: "Workflow Mechanics & Numbers",
    directive: "A granular breakdown of time, clicks, physical habits, or friction. Highlight specific mechanics (e.g. seconds wasted on a dropdown, repetitive manual workarounds, friction that users quietly tolerate) that show why simple alternatives win."
  },
  {
    name: "Grounded Discussion Prompt",
    directive: "A genuine, conversational question to peers and practitioners asking about an overlooked friction, habit, or trade-off in their day-to-day workflow. No engagement-bait, just genuine peer curiosity."
  }
];

class BrandPromptBuilder {
  build(plan: PostPlan, persona: Persona, externalContext: string = ''): string {
    const pConfig = (persona.config as Record<string, any>) || {};
    const formatRules = Array.isArray(pConfig.format_rules) 
      ? pConfig.format_rules.join(' | ') 
      : 'Write in first person. Short sentences. Plain English. No emojis or hashtags. Zero corporate fluff.';

    const platformConstraints = plan.platform === 'twitter' 
      ? `Twitter: 1 to 3 sentences maximum (strictly under 240 characters). Crisp, natural, direct. Write like a real founder or practitioner texting a peer.`
      : `LinkedIn: 2 to 4 sentences maximum (strictly under 380 characters). High signal, grounded observation. No single-sentence line-break poetry, no corporate platitudes.`;

    const sourceText = externalContext 
      ? `EXTERNAL CONTEXT (Use if relevant to the angle):\n${externalContext}`
      : 'No external sources provided. Use brand knowledge.';

    // Select a strategic lens for variety
    const selectedLens = CONTENT_LENSES[Math.floor(Math.random() * CONTENT_LENSES.length)];

    return `BRAND: ${plan.brand_profile.brand_name}
${plan.brand_profile.primary_stakeholder_persona ? `PRIMARY STAKEHOLDER PERSONA: ${plan.brand_profile.primary_stakeholder_persona}` : `TARGET AUDIENCE: ${plan.target_audience}`}
${plan.brand_profile.ecosystem_dynamics ? `ECOSYSTEM DYNAMICS: ${plan.brand_profile.ecosystem_dynamics}` : ''}
${plan.brand_profile.operating_geography ? `OPERATING GEOGRAPHY: ${plan.brand_profile.operating_geography}` : ''}
VOICE & TONE: Grounded, authentic, conversational practitioner. Natural mix of field observations, builder reflections, and workflow teardowns.

CONTENT PILLAR: ${plan.pillar.name}
${plan.pillar.description ? `PILLAR CONTEXT: ${plan.pillar.description}` : ''}
ANGLE TO TAKE: ${plan.suggested_angle}
${plan.avoid_angles.length > 0 ? `AVOID THESE ANGLES (already covered recently):\n- ${plan.avoid_angles.join('\n- ')}` : ''}

STRATEGIC LENS FOR THIS SPECIFIC POST:
"${selectedLens.name}": ${selectedLens.directive}

BRAND KNOWLEDGE (Context only - do NOT pitch or sell this product directly):
${plan.brand_knowledge_context}

${sourceText}

ABSOLUTE ANTI-AI-SLOP DIRECTIVES (STRICTLY ENFORCED):
1. ZERO SITCOM / COMEDY SKITS:
   - NO theatrical narrative setups ("Picture this:", "It was 9:04 PM...", "Here is what happened:").
   - NO scripted dialogue, fake scenarios, or exaggerated monologues.
   - NO cheesy forced punchlines, theatrical metaphors, or stand-up comedy scripts.
2. ZERO GURU PREACHINESS / BROETRY:
   - NO formulaic contrarian lecturing ("Nobody does X because of Y", "It's not about A. It's about B.", "The honest truth is...").
   - NO pseudo-profound LinkedIn poetry (do NOT break every sentence onto its own line with fake epiphanies).
   - NO lecturing or talking down to professionals with sweeping absolutes.
3. SOUND LIKE A REAL HUMAN:
   - Write like a real person typing a thought from their laptop or phone between meetings.
   - 1 to 3 sentences maximum.
   - Grounded in tangible specifics: real objects on a desk, actual minutes, specific clicks, real observations.

NEVER SAY: ${plan.brand_profile.never_say.join(', ')}
NEVER DISCUSS: ${plan.brand_profile.never_topics.join(', ')}

PLATFORM CONSTRAINTS: ${platformConstraints}
FORMAT RULES: ${formatRules}

OUTPUT FORMAT (JSON):
{
  "content": "Your post content here",
  "theme_summary": "One-line summary of what this post is about",
  "narrative_tags": ["tag1", "tag2", "tag3"],
  "selected_url": "Source URL if you used one, else empty string"
}`;
  }
}

export const brandPromptBuilder = new BrandPromptBuilder();
