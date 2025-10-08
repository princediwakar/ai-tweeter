/**
 * Advanced Vocabulary Discovery System
 * Expands AI's vocabulary finding capabilities beyond predefined lists
 */

export interface VocabularySource {
  category: string;
  description: string;
  sampleWords: string[];
  discoveryPrompts: string[];
}

export interface AdvancedWordContext {
  academicFields: string[];
  literaryGenres: string[];
  professionalDomains: string[];
  culturalContexts: string[];
  technicalAreas: string[];
}

/**
 * Comprehensive vocabulary sources for AI discovery
 */
export const VOCABULARY_SOURCES: VocabularySource[] = [
  {
    category: "Academic Research Terminology",
    description: "Words used in peer-reviewed journals and academic discourse",
    sampleWords: ["empirical", "paradigm", "hypothesis", "methodology", "correlate"],
    discoveryPrompts: [
      "Find sophisticated terms used in academic research papers and scholarly articles",
      "Select vocabulary that demonstrates intellectual rigor and academic precision",
      "Choose words that appear in university-level textbooks and research methodology",
      "Pick terminology that shows mastery of academic discourse and critical analysis"
    ]
  },
  {
    category: "Literary and Artistic Expression",
    description: "Rich vocabulary from literature, poetry, and artistic critique",
    sampleWords: ["mellifluous", "enigmatic", "poignant", "sublime", "evocative"],
    discoveryPrompts: [
      "Discover elegant words from classical and contemporary literature",
      "Find vocabulary that poets and authors use to create beautiful, precise expression",
      "Select words that art critics and literary scholars employ in their analyses",
      "Choose terms that enhance creative writing and artistic communication"
    ]
  },
  {
    category: "Psychological and Behavioral Sciences",
    description: "Precise terms for human behavior, cognition, and mental processes",
    sampleWords: ["introspective", "cognizant", "disposition", "compulsion", "resilience"],
    discoveryPrompts: [
      "Find precise vocabulary for describing human behavior and mental states",
      "Select terms used in psychology, sociology, and behavioral research",
      "Choose words that help articulate complex emotional and cognitive processes",
      "Pick vocabulary that enhances understanding of human nature and motivation"
    ]
  },
  {
    category: "Business and Economic Discourse",
    description: "Sophisticated terminology from finance, management, and economics",
    sampleWords: ["leverage", "synergy", "optimize", "strategic", "paradigm"],
    discoveryPrompts: [
      "Discover advanced business vocabulary beyond basic corporate jargon",
      "Find terms used in economic analysis, financial modeling, and strategic planning",
      "Select vocabulary that demonstrates business acumen and market sophistication",
      "Choose words that enhance professional communication and leadership discourse"
    ]
  },
  {
    category: "Scientific and Technical Innovation",
    description: "Precise terminology from cutting-edge science and technology",
    sampleWords: ["algorithm", "quantum", "synthesis", "optimization", "iteration"],
    discoveryPrompts: [
      "Find vocabulary from emerging scientific fields and technological innovation",
      "Select terms that bridge technical precision with general understanding",
      "Choose words used in scientific journals, research papers, and tech discourse",
      "Pick vocabulary that demonstrates scientific literacy and technical competence"
    ]
  },
  {
    category: "Philosophical and Ethical Reasoning",
    description: "Concepts for deep thinking, ethics, and philosophical discourse",
    sampleWords: ["ontological", "epistemological", "dialectical", "pragmatic", "existential"],
    discoveryPrompts: [
      "Discover vocabulary for philosophical inquiry and ethical reasoning",
      "Find terms that facilitate deep thinking about existence, knowledge, and values",
      "Select words that enhance moral reasoning and philosophical discussion",
      "Choose vocabulary that demonstrates intellectual depth and contemplative thinking"
    ]
  },
  {
    category: "Legal and Jurisprudential Language",
    description: "Precise legal terminology and concepts of justice",
    sampleWords: ["jurisprudence", "precedent", "adjudicate", "jurisdiction", "litigation"],
    discoveryPrompts: [
      "Find sophisticated legal vocabulary beyond basic courtroom terms",
      "Select terminology used in constitutional law, legal theory, and jurisprudence",
      "Choose words that demonstrate understanding of legal principles and reasoning",
      "Pick vocabulary that enhances discussions of justice, rights, and legal systems"
    ]
  },
  {
    category: "Cultural and Anthropological Concepts",
    description: "Terms for understanding culture, society, and human diversity",
    sampleWords: ["ethnographic", "cosmopolitan", "vernacular", "diaspora", "hegemony"],
    discoveryPrompts: [
      "Discover vocabulary for understanding cultural diversity and social dynamics",
      "Find terms used in anthropology, sociology, and cultural studies",
      "Select words that enhance cross-cultural communication and understanding",
      "Choose vocabulary that demonstrates global awareness and cultural sensitivity"
    ]
  },
  {
    category: "Medical and Health Sciences",
    description: "Precise medical terminology and health-related concepts",
    sampleWords: ["pathology", "diagnosis", "prognosis", "therapeutic", "prophylactic"],
    discoveryPrompts: [
      "Find medical vocabulary that bridges technical precision with patient communication",
      "Select terms used in healthcare, medical research, and public health discourse",
      "Choose words that enhance understanding of health, wellness, and medical science",
      "Pick vocabulary that demonstrates health literacy and medical knowledge"
    ]
  },
  {
    category: "Environmental and Ecological Terminology",
    description: "Sophisticated vocabulary for environmental science and sustainability",
    sampleWords: ["biodiversity", "sustainable", "ecosystem", "conservation", "renewable"],
    discoveryPrompts: [
      "Discover advanced environmental vocabulary beyond basic conservation terms",
      "Find terminology used in ecological research, climate science, and sustainability",
      "Select words that enhance environmental discourse and green communication",
      "Choose vocabulary that demonstrates ecological awareness and environmental literacy"
    ]
  }
];

