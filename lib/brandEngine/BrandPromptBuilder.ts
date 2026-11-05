// lib/brandEngine/BrandPromptBuilder.ts

import type { PostPlan } from './types';
import type { Persona } from '../personas';

const CONTENT_LENSES = [
  {
    name: "Clinic Ground Truth",
    directive: "A vivid, authentic snapshot of frontline reality (e.g. 40-patient OPD queues, paper registers vs clunky software, desk clutter, 10 PM WhatsApp consults). Show the scene with respect, humor, and insider empathy."
  },
  {
    name: "The Technology Reality Check",
    directive: "A sharp, resonant critique of why modern software fails practitioners in fast-paced environments. Contrast the hype of tech with the painful reality of clicks, confirmation screens, and administrative burden. Never ask the audience what to build or optimize."
  },
  {
    name: "Workflow Mechanics & Friction",
    directive: "A granular breakdown of time, clicks, and documentation taxes (e.g. 14 mandatory fields for a 30-second consult, 20 minutes spent charting after clinic hours). Show why simple, lightweight workflows beat bloated software."
  },
  {
    name: "Practitioner Discussion",
    directive: "A genuine, provocative conversation starter for practitioners and operators about an absurd administrative burden, unwritten clinic rule, or broken workflow. Ask about their lived experience—NEVER ask for product roadmap advice or engineering input."
  }
];

class BrandPromptBuilder {
  build(plan: PostPlan, persona: Persona, externalContext: string = ''): string {
    const pConfig = (persona.config as Record<string, any>) || {};
    const formatRules = Array.isArray(pConfig.format_rules) 
      ? pConfig.format_rules.join(' | ') 
      : 'Write in first person. Short sentences. Plain English. No emojis or hashtags. Zero corporate fluff.';

    const platformConstraints = plan.platform === 'twitter' 
      ? `Twitter: 1 to 3 sentences maximum (strictly under 240 characters). Crisp, natural, direct. Write like a real practitioner texting a peer.`
      : `LinkedIn: 400 to 1,200 characters. Strong opening hook, generous line spacing for readability, vivid contrast or tension, and a resonant conclusion that makes practitioners nod, comment, or share. NO single-sentence broetry, NO corporate platitudes, NO asking the audience for product roadmap advice.`;

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
   - NO pseudo-profound LinkedIn poetry (do NOT break every single sentence onto its own line with fake epiphanies).
   - NO lecturing or talking down to professionals with sweeping absolutes.
3. SOUND LIKE A REAL HUMAN:
   - Write like a real practitioner typing a thoughtful post from their phone or laptop.
   - Grounded in tangible specifics: real objects on a desk, actual minutes, specific clicks, real observations.
4. ZERO SPRINT RETROSPECTIVES / BACKLOG QUESTIONS:
   - NEVER ask the audience how to build or optimize your product ("which should we optimize first: X or Y?"). You are not hosting a sprint retrospective.
   - NEVER talk like an AI engineer navel-gazing about models, pipelines, or prompts. Talk like a healthcare insider who cares about clinical workflow.
   - NEVER write about doctors or users as if they are lab mice in an experiment ("I watched a doctor do X..."). Frame observations with respect, empathy, and shared frustration.
   - Never use internal product terms: "our model", "the ambient transcript", "sprint", "roadmap", "backlog", "optimize the scan".

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
