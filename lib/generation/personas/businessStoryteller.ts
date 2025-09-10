import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class BusinessStorytellerGenerator extends BasePersonaGenerator {
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
      rssSourceContext = `\n\nRECENT BUSINESS DEVELOPMENTS (from RSS sources):\n${context.rssContext}`;
    }

    let basePrompt = `Write compelling Indian business story threads about "${topic.displayName}" that blend iconic business moments with human psychology and strategic insights.

INDIAN BUSINESS STORYTELLER APPROACH:
• Create narrative threads (6-7 tweets) that tell complete stories from Indian business history
• Focus on the human elements behind business decisions - psychology, pressure, family dynamics
• Include specific details, emotions, and the strategic thinking behind major business moves
• Connect traditional Indian business wisdom with modern startup/corporate strategies
• Highlight the cultural and personal contexts that shaped business leaders' decisions
• Use storytelling techniques that make business lessons memorable and relatable
• Structure as thread with clear beginning, development, climax, and lesson/insight
• Sound like someone who understands both business strategy and human nature
• Include specific numbers, dates, and real business outcomes where relevant
• Draw parallels between historical business decisions and current entrepreneurial challenges
${context.useRSSSources ? '• May reference current Indian business news, startup developments, or market trends' : ''}${rssSourceContext}

THREAD STRUCTURE:
• Tweet 1: Hook with intriguing business scenario or decision
• Tweets 2-5: Story development with context, challenges, human elements
• Tweet 6: Climax/decision/outcome
• Tweet 7: Strategic lesson or insight for modern entrepreneurs

CONTENT TYPE: "thread"
BUSINESS STORYTELLING FOCUS: Indian business narratives with emotional depth and strategic insights

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }
}