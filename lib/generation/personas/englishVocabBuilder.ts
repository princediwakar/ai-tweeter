import { BasePersonaGenerator } from './base';
import { TOPIC_GUIDELINES, VOCAB_APPROACHES } from '../constants';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class EnglishVocabBuilderGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;
    const topicKey = topic.key;
    const guidelines = TOPIC_GUIDELINES[topicKey as keyof typeof TOPIC_GUIDELINES];
    
    const enhancedGuidelines = guidelines || {
      focus: 'Essential vocabulary building.',
      hook: 'Level up your English skills!',
      scenarios: ['daily conversation'],
    };

    const randomApproach = VOCAB_APPROACHES[Math.floor(Math.random() * VOCAB_APPROACHES.length)];
    
    const batchContext = config.batchPosition && config.batchSize 
      ? `\n\nBATCH CONTEXT: This is generation ${config.batchPosition} of ${config.batchSize}. Generate completely UNIQUE content - avoid repeating words, examples, or concepts from previous generations in this batch.`
      : '';

    let basePrompt = `You are a viral English education expert. Your goal is to generate a vocabulary lesson for an image-based tweet.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}
APPROACH: ${randomApproach}

UNIQUENESS REQUIREMENT: Generate COMPLETELY UNIQUE vocabulary content. Even if this topic category was used before, choose a different word/pair/concept. Be creative and avoid repetition.${batchContext}

TASK: Generate a single vocabulary lesson and provide the output in a structured JSON format.

### JSON STRUCTURE:
{
  "tweetText": "A short, engaging hook for the Twitter post (under 180 chars). Use the style: '${enhancedGuidelines.hook}'",
  "cardData": {
    "type": "The type of lesson. MUST be one of: 'single_word', 'confused_pair', 'synonym_list', 'idiom', 'phrasal_verb'.",
    "word": "The main word, phrase, or pair. For confused pairs, format as 'Word1 vs. Word2'.",
    "partOfSpeech": "The part of speech. For confused pairs, provide for the first word.",
    "meaning": "The definition. For confused pairs, define BOTH words, separated by a newline '\\n'. For synonym lists, this should be a brief description.",
    "example": "A practical example sentence. For confused pairs, use the first word in the sentence.",
    "synonyms": ["An", "array", "of", "synonyms", "if the topic is about synonyms."]
  },
  "hashtags": ["An", "array", "of", "4 relevant hashtags"],
  "gibbiCTA": "A CTA string or null"
}

### CRITICAL INSTRUCTIONS:
- Adhere strictly to the "type" options.
- For "confused_pair", the 'word' field MUST contain " vs. " and the 'meaning' field MUST contain a newline '\\n'.
- For "synonym_list", the 'synonyms' array MUST be populated.
- ENSURE COMPLETE UNIQUENESS: Choose different words/concepts even within the same topic category.

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }
}