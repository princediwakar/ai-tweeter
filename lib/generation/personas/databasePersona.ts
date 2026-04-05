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
    const { config: dna } = this.persona;
    const rssSourceContext = context.rssContext || "";

    // 1. Identity & Goal
    let prompt = `
# MISSION: ${this.persona.name}
${dna.identity_context}

## YOUR GOAL
${this.persona.description}

━━━━━━━━━━━━━━━━━━━━━━
SOURCE SELECTION (SIGNAL VS NOISE)
━━━━━━━━━━━━━━━━━━━━━━
${dna.source_logic}

**CURRENT CONTEXT:**
${rssSourceContext}

${config.previousHeadlines && config.previousHeadlines.length > 0
  ? `Already used article numbers: ${config.previousHeadlines.join(', ')}. Pick a different article.`
  : ''}

━━━━━━━━━━━━━━━━━━━━━━
VOICE DNA (THE HUMAN PATTERN)
━━━━━━━━━━━━━━━━━━━━━━
${dna.voice_dna}

**BANNED PATTERNS:**
${dna.anti_patterns}

━━━━━━━━━━━━━━━━━━━━━━
STRUCTURAL ARCHETYPES (ROTATION)
━━━━━━━━━━━━━━━━━━━━━━
Choose ONE of these formats to execute based on the data:

${dna.structural_archetypes.map((arch: { name: string; description: string; example: string }, i: number) => `
**Format ${i + 1}: ${arch.name}**
- Description: ${arch.description}
- Example: "${arch.example}"
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT CONSTRUCTION
━━━━━━━━━━━━━━━━━━━━━━
- Tone: ${this.persona.tone || 'Analytical'}
- Max Length: ${this.persona.max_length} chars
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
  "tweetText": "<The complete tweet content>",
  "selectedHeadlineNumber": <same as selectedArticle>,
  "imageContent": "<Optional: If generating an image, include the visually descriptive text here. Max 240 chars.>"
}
`;

    // Add validation checklist
    if (dna.validation_checklist && dna.validation_checklist.length > 0) {
      prompt += `
━━━━━━━━━━━━━━━━━━━━━━
FINAL VALIDATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━
${dna.validation_checklist.map((item: string) => `□ ${item}`).join('\n')}
`;
    }

    prompt += `\n-[${timeMarker}-${tokenMarker}]\n`;

    return this.addCommonSuffix(prompt, this.persona.max_length);
  }
}
