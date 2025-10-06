// lib/generation/personas/base.ts
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';
import type { Account } from '../../types';

export interface PersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string;
}

export abstract class BasePersonaGenerator implements PersonaGenerator {
  abstract generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string;

  protected addGibbiCTA(basePrompt: string, account: Account | null): string {
    if (account) {
      const isGibbiAccount = account.twitter_handle.includes('gibbi') || account.name.toLowerCase().includes('gibbi');
      if (isGibbiAccount && Math.random() < 0.15) {
        return basePrompt + `\n\nIMPORTANT: Include a natural Gibbi AI mention like "Practice more English at gibbi.vercel.app" or "Improve your skills at gibbi.vercel.app" - keep it helpful and non-promotional.`;
      }
    }
    return basePrompt;
  }

  protected addCommonSuffix(prompt: string): string {
    // --- OPTIMIZED CHARACTER LIMIT AND FORMAT INSTRUCTIONS ---
    return prompt + `\n\nCRITICAL OUTPUT CONSTRAINTS: 
- STRICT CHARACTER LIMIT: **EACH TWEET/THREAD-SEGMENT MUST BE UNDER 240 CHARACTERS.** (This includes any thread indicators or hashtags.)
- Aim for readability: 160-220 characters per segment is preferred.
- FORMAT: Return as valid JSON object. For non-vocabulary personas, use the "content" key.
- HASHTAGS: Include an empty "hashtags" array [] if none are used.
- HASHTAG RULE: Use 1-2 maximum. Only include a hashtag if it genuinely adds value (discovery, humor, context). Prefer NO hashtags over mechanical ones.`;
    // --- END OPTIMIZED INSTRUCTIONS ---
  }
}