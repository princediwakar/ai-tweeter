// lib/generation/personas/englishVocabBuilder.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { 
  generateVocabularyDiscoveryPrompt, 
  generateEtymologicalDiscoveryPrompt, 
  generateCompetitiveExamPrompt,
  generateFieldSpecificPrompt 
} from '../../vocab/vocabularyDiscovery';
import {
  generateVariabilityPackage,
  createVariabilityConfig,
  injectVariabilityIntoPrompt
} from '../../variabilityEngine';

export class EnglishVocabBuilderGenerator extends BasePersonaGenerator {

  private getAlphabeticalVariety(batchPosition: number, batchSize: number): string {
    // Expanded alphabet distribution for better variety
    const alphabetGroups = [
      ['A', 'E', 'I'], // Vowel start group 1
      ['B', 'C', 'D'], // Consonant group 1
      ['F', 'G', 'H'], // Consonant group 2  
      ['J', 'K', 'L'], // Consonant group 3
      ['M', 'N'], // Consonant group 4
      ['O', 'U'], // Vowel start group 2
      ['P', 'Q', 'R'], // Consonant group 5
      ['S', 'T'], // Common consonant group
      ['V', 'W', 'X', 'Y', 'Z'] // Less common letters
    ];
    
    // Add randomization to group selection
    const baseGroupIndex = (batchPosition - 1) % alphabetGroups.length;
    const randomOffset = Math.floor(Math.random() * 3); // 0, 1, or 2
    const groupIndex = (baseGroupIndex + randomOffset) % alphabetGroups.length;
    const letters = alphabetGroups[groupIndex];
    
    // Enhanced variety instructions
    if (batchSize > 5) {
      return `This is word ${batchPosition} of ${batchSize}. Choose a word starting with one of these letters: ${letters.join(', ')}. CRITICAL: Ensure completely different word families and semantic fields across the batch.`;
    } else if (batchSize > 3) {
      return `Choose a word starting with one of these letters: ${letters.join(', ')}. Each word must be from a different semantic category.`;
    } else {
      return `Choose a word starting with one of these letters: ${letters.join(', ')}.`;
    }
  }

  private getSemanticVariety(batchPosition: number): string {
    const semanticCategories = [
      'Choose a word related to intellectual processes or mental activities',
      'Select a word describing character traits or personality qualities', 
      'Pick a word related to social dynamics or human relationships',
      'Choose a word describing physical appearance or sensory experiences',
      'Select a word related to time, change, or transformation',
      'Pick a word describing intensity, degree, or magnitude',
      'Choose a word related to causation, influence, or effect',
      'Select a word describing complexity, subtlety, or nuance',
      'Pick a word related to communication or expression',
      'Choose a word describing emotional states or feelings',
      'Select a word related to motion, movement, or action',
      'Pick a word describing spatial relationships or location',
      'Choose a word related to evaluation or judgment',
      'Select a word describing conflict or resolution',
      'Pick a word related to creation or destruction',
      'Choose a word describing abstract concepts or philosophy'
    ];
    
    // Add randomization to prevent predictable patterns
    const baseIndex = (batchPosition - 1) % semanticCategories.length;
    const randomOffset = Math.floor(Math.random() * 4); // 0-3 random offset
    const categoryIndex = (baseIndex + randomOffset) % semanticCategories.length;
    return semanticCategories[categoryIndex];
  }

  private getComplexityGuidance(batchPosition: number): string {
    const complexityLevels = [
      'Choose an advanced word that uses Latin or Greek roots',
      'Select a sophisticated word with multiple related meanings',
      'Pick a nuanced word that replaces a common, overused term',
      'Choose a formal word appropriate for academic writing',
      'Select a precise word that expresses a specific concept',
      'Pick a literary word that adds elegance to communication',
      'Choose a technical term that bridges specialist and general knowledge',
      'Select a word with interesting etymology or historical usage',
      'Pick a word that demonstrates linguistic sophistication',
      'Choose a word commonly found in quality publications',
      'Select a word that appears in competitive exam vocabularies',
      'Pick a word that shows mastery of English subtleties'
    ];
    
    // Randomize complexity selection to avoid patterns
    const baseIndex = (batchPosition - 1) % complexityLevels.length;
    const randomOffset = Math.floor(Math.random() * 3);
    const levelIndex = (baseIndex + randomOffset) % complexityLevels.length;
    return complexityLevels[levelIndex];
  }


