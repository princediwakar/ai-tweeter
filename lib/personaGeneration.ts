// lib/personaGeneration.ts
import { personaDesigner, PersonaDesignResult } from './services/personaDesigner';
import { personaService, CreatePersonaInput } from './personaService';
import { sourceDiscoverer } from './services/sourceDiscoverer';

export interface GenerationRequest {
  prompt: string;
  connectedAccountId: string;
  platform: 'twitter' | 'linkedin';
  regenerationCount?: number;
}

export interface PersonaGenerationResult {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
  config: CreatePersonaInput['config'];
}

const FALLBACK_TWITTER_PERSONA: PersonaGenerationResult = {
  name: 'The Signal',
  description: 'Distilling complex tech news into one sharp, actionable insight per day.',
  tone: 'Sharp, analytical',
  topics: ['tech', 'startups', 'ai-ml'],
  rss_sources: ['https://news.ycombinator.com/rss'],
  min_length: 100,
  max_length: 280,
  config: {
    core_thesis: 'Signal is found in hard data and actual execution, not marketing hype.',
    the_enemy: 'Vanity metrics and generic corporate posturing.',
    analytical_framework: 'Strip away the marketing language and look strictly at the underlying mechanics or economics.',
    framing_bias: 'Focus on the unsexy, operational reality behind the flashy headline.',
    hook_mechanics: 'Open with a blunt statement of fact or a surprising metric. Never ask a rhetorical question.',
    format_rules: [
      'Write in the first person.',
      'Use short, punchy paragraphs (max 2 sentences).',
      'Use plain, conversational English.',
      'Never use emojis or hashtags.'
    ],
    headlines_to_fetch: 10,
    headlines_in_prompt: 3,
    image_probability: 0,
  },
};

const FALLBACK_LINKEDIN_PERSONA: PersonaGenerationResult = {
  name: 'The Builder',
  description: 'Sharing real lessons from building products and scaling teams—no fluff.',
  tone: 'Authoritative yet conversational',
  topics: ['product', 'leadership', 'startups'],
  rss_sources: ['https://lenny.substack.com/feed'],
  min_length: 800,
  max_length: 2500,
  config: {
    core_thesis: 'Execution beats strategy. The hardest lessons come from shipping, not planning.',
    the_enemy: 'Armchair philosophers and generic "thought leadership" that lacks concrete examples.',
    analytical_framework: 'Look for the specific operational lever that drove the outcome, ignoring the high-level narrative.',
    framing_bias: 'Frame successes as the result of painful iteration and failures as systemic flaws.',
    hook_mechanics: 'Open with a stark realization or a counter-intuitive outcome from a real project.',
    format_rules: [
      'Write in the first person.',
      'Use short, punchy paragraphs (max 2 sentences).',
      'Use plain, conversational English.',
      'Never use emojis or hashtags.'
    ],
    headlines_to_fetch: 10,
    headlines_in_prompt: 3,
    image_probability: 0.2,
  },
};

export function getFallbackPersona(platform: 'twitter' | 'linkedin'): PersonaGenerationResult {
  return platform === 'twitter' ? FALLBACK_TWITTER_PERSONA : FALLBACK_LINKEDIN_PERSONA;
}

export async function generatePersona(request: GenerationRequest): Promise<PersonaGenerationResult> {
  const { prompt, platform, regenerationCount = 0 } = request;
  
  if (!prompt || prompt.trim().length === 0) {
    return getFallbackPersona(platform);
  }
  
  if (regenerationCount >= 3) {
    throw new Error('Maximum regeneration limit (3) reached');
  }
  
  try {
    console.log(`[Phase 1] Designing psychological DNA for ${platform}...`);
    const designResult: PersonaDesignResult = await personaDesigner.design(prompt, platform);
    
    console.log(`[Phase 2] Executing programmatic source discovery based on DNA...`);
    const discoveredSources = await sourceDiscoverer.discoverSources(designResult);
    
    return {
      name: designResult.name,
      description: designResult.description,
      tone: designResult.tone,
      topics: designResult.topics,
      rss_sources: discoveredSources, 
      min_length: designResult.min_length,
      max_length: designResult.max_length,
      config: designResult.config,
    };
  } catch (error) {
    console.error('Persona generation failed:', error);
    return getFallbackPersona(platform);
  }
}

export async function saveGeneratedPersona(
  accountId: string,
  personaResult: PersonaGenerationResult
): Promise<void> {
  await personaService.createPersona({
    connected_account_id: accountId,
    name: personaResult.name,
    description: personaResult.description,
    tone: personaResult.tone,
    topics: personaResult.topics,
    rss_sources: personaResult.rss_sources,
    min_length: personaResult.min_length,
    max_length: personaResult.max_length,
    config: personaResult.config as CreatePersonaInput['config'],
    is_active: true,
  });
}