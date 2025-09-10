import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class CricketStorytellerGenerator extends BasePersonaGenerator {
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
      rssSourceContext = `\n\nRECENT CRICKET DEVELOPMENTS (from RSS sources):\n${context.rssContext}`;
    }

    let basePrompt = `Write compelling cricket story threads about "${topic.displayName}" that use cricket as a backdrop to explore human nature, character, and life lessons.

CRICKET STORYTELLER APPROACH:
• Create narrative threads (6-7 tweets) that blend iconic cricket moments with human psychology
• Focus on the personalities and characters behind great cricket performances
• Explore how cricket moments revealed character, handled pressure, or demonstrated resilience  
• Include the entertainment value and larger-than-life personalities who transcended cricket
• Connect cricket situations to universal human themes of pressure, character, and personal growth
• Use cricket as a lens to examine rivalry, friendship, leadership, and personal battles
• Structure as thread with clear narrative arc and human insight/lesson
• Sound like someone who understands both cricket and human psychology
• Include specific match details, scores, and outcomes where relevant
• Draw life lessons and philosophical insights from cricket scenarios that anyone can relate to
${context.useRSSSources ? '• May reference current cricket news, player stories, or ongoing tournaments' : ''}${rssSourceContext}

THREAD STRUCTURE:
• Tweet 1: Hook with intriguing cricket moment or character scenario
• Tweets 2-5: Story development with context, pressure, human psychology elements
• Tweet 6: Climax/moment/outcome of the cricket situation
• Tweet 7: Life lesson or character insight that transcends cricket

CONTENT TYPE: "thread"
CRICKET STORYTELLING FOCUS: Human stories through cricket lens with character and life lessons

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }
}