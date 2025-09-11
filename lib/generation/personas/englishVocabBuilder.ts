import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class EnglishVocabBuilderGenerator extends BasePersonaGenerator {

  private getAlphabeticalVariety(batchPosition: number, batchSize: number): string {
    const alphabetGroups = [
      ['A', 'B', 'C', 'D'],
      ['E', 'F', 'G', 'H'], 
      ['I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P'],
      ['Q', 'R', 'S', 'T'],
      ['U', 'V', 'W', 'X', 'Y', 'Z']
    ];
    
    const groupIndex = (batchPosition - 1) % alphabetGroups.length;
    const letters = alphabetGroups[groupIndex];
    
    // For larger batches, be more specific about letter requirements
    if (batchSize > 3) {
      return `This is word ${batchPosition} of ${batchSize}. Choose a word starting with one of these letters: ${letters.join(', ')}. Ensure maximum variety across the batch.`;
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
      'Select a word describing complexity, subtlety, or nuance'
    ];
    
    const categoryIndex = (batchPosition - 1) % semanticCategories.length;
    return semanticCategories[categoryIndex];
  }

  private getComplexityGuidance(batchPosition: number): string {
    const complexityLevels = [
      'Choose an advanced word that uses Latin or Greek roots',
      'Select a sophisticated word with multiple related meanings',
      'Pick a nuanced word that replaces a common, overused term',
      'Choose a formal word appropriate for academic writing',
      'Select a precise word that expresses a specific concept',
      'Pick a literary word that adds elegance to communication'
    ];
    
    const levelIndex = (batchPosition - 1) % complexityLevels.length;
    return complexityLevels[levelIndex];
  }

  private getTopicSpecificGuidance(topicKey: string): string {
    const topicGuidanceMap: Record<string, string[]> = {
      'eng_vocab_professional': [
        'Focus on words that enhance professional communication and workplace confidence.',
        'Select terminology that elevates business conversations and presentations.',
        'Choose words that demonstrate competence in professional settings.',
        'Pick vocabulary that builds authority in workplace discussions.'
      ],
      'eng_vocab_academic': [
        'Choose words commonly used in academic writing and scholarly discussions.',
        'Select terminology that strengthens research papers and formal essays.',
        'Focus on words that demonstrate intellectual rigor and precision.',
        'Pick vocabulary essential for university-level communication.'
      ],
      'eng_vocab_sophisticated': [
        'Select words that elevate everyday conversation and sound naturally intelligent.',
        'Choose vocabulary that adds elegance to casual speech without pretension.',
        'Focus on words that enhance articulation in social settings.',
        'Pick terms that demonstrate refined communication skills.'
      ],
      'eng_vocab_business': [
        'Pick words essential for business meetings, presentations, and corporate communication.',
        'Select terminology that builds credibility in executive conversations.',
        'Choose words that enhance negotiation and leadership discussions.',
        'Focus on vocabulary that demonstrates business acumen.'
      ],
      'eng_vocab_descriptive': [
        'Choose vivid adjectives that paint clearer pictures and express nuance.',
        'Select words that add color and precision to descriptions.',
        'Focus on vocabulary that replaces bland, overused descriptors.',
        'Pick terms that create more engaging and specific imagery.'
      ],
      'eng_vocab_action': [
        'Select dynamic verbs that convey specific actions with precision and impact.',
        'Choose action words that eliminate vague, weak language.',
        'Focus on verbs that add energy and clarity to communication.',
        'Pick movement words that create vivid, compelling narratives.'
      ],
      'eng_vocab_emotions': [
        'Focus on words that articulate complex feelings and emotional states.',
        'Select vocabulary that expresses subtle emotional nuances.',
        'Choose words that help people communicate feelings more precisely.',
        'Pick terms that bridge the gap between feeling and expression.'
      ],
      'eng_vocab_formal': [
        'Choose words appropriate for formal writing, speeches, and official communications.',
        'Select terminology suitable for ceremonies, documents, and presentations.',
        'Focus on vocabulary that maintains dignity in serious contexts.',
        'Pick words that demonstrate respect and proper etiquette.'
      ],
      'eng_vocab_alternatives': [
        'Select sophisticated alternatives to commonly overused words.',
        'Choose fresh vocabulary to replace tired, clichéd expressions.',
        'Focus on words that break people out of repetitive language patterns.',
        'Pick alternatives that add variety and interest to communication.'
      ],
      'eng_vocab_intellectual': [
        'Pick words that facilitate deep thinking and intellectual discourse.',
        'Select vocabulary that enhances philosophical and analytical discussions.',
        'Choose terms that demonstrate critical thinking capabilities.',
        'Focus on words that elevate abstract and conceptual conversations.'
      ],
      
      // Competitive Exam Categories
      'eng_vocab_gre_advanced': [
        'Select sophisticated GRE-level vocabulary that appears in standardized tests.',
        'Choose words with Latin/Greek roots that demonstrate etymological knowledge.',
        'Focus on advanced adjectives and verbs that show linguistic maturity.',
        'Pick vocabulary that distinguishes high scorers from average test-takers.'
      ],
      'eng_vocab_gmat_precision': [
        'Choose precise business and analytical terms used in GMAT contexts.',
        'Select words that demonstrate quantitative and logical reasoning skills.',
        'Focus on terminology used in business school and corporate environments.',
        'Pick vocabulary that shows readiness for MBA-level communication.'
      ],
      'eng_vocab_upsc_governance': [
        'Select governance, policy, and administrative terminology for civil services.',
        'Choose words related to constitutional, legal, and administrative concepts.',
        'Focus on vocabulary used in government, policy-making, and public administration.',
        'Pick terms that demonstrate understanding of democratic institutions.'
      ],
      'eng_vocab_ielts_academic': [
        'Choose academic writing vocabulary suitable for IELTS Band 7-9 scores.',
        'Select formal words that enhance essay writing and task responses.',
        'Focus on transition words, analytical terms, and scholarly vocabulary.',
        'Pick words that demonstrate advanced English proficiency for international settings.'
      ],
      'eng_vocab_toefl_scholarly': [
        'Select scholarly vocabulary appropriate for university-level discourse.',
        'Choose academic terms used in research papers and scholarly discussions.',
        'Focus on words that demonstrate readiness for American university education.',
        'Pick vocabulary that shows ability to engage with complex academic texts.'
      ],
      
      // Specialized Advanced Categories
      'eng_vocab_etymology_roots': [
        'Choose words with interesting Latin, Greek, or other linguistic origins.',
        'Select vocabulary that demonstrates understanding of word formation.',
        'Focus on words where knowing the root enhances understanding.',
        'Pick terms that showcase the evolution and richness of English.'
      ],
      'eng_vocab_literary_advanced': [
        'Select sophisticated literary terms and nuanced vocabulary.',
        'Choose words that appear in classical and contemporary literature.',
        'Focus on vocabulary that enhances creative and analytical writing.',
        'Pick terms that demonstrate cultural and literary awareness.'
      ],
      'eng_vocab_scientific_discourse': [
        'Choose scientific and technical vocabulary used across disciplines.',
        'Select terms that bridge scientific concepts with general understanding.',
        'Focus on vocabulary that enhances science communication.',
        'Pick words that demonstrate scientific literacy and precision.'
      ],
      'eng_vocab_philosophical': [
        'Select philosophical and abstract terms for deep conceptual discussions.',
        'Choose vocabulary related to ethics, logic, and metaphysical concepts.',
        'Focus on words that facilitate exploration of complex ideas.',
        'Pick terms that demonstrate philosophical and critical thinking.'
      ],
      'eng_vocab_rare_sophisticated': [
        'Choose rare but genuinely useful words that educated speakers know.',
        'Select sophisticated vocabulary that appears in quality publications.',
        'Focus on words that distinguish exceptional communicators.',
        'Pick terms that add precision and elegance without being pretentious.'
      ],
      
      // Contextual Categories
      'eng_vocab_debate_rhetoric': [
        'Select vocabulary used in formal debates and persuasive communication.',
        'Choose terms that enhance argumentative and rhetorical skills.',
        'Focus on words that demonstrate logical reasoning and persuasion.',
        'Pick vocabulary that strengthens public speaking and debate performance.'
      ],
      'eng_vocab_critical_analysis': [
        'Choose analytical vocabulary for evaluating and interpreting information.',
        'Select terms used in critical thinking and analytical writing.',
        'Focus on words that enhance evaluation and assessment skills.',
        'Pick vocabulary that demonstrates sophisticated analytical capabilities.'
      ],
      'eng_vocab_research_methodology': [
        'Select research and methodology terms for academic and professional work.',
        'Choose vocabulary related to data analysis and scientific inquiry.',
        'Focus on words that enhance research writing and methodology.',
        'Pick terms that demonstrate understanding of research processes.'
      ],
      'eng_vocab_policy_administration': [
        'Choose policy and administrative vocabulary for governance contexts.',
        'Select terms used in public policy and organizational management.',
        'Focus on words that enhance understanding of institutional processes.',
        'Pick vocabulary that demonstrates administrative and policy knowledge.'
      ]
    };
    
    const guidanceOptions = topicGuidanceMap[topicKey] || [
      'Choose practical vocabulary words that enhance daily communication.',
      'Select words that improve clarity and precision in everyday speech.',
      'Focus on vocabulary that builds confidence in communication.',
      'Pick words that expand expressive capabilities naturally.'
    ];
    
    // Return a random guidance from the available options
    return guidanceOptions[Math.floor(Math.random() * guidanceOptions.length)];
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
      'Choose vocabulary that improves persuasive communication.'
    ];
    
    return randomGuidanceOptions[Math.floor(Math.random() * randomGuidanceOptions.length)];
  }

  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    _persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;
    
    const alphabetGuidance = config.batchPosition && config.batchSize 
      ? this.getAlphabeticalVariety(config.batchPosition, config.batchSize)
      : 'Choose any appropriate word.';
    
    const semanticGuidance = config.batchPosition 
      ? this.getSemanticVariety(config.batchPosition)
      : 'Choose any appropriate semantic category.';
      
    const complexityGuidance = config.batchPosition 
      ? this.getComplexityGuidance(config.batchPosition)
      : 'Choose an appropriately sophisticated word.';
    
    const previousWordsContext = config.previousWords && config.previousWords.length > 0
      ? `\n\nPREVIOUSLY GENERATED WORDS: ${config.previousWords.join(', ')} - You MUST choose a completely different word that is NOT on this list and does NOT start with the same letters.`
      : '';
    
    const batchContext = config.batchPosition && config.batchSize 
      ? `\n\nBATCH CONTEXT: This is generation ${config.batchPosition} of ${config.batchSize}. Generate completely UNIQUE content - avoid repeating words, examples, or concepts from previous generations in this batch. ${alphabetGuidance}${previousWordsContext}`
      : '';

    const topicGuidance = this.getTopicSpecificGuidance(topic.key);
    const randomGuidance = this.getRandomGuidance();

    let basePrompt = `You are an English vocabulary teacher creating engaging content for social media. Your mission is to help people discover useful words they can immediately start using in their daily conversations.

TOPIC FOCUS: ${topicGuidance}

ADDITIONAL GUIDANCE: ${randomGuidance}

WORD SELECTION CRITERIA:
- Choose words at B2-C1 level that challenge and elevate vocabulary
- Select sophisticated vocabulary suitable for competitive exams (GRE, GMAT, UPSC, IELTS, TOEFL)
- Avoid basic words like "important," "good," "nice," "crucial," "strategic," "pivotal"
- Focus on words with rich etymology, nuanced meanings, or specialized usage
- Pick vocabulary that distinguishes advanced speakers from intermediate ones
- PRIORITY: Choose words that appear in academic texts, quality publications, or formal discourse
- TOPIC SPECIFIC: ${topicGuidance}${batchContext}

VARIETY REQUIREMENTS:
- SEMANTIC CATEGORY: ${semanticGuidance}
- COMPLEXITY LEVEL: ${complexityGuidance}
- ALPHABETICAL DISTRIBUTION: ${alphabetGuidance}

CONTENT REQUIREMENTS:
Generate a vocabulary lesson with the exact JSON structure below:

{
  "tweetText": "Create an engaging hook that makes people curious about the word (max 180 characters). Examples: 'This word will make you sound smarter instantly 🧠' or 'Stop saying [common word] - use this instead!'",
  "cardData": {
    "type": "single_word",
    "word": "A practical vocabulary word that people can use immediately",
    "partOfSpeech": "The grammatical category (noun, verb, adjective, adverb, etc.)",
    "meaning": "A clear, conversational definition without jargon (max 2 sentences)",
    "example": "A relatable example sentence that shows the word in natural context",
    "synonyms": []
  },
  "hashtags": ["4", "relevant", "educational", "hashtags"],
  "gibbiCTA": "A CTA string or null"
}

WRITING STYLE:
- Use conversational, friendly language
- Make definitions accessible to everyone
- Create examples that feel natural and realistic
- Avoid academic or overly formal tone
${tokenMarker}
UNIQUENESS: Every generation must feature a completely different word. No repetitions allowed. Choose words that start with different letters and have completely different meanings. 


ALPHABETICAL GUIDANCE: ${alphabetGuidance}

QUALITY STANDARDS:
- The word should genuinely improve someone's vocabulary
- The example should demonstrate clear, proper usage
- The definition should be immediately understandable

[${timeMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }
}