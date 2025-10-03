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
    return prompt + `\n\nCRITICAL CHARACTER LIMITS: 
- EACH TWEET MUST BE UNDER 250 CHARACTERS TOTAL (including hashtags)
- For single tweets: aim for 180-240 characters
- For thread tweets: aim for 160-220 characters per tweet
- Count characters carefully - exceeding limits causes splitting/truncation

FORMAT: Return as valid JSON object. For non-vocabulary personas, use "content" key. For vocabulary persona, use "tweetText" and "cardData" structure.

HASHTAG DECISION: Only include hashtags if they genuinely add value to the tweet. Most tweets should NOT have hashtags.
- Include hashtags ONLY if they make the tweet more discoverable or add humor/context
- Prefer NO hashtags over forced, mechanical, or obvious ones
- If including hashtags, use 1-2 maximum and make them creative/memorable
- Consider: Does this hashtag make the tweet better? If not, don't include it
- Examples where hashtags might work: trending topics, cultural moments, wordplay
- Most satirical/story tweets work better WITHOUT hashtags
Include the "hashtags" array - it can be empty [] if no meaningful hashtags fit.`;
  }
}