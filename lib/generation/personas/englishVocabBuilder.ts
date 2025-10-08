// lib/generation/personas/englishVocabBuilder.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';
import { generateDiversityGuidance, generateEnhancedExclusionGuidance } from '../../vocab/wordDiversityUtils';
import { 
  generateVocabularyDiscoveryPrompt, 
  generateEtymologicalDiscoveryPrompt, 
  generateCompetitiveExamPrompt,
  generateFieldSpecificPrompt 
} from '../../vocab/vocabularyDiscovery';
import { 
  getCrossExamVocabulary, 
  getSmartVocabularySuggestion,
  COMPETITIVE_VOCABULARY 
} from '../../vocab/competitiveVocabulary';
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

  private getSmartWordSuggestion(previousWords: string[], topicKey: string): string {
    // Map topic to exam type if applicable
    const examMapping: Record<string, keyof typeof COMPETITIVE_VOCABULARY> = {
      'eng_vocab_gre_advanced': 'GRE',
      'eng_vocab_gmat_precision': 'GMAT',
      'eng_vocab_ielts_academic': 'IELTS',
      'eng_vocab_toefl_scholarly': 'TOEFL',
      'eng_vocab_upsc_governance': 'UPSC'
    };
    
    const targetExam = examMapping[topicKey];
    
    if (targetExam) {
      const suggestion = getSmartVocabularySuggestion(previousWords, targetExam, 3);
      if (suggestion) {
        return `SMART SUGGESTION: Consider exploring words like "${suggestion}" - this type of vocabulary is highly valued in ${targetExam} contexts.`;
      }
    }
    
    // Cross-exam vocabulary for general improvement
    const crossExamWords = getCrossExamVocabulary(['GRE', 'GMAT', 'IELTS', 'TOEFL'], 2);
    if (crossExamWords.length > 0) {
      const availableWords = crossExamWords
        .map(entry => entry.word)
        .filter(word => !previousWords.some(prev => prev.toLowerCase() === word.toLowerCase()));
      
      if (availableWords.length > 0) {
        const suggestion = availableWords[Math.floor(Math.random() * availableWords.length)];
        return `CROSS-EXAM SUGGESTION: Words like "${suggestion}" appear across multiple competitive exams and demonstrate versatile vocabulary skills.`;
      }
    }
    
    return 'Focus on discovering sophisticated vocabulary that demonstrates intellectual maturity and linguistic precision.';
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

  private getExamTypeFromTopic(topicKey: string): string | undefined {
    const examMapping: Record<string, string> = {
      'eng_vocab_gre_advanced': 'GRE',
      'eng_vocab_gmat_precision': 'GMAT',
      'eng_vocab_ielts_academic': 'IELTS',
      'eng_vocab_toefl_scholarly': 'TOEFL',
      'eng_vocab_upsc_governance': 'UPSC'
    };
    
    return examMapping[topicKey];
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
    
    // Enhanced diversity guidance using the word diversity utilities
    const diversityGuidance = config.previousWords && config.previousWords.length > 0
      ? generateDiversityGuidance(config.previousWords)
      : '';
    
    const exclusionGuidance = config.previousWords && config.previousWords.length > 0
      ? generateEnhancedExclusionGuidance(config.previousWords)
      : '';
    
    const previousWordsContext = config.previousWords && config.previousWords.length > 0
      ? `\n\nPREVIOUSLY GENERATED WORDS: ${config.previousWords.join(', ')}\n\nDIVERSITY REQUIREMENTS: ${diversityGuidance}\n\nEXCLUSION RULES: ${exclusionGuidance}`
      : '';
    
    const batchContext = config.batchPosition && config.batchSize 
      ? `\n\nBATCH CONTEXT: This is generation ${config.batchPosition} of ${config.batchSize}. Generate completely UNIQUE content with MAXIMUM VARIETY - avoid repeating words, examples, concepts, semantic fields, word origins, or even similar-sounding words from previous generations in this batch. Each word should feel completely fresh and unrelated to previous ones. ${alphabetGuidance}${previousWordsContext}`
      : '';

    const topicGuidance = this.getTopicSpecificGuidance(topic.key);
    const randomGuidance = this.getRandomGuidance();
    
    // Enhanced vocabulary discovery systems
    const vocabularyDiscovery = config.previousWords && config.previousWords.length > 0
      ? this.getAdvancedVocabularyDiscovery(config.previousWords)
      : '';
    
    const smartSuggestion = config.previousWords 
      ? this.getSmartWordSuggestion(config.previousWords, topic.key)
      : '';
    
    const expansionStrategy = this.getVocabularyExpansionStrategy();

    // Generate advanced variability package
    const variabilityConfig = createVariabilityConfig(
      config.batchPosition,
      config.batchSize,
      config.previousWords && config.previousWords.length > 0
    );
    
    const variabilityPackage = generateVariabilityPackage(variabilityConfig, {
      topicKey: topic.key,
      examType: this.getExamTypeFromTopic(topic.key),
      batchPosition: config.batchPosition,
      previousWords: config.previousWords
    });

    let basePrompt = `You are an English vocabulary teacher creating engaging content for social media. Your mission is to help people discover useful words they can immediately start using in their daily conversations.

TOPIC FOCUS: ${topicGuidance}

ADDITIONAL GUIDANCE: ${randomGuidance}

${expansionStrategy}

ADVANCED VOCABULARY DISCOVERY:
${vocabularyDiscovery || 'Discover sophisticated vocabulary that demonstrates intellectual maturity and precision.'}

SMART RECOMMENDATIONS:
${smartSuggestion}

WORD SELECTION CRITERIA:
- Choose words at B2-C1 level that challenge and elevate vocabulary
- Select sophisticated vocabulary suitable for competitive exams (GRE, GMAT, UPSC, IELTS, TOEFL)
- Avoid basic words like "important," "good," "nice," "crucial," "strategic," "pivotal"
- Focus on words with rich etymology, nuanced meanings, or specialized usage
- Pick vocabulary that distinguishes advanced speakers from intermediate ones
- PRIORITY: Choose words that appear in academic texts, quality publications, or formal discourse
- EXPLORE BEYOND: Look in academic journals, expert commentary, scholarly discourse, and professional literature
- DISCOVERY SOURCES: Consider vocabulary from research papers, literary works, expert analysis, and specialized fields
- TOPIC SPECIFIC: ${topicGuidance}${batchContext}

ADVANCED WORD HUNTING TECHNIQUES:
- Think like a vocabulary researcher: What words do experts use that learners don't know?
- Explore interdisciplinary vocabulary that bridges multiple academic fields
- Discover words that demonstrate cultural sophistication and intellectual breadth
- Find terminology used by thought leaders, scholars, and industry experts
- Seek words that appear in quality publications like The Atlantic, The New Yorker, or academic journals
- Look for vocabulary that would impress educated native speakers

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
UNIQUENESS & VARIETY REQUIREMENTS:
- Every generation must feature a completely different word from distinct semantic domains
- No repetitions, near-synonyms, or words from related concepts allowed
- Words must start with different letters and belong to entirely different categories
- Vary word origins (Latin, Greek, Germanic, French, etc.) across generations
- Alternate between different parts of speech and complexity levels
- Ensure examples demonstrate completely different contexts and usage scenarios
- Mix formal/informal registers, technical/general domains, and abstract/concrete concepts

VOCABULARY EXPLORATION MINDSET:
Think like a curator of exceptional vocabulary. Your goal is to discover words that:
- Would make a linguistics professor nod in approval
- Appear in the vocabulary sections of competitive exam prep books
- Are used by sophisticated speakers and writers
- Bridge academic knowledge with practical communication
- Demonstrate the richness and precision of the English language 


ALPHABETICAL GUIDANCE: ${alphabetGuidance}

QUALITY STANDARDS:
- The word should genuinely improve someone's vocabulary
- The example should demonstrate clear, proper usage
- The definition should be immediately understandable
- The word should feel like a genuine discovery, not just another common word

[${timeMarker}]`;

    // Inject advanced variability tokens and seeds
    basePrompt = injectVariabilityIntoPrompt(basePrompt, variabilityPackage);

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }
}