/**
 * Advanced word discovery contexts for expanding AI vocabulary
 */
export const ADVANCED_CONTEXTS: AdvancedWordContext = {
  academicFields: [
    "Cognitive neuroscience", "Computational linguistics", "Behavioral economics",
    "Quantum physics", "Molecular biology", "Cultural anthropology",
    "Constitutional law", "Environmental engineering", "Data science",
    "International relations", "Organizational psychology", "Bioethics"
  ],
  
  literaryGenres: [
    "Magical realism", "Dystopian fiction", "Stream of consciousness",
    "Postmodern literature", "Gothic romance", "Experimental poetry",
    "Historical fiction", "Science fiction", "Literary criticism",
    "Comparative literature", "Creative nonfiction", "Epistolary novels"
  ],
  
  professionalDomains: [
    "Investment banking", "Management consulting", "Digital marketing",
    "Software architecture", "Project management", "Human resources",
    "Operations research", "Strategic planning", "Risk management",
    "Quality assurance", "Business intelligence", "Supply chain management"
  ],
  
  culturalContexts: [
    "Cross-cultural communication", "Global citizenship", "Cultural diplomacy",
    "Intercultural competence", "Diaspora communities", "Cultural preservation",
    "Indigenous knowledge systems", "Multilingual societies", "Cultural adaptation",
    "Heritage conservation", "Cultural exchange", "Globalization effects"
  ],
  
  technicalAreas: [
    "Artificial intelligence", "Machine learning", "Blockchain technology",
    "Cybersecurity", "Cloud computing", "Internet of Things",
    "Renewable energy", "Biotechnology", "Nanotechnology",
    "Robotics", "Virtual reality", "Quantum computing"
  ]
};

/**
 * Generates dynamic vocabulary discovery prompts based on current context
 */
