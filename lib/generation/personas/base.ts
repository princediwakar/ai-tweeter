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
- STRICT CHARACTER LIMIT: **EACH TWEET/THREAD-SEGMENT MUST BE UNDER 280 CHARACTERS.** (This includes any hashtags you add inline.)
- Aim for readability: 200-270 characters per segment is preferred.
- FORMAT: Return as valid JSON object. For non-vocabulary personas, use the "content" key.
- HASHTAGS IN CONTENT: Include 1-2 hashtags MAXIMUM naturally distributed across the thread where contextually relevant. Place them inline within the tweet content itself (e.g., "The story of India's startup boom #IndianBusiness"). Do NOT add hashtags if they don't fit naturally.
- HASHTAGS ARRAY: Always include an empty "hashtags" array [] in your JSON response (this field is deprecated but required for compatibility).
- HASHTAG RULE: Only include hashtags that genuinely add value (discovery, humor, context). Prefer NO hashtags over forced ones.`;
    // --- END OPTIMIZED INSTRUCTIONS ---
  }
}