  private getRandomGuidance(): string {
    const randomGuidanceOptions = [
      'Prioritize words that native speakers use naturally in conversation.',
      'Select vocabulary that makes non-native speakers sound more fluent.',
      'Choose words that add precision to everyday communication.',
      'Focus on terms that eliminate hesitation in speech.',
      'Pick words that demonstrate mastery of English nuances.',
      'Select vocabulary that builds speaking confidence.',
      'Choose terms that help express ideas more clearly.',
      'Focus on words that sound educated without being pretentious.',
      'Pick vocabulary that improves written communication skills.',
      'Select words that enhance storytelling abilities.',
      'Choose terms that make conversations more engaging.',
      'Focus on vocabulary that demonstrates cultural understanding.',
      'Pick words that help navigate professional environments.',
      'Select terms that enhance creative expression.',
      'Choose vocabulary that improves persuasive communication.',
      'Pick words that distinguish advanced from intermediate speakers.',
      'Select vocabulary that appears in quality journalism and literature.',
      'Choose words that enhance academic and scholarly discourse.',
      'Focus on terms that improve cross-cultural communication.',
      'Pick vocabulary that strengthens argumentative writing.',
      'Select words that enhance emotional expression and empathy.',
      'Choose terms that improve clarity in complex explanations.',
      'Focus on vocabulary that builds intellectual confidence.',
      'Pick words that enhance leadership communication.',
      'Select terms that improve diplomatic and tactful expression.'
    ];
    
    return randomGuidanceOptions[Math.floor(Math.random() * randomGuidanceOptions.length)];
  }

  private getAdvancedVocabularyDiscovery(previousWords: string[]): string {
    const discoveryMethods = [
      () => generateVocabularyDiscoveryPrompt(previousWords, 'advanced'),
      () => generateEtymologicalDiscoveryPrompt(),
      () => generateCompetitiveExamPrompt('GRE'),
      () => generateCompetitiveExamPrompt('GMAT'),
      () => generateCompetitiveExamPrompt('IELTS'),
      () => generateCompetitiveExamPrompt('TOEFL'),
      () => generateFieldSpecificPrompt()
    ];
    
    const selectedMethod = discoveryMethods[Math.floor(Math.random() * discoveryMethods.length)];
    return selectedMethod();
  }