export function generateVocabularyDiscoveryPrompt(
  excludedWords: string[],
  targetComplexity: 'intermediate' | 'advanced' | 'expert' = 'advanced'
): string {
  const randomSource = VOCABULARY_SOURCES[Math.floor(Math.random() * VOCABULARY_SOURCES.length)];
  const randomPrompt = randomSource.discoveryPrompts[Math.floor(Math.random() * randomSource.discoveryPrompts.length)];
  
  const complexityGuidance = {
    intermediate: "Choose words that bridge everyday language with sophisticated vocabulary",
    advanced: "Select sophisticated vocabulary that demonstrates intellectual maturity",
    expert: "Find highly sophisticated terms used by experts and scholars in their fields"
  };
  
  const contextElements = [
    ADVANCED_CONTEXTS.academicFields[Math.floor(Math.random() * ADVANCED_CONTEXTS.academicFields.length)],
    ADVANCED_CONTEXTS.professionalDomains[Math.floor(Math.random() * ADVANCED_CONTEXTS.professionalDomains.length)],
    ADVANCED_CONTEXTS.technicalAreas[Math.floor(Math.random() * ADVANCED_CONTEXTS.technicalAreas.length)]
  ];
  
  return `
VOCABULARY DISCOVERY CHALLENGE:
${randomPrompt}

EXPLORATION CONTEXT: Think like an expert in ${contextElements.join(', ')}.

DISCOVERY GUIDANCE:
- ${complexityGuidance[targetComplexity]}
- Explore vocabulary from ${randomSource.category.toLowerCase()}
- Look beyond common words to find precise, sophisticated alternatives
- Consider words used by experts, scholars, and thought leaders
- Think of terms that appear in quality publications, academic journals, and professional discourse

WORD SOURCING INSPIRATION:
- Research terminology: What words do researchers use when they want to sound precise?
- Professional language: What vocabulary distinguishes experts from beginners?
- Academic writing: What terms appear in peer-reviewed journals and scholarly books?
- Cultural sophistication: What words demonstrate intellectual breadth and cultural awareness?

${excludedWords.length > 0 ? `EXCLUSION LIST: Absolutely avoid these previously used words: ${excludedWords.join(', ')}` : ''}

Your goal is to discover a word that genuinely expands vocabulary knowledge and demonstrates linguistic sophistication.`;
}

/**
 * Generates etymological discovery prompts to help AI find words with interesting origins
 */
export function generateEtymologicalDiscoveryPrompt(targetOrigin?: string): string {
  const origins = {
    latin: {
      description: "Latin-derived words often found in academic, legal, and scientific contexts",
      examples: ["perspicacious", "ubiquitous", "fortuitous", "loquacious", "perspicuous"],
      contexts: ["legal terminology", "medical vocabulary", "academic writing", "formal discourse"]
    },
    greek: {
      description: "Greek-derived words frequently used in scientific, philosophical, and technical fields",
      examples: ["ephemeral", "paradigmatic", "heuristic", "symbiotic", "cathartic"],
      contexts: ["scientific terminology", "philosophical concepts", "technical language", "analytical thinking"]
    },
    french: {
      description: "French-derived words that add elegance and sophistication to English",
      examples: ["nonchalant", "blasé", "entrepreneur", "connoisseur", "repertoire"],
      contexts: ["cultural discussions", "artistic expression", "culinary language", "diplomatic discourse"]
    },
    germanic: {
      description: "Germanic words that are often more direct and powerful in expression",
      examples: ["zeitgeist", "wanderlust", "schadenfreude", "gestalt", "weltanschauung"],
      contexts: ["philosophical concepts", "psychological terms", "cultural phenomena", "artistic movements"]
    }
  };
  
  const selectedOrigin = targetOrigin || Object.keys(origins)[Math.floor(Math.random() * Object.keys(origins).length)];
  const originInfo = origins[selectedOrigin as keyof typeof origins];
  
  return `
ETYMOLOGICAL WORD DISCOVERY:
Focus on finding sophisticated ${selectedOrigin.toUpperCase()}-derived vocabulary.

ORIGIN CHARACTERISTICS: ${originInfo.description}

DISCOVERY CONTEXTS: Explore words used in ${originInfo.contexts.join(', ')}.

INSPIRATION EXAMPLES (do not use these): ${originInfo.examples.join(', ')}

Your mission is to discover a ${selectedOrigin}-origin word that:
- Demonstrates etymological sophistication
- Shows understanding of word formation and linguistic history
- Provides practical value for advanced English learners
- Appears in quality writing and professional communication`;
}

