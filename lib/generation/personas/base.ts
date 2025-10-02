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
    return prompt + `\n\nCRITICAL: Keep tweet text content under 200 characters. Format the entire output as a single, valid JSON object. For non-vocabulary personas, use the key "content" for the tweet text. For the vocabulary persona, use the "tweetText" and "cardData" structure as specified. 

HASHTAG GENERATION: Generate exactly 2 subtle, engaging hashtags that are:
- Relevant but not literal descriptions of the content
- Creative and memorable, not obvious content labels
- Avoid meta tags like #PoliticalSatire, #Business, #Stories, #IndianPolitics
- Focus on clever wordplay, cultural references, or unexpected angles
- Think like trending topics - catchy but meaningful
- Examples of GOOD hashtags: #SwadeshiVsSponsors, #FrenemyNations, #DigitalDiplomacy
- Examples of BAD hashtags: #PoliticalSatire, #BusinessStory, #IndianPolitics
Always include the "hashtags" array with exactly 2 subtle, creative hashtags.`;
  }
}