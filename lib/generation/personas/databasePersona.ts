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
    
    const rawArchetypes = personaConfig.structural_archetypes;
    const structuralArchetypes = Array.isArray(rawArchetypes) ? rawArchetypes : [];
    
    const rawChecklist = personaConfig.validation_checklist;
    const validationChecklist = Array.isArray(rawChecklist) ? rawChecklist : [];

    const wantsImage = config.generationFormat === 'image';

    let prompt = `
You are ${this.persona.name}. ${identityContext}

${this.persona.description}

Right now you have this fresh context from your sources:
${rssSourceContext}

${config.previousHeadlines && config.previousHeadlines.length > 0
  ? `You've already used these headlines: ${config.previousHeadlines.join(', ')}. Pick something new.\n`
  : ''}
${config.usedSourceUrls && config.usedSourceUrls.length > 0
  ? `Do not use these articles again:\n${config.usedSourceUrls.map(url => `- ${url}`).join('\n')}\n`
  : ''}

Follow these rules exactly:
${sourceLogic}

Write exactly like a real person would — short paragraphs, natural rhythm, first person. Mix short punchy sentences with slightly longer ones. Use contractions. Sound like you're texting a smart colleague who gets it.

${voiceDna}

Never do this:
${antiPatterns}

You usually structure your posts in one of these natural ways (pick whichever fits the insight best — don't force it):
${structuralArchetypes.length > 0 
  ? structuralArchetypes.map((arch: any) => 
      `- ${arch.name}: ${arch.description}\n  Example: ${arch.example}`
    ).join('\n')
  : '- Just write a clear, human insight in short paragraphs.'}

Before you output, quickly check:
${validationChecklist.length > 0 
  ? validationChecklist.map((item: any) => `- ${String(item)}`).join('\n')
  : '- Does this sound like something a real person would actually post?'}

Output ONLY valid JSON. Nothing else.

{
  "reasoning": {
    "selectedArticle": <number>,
    "keyMetric": "<specific data point>",
    "yourAngle": "<why this matters to you>",
    "formatUsed": "<the natural format you chose>"
  },
  "tweetText": "<the complete post text — short paragraphs, human voice>"
`;

    if (wantsImage) {
      prompt += `,
  "cardData": {
    "imagePrompt": "<short, vivid description for an image — max 200 characters>"
  }`;
    }

    prompt += `
}

-[${timeMarker}-${tokenMarker}]
`;

    return this.addCommonSuffix(prompt, this.persona.max_length || 280);
  }
}