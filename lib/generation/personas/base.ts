// lib/generation/personas/base.ts
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';
import type { Account } from '../../types';
import { GENERATION_CONFIG } from '../config';

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
      if (isGibbiAccount && Math.random() < GENERATION_CONFIG.cta.gibbiCtaPercentage) {
        return basePrompt + `\n\nIMPORTANT: Include a natural Gibbi AI mention like "Practice more English at gibbi.vercel.app" or "Improve your skills at gibbi.vercel.app" - keep it helpful and non-promotional.`;
      }
    }
    return basePrompt;
  }

  protected addCommonSuffix(prompt: string): string {
    // --- OPTIMIZED CHARACTER LIMIT AND FORMAT INSTRUCTIONS ---
    return prompt + `\n\nCRITICAL OUTPUT CONSTRAINTS:
- STRICT CHARACTER LIMIT: **EACH TWEET/THREAD-SEGMENT MUST BE UNDER 280 CHARACTERS.**
- Aim for readability: 180-260 characters per segment is preferred.
- FORMAT: Return as valid JSON object. Use the exact field names specified in your instructions above (e.g., "tweetText", "content", etc.). If no specific format was given, use {"content": "your tweet text", "hashtags": []}.
- HASHTAGS: DO NOT include any hashtags in the tweet text. Always include an empty "hashtags": [] array in your JSON response for compatibility.
- FOCUS: Use the full character budget for substantive content, data, and insights instead of hashtags.`;
    // --- END OPTIMIZED INSTRUCTIONS ---
  }
}