  private getVocabularyExpansionStrategy(): string {
    const strategies = [
      'DISCOVERY CHALLENGE: Think beyond common vocabulary lists. What words do experts use that beginners don\'t know?',
      'EXPLORATION METHOD: Consider vocabulary from academic journals, quality publications, and scholarly discourse.',
      'RESEARCH APPROACH: What words would distinguish a sophisticated speaker from an intermediate one?',
      'EXPERT VOCABULARY: Focus on terms used by professionals, scholars, and thought leaders in their fields.',
      'PRECISION HUNTING: Look for words that express exact meanings where common words are too vague.',
      'INTELLECTUAL VOCABULARY: Discover words that demonstrate analytical thinking and conceptual understanding.',
      'CROSS-DOMAIN EXPLORATION: Find vocabulary that bridges different academic and professional fields.',
      'LINGUISTIC SOPHISTICATION: Seek words that show mastery of English etymology and word formation.',
      'COMPETITIVE EDGE: Identify vocabulary that gives learners an advantage in academic and professional settings.',
      'QUALITY SOURCES: Draw from literature, research papers, expert commentary, and scholarly communication.'
    ];
    
    return strategies[Math.floor(Math.random() * strategies.length)];
  }


generatePrompt(
  config: TweetGenerationConfig,
  context: GenerationContext,
  markers: { timeMarker: string; tokenMarker: string }
): string {
  const { timeMarker, tokenMarker } = markers;
  
  // --- [NO CHANGE TO THIS SECTION] ---
  const alphabetGuidance = config.batchPosition && config.batchSize 
    ? this.getAlphabeticalVariety(config.batchPosition, config.batchSize)
    : 'Choose any appropriate word.';
  
  const semanticGuidance = config.batchPosition 
    ? this.getSemanticVariety(config.batchPosition)
    : 'Choose any appropriate semantic category.';
    
  const complexityGuidance = config.batchPosition 
    ? this.getComplexityGuidance(config.batchPosition)
    : 'Choose an appropriately sophisticated word.';

  const randomGuidance = this.getRandomGuidance();
  
  const vocabularyDiscovery = config.previousWords && config.previousWords.length > 0
    ? this.getAdvancedVocabularyDiscovery(config.previousWords)
    : '';
  
  const expansionStrategy = this.getVocabularyExpansionStrategy();

  const variabilityConfig = createVariabilityConfig(
    config.batchPosition,
    config.batchSize,
    config.previousWords && config.previousWords.length > 0
  );
  
  const variabilityPackage = generateVariabilityPackage(variabilityConfig, {
    batchPosition: config.batchPosition,
    previousWords: config.previousWords
  });

  const previousWordsExclusion = (config.previousWords && config.previousWords.length > 0)
    ? `CRITICAL: Do not use any of the following words or their direct synonyms: ${config.previousWords.join(', ')}.`
    : 'Ensure this is the first word you are generating in this session.';

  // --- [PROMPT REFACTOR] ---
  let basePrompt = `You are an English vocabulary teacher and linguistic curator creating engaging content for social media. Your mission is to help people discover exceptional words to sound more articulate and intelligent.

ADDITIONAL GUIDANCE: ${randomGuidance}
${expansionStrategy}

ADVANCED VOCABULARY DISCOVERY:
${vocabularyDiscovery || 'Discover sophisticated vocabulary that demonstrates intellectual maturity and precision.'}

--- MANDATORY VARIETY & UNIQUENESS PROTOCOL ---
1.  **PREVIOUSLY USED WORDS:** ${previousWordsExclusion}
2.  **ALPHABETICAL CONSTRAINT:** ${alphabetGuidance}
3.  **SEMANTIC CATEGORY CONSTRAINT:** ${semanticGuidance}
4.  **COMPLEXITY LEVEL CONSTRAINT:** ${complexityGuidance}
5.  **UNIQUENESS OF WORD:** Every generation must feature a completely different word from a distinct semantic domain. No repetitions or near-synonyms. Vary word origins, parts of speech, and usage contexts.
// --- [MAJOR IMPROVEMENT] More specific hook variety instructions ---
6.  **UNIQUENESS OF HOOK:** The "tweetText" hook must be completely different in both *content* and *structure* in every generation. Actively cycle through different hook archetypes. CRITICAL: Avoid repeating formulas. Specifically, do not overuse the "Ever feel...?" question format or the phrase "There's a perfect word for that."

--- END OF PROTOCOL ---

WORD SELECTION CRITERIA:
- Choose words at B2-C2 level.
- Select sophisticated vocabulary suitable for competitive exams (GRE, GMAT, IELTS, TOEFL).
- Avoid basic, overused words (e.g., "important," "good," "nice," "crucial," "strategic").
- PRIORITY: Choose words from academic texts, quality publications, or formal discourse.

CONTENT REQUIREMENTS:
Generate a vocabulary lesson with the exact JSON structure below:

{
"tweetText": "Generate a unique, engaging hook (max 180 characters) by choosing a DIFFERENT HOOK ARCHETYPE each time. Do not be repetitive.
  - **Archetype 1 (The Replacement):** 'Instead of saying [common word], use this more precise term...'
  - **Archetype 2 (The Scenario):** Describe a very specific, relatable situation or feeling. (e.g., 'That feeling of knowing something is wrong without being able to explain why? There's a word for it.')
  - **Archetype 3 (The Direct Benefit):** 'This one word will instantly make your writing sound more persuasive/academic/eloquent.'
  - **Archetype 4 (The Intrigue):** Ask a provocative question about language or a concept. (e.g., 'What's the difference between X and Y? This word holds the key.')
  - **Archetype 5 (The Etymology Tease):** 'The origin of this word is fascinating. It comes from the Latin for...'
  - **Archetype 6 (The Intellectual Challenge):** 'I bet you don't know the proper term for [complex idea]. It's...'
  CRITICAL: You must vary which archetype you use for each generation.",
"cardData": {
  "type": "single_word",
  "word": "A practical vocabulary word that people can use immediately",
  "partOfSpeech": "The grammatical category (noun, verb, adjective, adverb, etc.)",
  "meaning": "A concise, clear definition (max 1 short sentence or 15 words).",
  "example": "A brief, natural example sentence (max 15 words).",
  "synonyms": []
},
"hashtags": ["4", "relevant", "educational", "hashtags"],
"gibbiCTA": "A CTA string or null"
}

WRITING STYLE:
- Use a conversational, friendly, and accessible tone.
- Ensure the example sentence feels natural and realistic.
${tokenMarker}

QUALITY STANDARDS:
- The word must genuinely improve someone's vocabulary.
- The example must demonstrate clear, proper usage.
- The definition must be immediately understandable.
- The word should feel like a genuine discovery.

[${timeMarker}]`;

  basePrompt = injectVariabilityIntoPrompt(basePrompt, variabilityPackage);
  basePrompt = this.addGibbiCTA(basePrompt, context.account);
  return this.addCommonSuffix(basePrompt);
}
}