// lib/generation/personas/databasePersona.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { Persona } from '../../types';

export class DatabasePersonaGenerator extends BasePersonaGenerator {
  private persona: Persona;

  constructor(persona: Persona) {
    super();
    this.persona = persona;
  }

  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;
    const personaConfig = (this.persona.config as Record<string, unknown>) || {};
    const rssSourceContext = context.rssContext || "";

    const identityContext = String(personaConfig.identity_context || 'You are an AI content generator.');
    const sourceLogic = String(personaConfig.source_logic || 'Select relevant content sources.');
    const voiceDna = String(personaConfig.voice_dna || 'Write in a clear, engaging voice.');
    const antiPatterns = String(personaConfig.anti_patterns || 'Avoid generic filler words.');
    
    // STRICT TYPE CHECKING: Prevent .map() crashes from bad DB data
    const rawArchetypes = personaConfig.structural_archetypes;
    const structuralArchetypes = Array.isArray(rawArchetypes) ? rawArchetypes : [];
    
    const rawChecklist = personaConfig.validation_checklist;
    const validationChecklist = Array.isArray(rawChecklist) ? rawChecklist : [];

    // Decision flag for images
    const wantsImage = config.generationFormat === 'image';

    // 1. Identity & Goal
    let prompt = `
# MISSION: ${this.persona.name}
${identityContext}

## YOUR GOAL
${this.persona.description || 'Generate engaging content.'}

━━━━━━━━━━━━━━━━━━━━━
SOURCE SELECTION (SIGNAL VS NOISE)
━━━━━━━━━━━━━━━━━━━━━
${sourceLogic}

**CURRENT CONTEXT:**
${rssSourceContext}

${config.previousHeadlines && config.previousHeadlines.length > 0
  ? `Already used article numbers: ${config.previousHeadlines.join(', ')}. Pick a different article.`
  : ''}

━━━━━━━━━━━━━━━━━━━━━
VOICE DNA (THE HUMAN PATTERN)
━━━━━━━━━━━━━━━━━━━━━
${voiceDna}

**BANNED PATTERNS:**
${antiPatterns}

━━━━━━━━━━━━━━━━━━━━━
STRUCTURAL ARCHETYPES (ROTATION)
━━━━━━━━━━━━━━━━━━━━━
Choose ONE of these formats to execute based on the data:

${structuralArchetypes.length > 0 
  ? structuralArchetypes.map((arch: any, i: number) => `
**Format ${i + 1}: ${arch.name || 'Unnamed'}**
- Description: ${arch.description || ''}
- Example: "${arch.example || ''}"
`).join('\n')
  : '**Format 1: General Post**\n- Write a high-signal, engaging post based on the context.'
}

━━━━━━━━━━━━━━━━━━━━━
OUTPUT CONSTRUCTION
━━━━━━━━━━━━━━━━━━━━━
- Tone: ${this.persona.tone || 'Analytical'}
- Max Length: ${this.persona.max_length || 280} chars
- Topics: ${this.persona.topics?.join(', ') || 'General'}

**CRITICAL: Output ONLY valid JSON.**

**REQUIRED JSON STRUCTURE:**
{
  "reasoning": {
    "selectedArticle": <number>,
    "keyMetric": "<the specific data point>",
    "yourAngle": "<why this matters>",
    "formatUsed": "<Format Name>"
  },
  "tweetText": "<The complete text content>",
  "selectedHeadlineNumber": <same as selectedArticle>`

  // FIXED: Tell the AI exactly how to output the cardData so the parser actually picks it up.
  if (wantsImage) {
    prompt += `,
  "cardData": {
    "imagePrompt": "<Highly descriptive visual prompt for an AI image generator. Max 240 chars.>"
  }
}`;
  } else {
    prompt += `\n}`;
  }

    // Add validation checklist safely
    if (validationChecklist.length > 0) {
      prompt += `

━━━━━━━━━━━━━━━━━━━━━
FINAL VALIDATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━
${validationChecklist.map((item: any) => `□ ${String(item)}`).join('\n')}
`;
    }

    prompt += `\n-[${timeMarker}-${tokenMarker}]\n`;

    return this.addCommonSuffix(prompt, this.persona.max_length || 280);
  }
}