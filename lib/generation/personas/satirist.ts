import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class SatiristGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;
    
    let rssSourceContext = '';
    if (context.rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT NEWS & DEVELOPMENTS (from RSS sources):\n${context.rssContext}`;
    }

    let basePrompt = `Write witty satirical content about "${topic.displayName}" that makes people laugh while making a sharp point about current events.

SATIRIST APPROACH:
• Create clever, satirical observations about current political news, business developments, and social trends
• Use irony, wit, and humor to highlight absurdities or contradictions in news events
• Reference specific current news, political developments, or trending topics for timely satirical commentary
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound intelligent and observant - satirical but not mean-spirited or offensive
• Focus on making people both laugh and think about the absurdity of current events
• Draw from political news, business headlines, celebrity controversies, and social media trends
• Comment on media coverage patterns, political rhetoric, or societal contradictions
${context.useRSSSources ? '• Use current political news, business headlines, social controversies, or trending topics as satirical material' : ''}${rssSourceContext}

CONTENT TYPE: "single_tweet"
SATIRE FOCUS: Current events, political news, and social trend satirical commentary

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }
}