/**
 * Creates competitive exam vocabulary discovery prompts
 */
export function generateCompetitiveExamPrompt(examType: 'GRE' | 'GMAT' | 'IELTS' | 'TOEFL' | 'UPSC'): string {
  const examSpecs = {
    GRE: {
      focus: "analytical reasoning, academic writing, and scholarly discourse",
      wordTypes: "sophisticated adjectives, precise verbs, and nuanced descriptors",
      contexts: "graduate school applications, academic research, intellectual discussions"
    },
    GMAT: {
      focus: "business reasoning, analytical thinking, and management concepts",
      wordTypes: "business terminology, analytical language, and strategic vocabulary",
      contexts: "MBA applications, business case studies, management discussions"
    },
    IELTS: {
      focus: "international communication, academic writing, and global contexts",
      wordTypes: "formal writing vocabulary, cross-cultural terms, and academic language",
      contexts: "international education, global communication, academic presentations"
    },
    TOEFL: {
      focus: "American academic English, university-level discourse, and scholarly communication",
      wordTypes: "academic vocabulary, formal language, and scholarly terms",
      contexts: "American university admissions, academic research, scholarly writing"
    },
    UPSC: {
      focus: "governance, policy-making, and administrative language",
      wordTypes: "administrative terminology, policy language, and governance vocabulary",
      contexts: "civil services, public administration, policy analysis"
    }
  };
  
  const spec = examSpecs[examType];
  
  return `
COMPETITIVE EXAM VOCABULARY DISCOVERY (${examType}):
Target sophisticated vocabulary specifically valuable for ${examType} preparation.

EXAM FOCUS: ${spec.focus}
TARGET WORD TYPES: ${spec.wordTypes}
APPLICATION CONTEXTS: ${spec.contexts}

DISCOVERY MISSION:
Find a word that ${examType} high scorers would use naturally and confidently. This should be vocabulary that:
- Distinguishes advanced test-takers from average performers
- Appears in high-scoring sample essays and responses
- Demonstrates the linguistic sophistication expected at the highest levels
- Provides genuine competitive advantage in exam performance

Think like a test prep expert: What word would make an examiner think "This candidate has truly advanced vocabulary skills"?`;
}

/**
 * Generates field-specific vocabulary discovery prompts
 */
export function generateFieldSpecificPrompt(): string {
  const fields = [
    {
      name: "Cognitive Psychology",
      description: "Study of mental processes including perception, memory, and decision-making",
      contexts: ["research methodology", "experimental design", "data interpretation", "theoretical frameworks"]
    },
    {
      name: "Environmental Policy",
      description: "Development and implementation of policies addressing environmental challenges",
      contexts: ["sustainability planning", "regulatory frameworks", "stakeholder engagement", "impact assessment"]
    },
    {
      name: "Digital Innovation",
      description: "Transformation of traditional processes through digital technologies",
      contexts: ["technology adoption", "digital transformation", "innovation management", "strategic implementation"]
    },
    {
      name: "International Finance",
      description: "Global financial systems, markets, and cross-border transactions",
      contexts: ["risk management", "market analysis", "regulatory compliance", "strategic planning"]
    },
    {
      name: "Cultural Studies",
      description: "Interdisciplinary study of cultural practices, beliefs, and expressions",
      contexts: ["ethnographic research", "cultural analysis", "social theory", "identity formation"]
    }
  ];
  
  const selectedField = fields[Math.floor(Math.random() * fields.length)];
  
  return `
FIELD-SPECIFIC VOCABULARY DISCOVERY:
Explore sophisticated terminology from ${selectedField.name}.

FIELD DESCRIPTION: ${selectedField.description}

DISCOVERY CONTEXTS: Think about vocabulary used in ${selectedField.contexts.join(', ')}.

Your challenge is to find a word that:
- Demonstrates deep understanding of this specialized field
- Shows precision in professional/academic communication
- Would be recognized and valued by experts in this area
- Bridges specialist knowledge with broader educational value

Consider: What word would a respected ${selectedField.name.toLowerCase()} expert use that would enhance a learner's vocabulary?`;
}