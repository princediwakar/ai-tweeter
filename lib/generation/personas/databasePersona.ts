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
    const structuralArchetypes = (personaConfig.structural_archetypes as Array<{ name: string; description: string; example: string }>) || [];
    const validationChecklist = (personaConfig.validation_checklist as string[]) || [];

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

${structuralArchetypes.map((arch, i) => `
**Format ${i + 1}: ${arch.name}**
- Description: ${arch.description}
- Example: "${arch.example}"
`).join('\n')}

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
  "tweetText": "<The complete tweet content>",
  "selectedHeadlineNumber": <same as selectedArticle>,
  "imageContent": "<Optional: If generating an image, include the visually descriptive text here. Max 240 chars.>"
}
`;

    // Add validation checklist
    if (validationChecklist.length > 0) {
      prompt += `
━━━━━━━━━━━━━━━━━━━━━
FINAL VALIDATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━
${validationChecklist.map((item: string) => `□ ${item}`).join('\n')}
`;
    }

    prompt += `\n-[${timeMarker}-${tokenMarker}]\n`;

    return this.addCommonSuffix(prompt, this.persona.max_length || 280);
  }
}