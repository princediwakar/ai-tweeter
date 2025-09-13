/**
 * Advanced Variability Engine
 * Generates dynamic tokens, seeds, and randomization markers to maximize AI output diversity
 */

export interface VariabilityConfig {
  useSeeds: boolean;
  useTokens: boolean;
  useRandomMarkers: boolean;
  intensityLevel: 'low' | 'medium' | 'high' | 'extreme';
  contextAwareness: boolean;
}

export interface VariabilityOutput {
  seedPhrase: string;
  variabilityTokens: string[];
  randomMarkers: string[];
  contextualCues: string[];
  diversityInjection: string;
}

/**
 * Dynamic seed phrases that influence AI behavior patterns
 */
const SEED_PHRASES = {
  creative: [
    "Think like a renaissance polymath discovering connections across disciplines",
    "Channel the curiosity of a linguistic archaeologist uncovering hidden word treasures",
    "Approach this with the mind of a vocabulary alchemist transforming common into extraordinary",
    "Embody the perspective of a cross-cultural word collector gathering global linguistic gems",
    "Think as a cognitive scientist mapping the neural pathways of advanced communication"
  ],
  
  analytical: [
    "Apply the rigor of a computational linguist analyzing word frequency patterns",
    "Think with the precision of a lexicographer crafting dictionary definitions",
    "Approach this like a data scientist mining patterns in academic corpus databases",
    "Channel the methodology of a psycholinguist studying language acquisition",
    "Think as a corpus linguist analyzing millions of text samples for rare gems"
  ],
  
  exploratory: [
    "Venture into uncharted territories of the English lexicon like a linguistic explorer",
    "Navigate vocabulary landscapes with the curiosity of an anthropologist",
    "Explore semantic networks like a cognitive cartographer mapping meaning",
    "Journey through etymology like a time-traveling word historian",
    "Discover vocabulary with the wonder of a first-time reader in a vast library"
  ],
  
  expert: [
    "Think with the sophistication of a Harvard linguistics professor",
    "Channel the expertise of a competitive vocabulary coach for international students",
    "Approach with the authority of a New York Times crossword puzzle constructor",
    "Think like a GRE vocabulary section author selecting the most challenging words",
    "Embody the mindset of a Scripps National Spelling Bee word curator"
  ]
};

/**
 * Variability tokens that inject randomness into AI processing
 */
const VARIABILITY_TOKENS = {
  cognitive: [
    "{THINK_DIFFERENTLY}", "{BREAK_PATTERNS}", "{SURPRISE_MODE}", "{FRESH_PERSPECTIVE}",
    "{UNEXPECTED_ANGLE}", "{NOVEL_APPROACH}", "{CREATIVE_LEAP}", "{PARADIGM_SHIFT}"
  ],
  
  discovery: [
    "{EXPLORE_UNKNOWN}", "{SEEK_RARE}", "{FIND_HIDDEN}", "{UNCOVER_GEMS}",
    "{DISCOVER_TREASURE}", "{HUNT_UNIQUE}", "{MINE_DEEP}", "{EXCAVATE_UNUSUAL}"
  ],
  
  linguistic: [
    "{ETYMOLOGICAL_DIVE}", "{SEMANTIC_VOYAGE}", "{MORPHOLOGICAL_TWIST}", "{PHONETIC_SURPRISE}",
    "{SYNTACTIC_ADVENTURE}", "{LEXICAL_EXPERIMENT}", "{PRAGMATIC_SHIFT}", "{DISCOURSE_INNOVATION}"
  ],
  
  temporal: [
    "{TEMPORAL_SHIFT}", "{ARCHAIC_ECHO}", "{MODERN_TWIST}", "{FUTURISTIC_LENS}",
    "{HISTORICAL_PERSPECTIVE}", "{CONTEMPORARY_FLAVOR}", "{TIMELESS_QUALITY}", "{EVOLUTIONARY_VIEW}"
  ]
};

/**
 * Random markers that influence AI attention and focus
 */
const RANDOM_MARKERS = {
  attention: [
    "⚡ATTENTION_VECTOR_ALPHA⚡", "🎯FOCUS_MATRIX_BETA🎯", "🔥INTENSITY_GAMMA🔥",
    "💎PRECISION_DELTA💎", "🌟BRILLIANCE_EPSILON🌟", "⭐EXCELLENCE_ZETA⭐"
  ],
  
  cognitive: [
    "🧠NEURAL_PATHWAY_1🧠", "🔬COGNITIVE_LENS_2🔬", "🎨CREATIVE_FILTER_3🎨",
    "📊ANALYTICAL_MODE_4📊", "🌈SPECTRUM_VIEW_5🌈", "🔮INSIGHT_PORTAL_6🔮"
  ],
  
  randomization: [
    "🎲CHAOS_SEED_X🎲", "🌀ENTROPY_FIELD_Y🌀", "⚡RANDOM_PULSE_Z⚡",
    "🔄VARIABILITY_WAVE🔄", "🎭PATTERN_BREAK🎭", "🚀INNOVATION_BURST🚀"
  ]
};

/**
 * Contextual cues that guide AI toward specific discovery modes
 */
const CONTEXTUAL_CUES = {
  academic: [
    "Peer-reviewed journal mindset", "Scholarly discourse orientation", "Research paper precision",
    "Academic conference vocabulary", "Dissertation-level sophistication", "Graduate seminar depth"
  ],
  
  professional: [
    "C-suite communication level", "Industry thought leader perspective", "Expert consultant vocabulary",
    "International business context", "Strategic planning language", "Executive presentation quality"
  ],
  
  cultural: [
    "Global citizen awareness", "Cross-cultural sensitivity", "International perspective",
    "Diplomatic communication", "Multicultural understanding", "Worldly sophistication"
  ],
  
  competitive: [
    "High-stakes exam mindset", "Olympic vocabulary level", "Championship word selection",
    "Tournament-grade precision", "Elite competitor standards", "Record-breaking vocabulary"
  ]
};

/**
 * Generates pseudo-random numbers based on multiple entropy sources
 */
function generateEntropy(): number {
  const now = Date.now();
  const micro = performance.now();
  const random = Math.random();
  
  // Combine multiple entropy sources
  const entropy = (now * micro * random) % 1000000;
  return entropy / 1000000;
}

/**
 * Creates a dynamic seed based on context and randomness
 */
export function generateDynamicSeed(context?: string): string {
  const entropy = generateEntropy();
  const seedTypes = Object.keys(SEED_PHRASES);
  const selectedType = seedTypes[Math.floor(entropy * seedTypes.length)];
  const phrases = SEED_PHRASES[selectedType as keyof typeof SEED_PHRASES];
  const selectedPhrase = phrases[Math.floor((entropy * 7) % phrases.length)];
  
  const modifier = entropy > 0.5 ? " with unconventional thinking" : " with fresh insights";
  return `${selectedPhrase}${modifier}`;
}

/**
 * Generates variability tokens based on intensity level
 */
export function generateVariabilityTokens(intensityLevel: VariabilityConfig['intensityLevel']): string[] {
  const tokenCounts = {
    low: 2,
    medium: 4,
    high: 6,
    extreme: 8
  };
  
  const count = tokenCounts[intensityLevel];
  const allTokens = Object.values(VARIABILITY_TOKENS).flat();
  const tokens: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const entropy = generateEntropy();
    const tokenIndex = Math.floor(entropy * allTokens.length);
    const token = allTokens[tokenIndex];
    if (!tokens.includes(token)) {
      tokens.push(token);
    }
  }
  
  return tokens;
}

/**
 * Generates random markers for AI attention manipulation
 */
export function generateRandomMarkers(count: number = 3): string[] {
  const allMarkers = Object.values(RANDOM_MARKERS).flat();
  const markers: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const entropy = generateEntropy();
    const markerIndex = Math.floor(entropy * allMarkers.length);
    const marker = allMarkers[markerIndex];
    if (!markers.includes(marker)) {
      markers.push(marker);
    }
  }
  
  return markers;
}

/**
 * Generates contextual cues based on topic and situation
 */
export function generateContextualCues(topicKey?: string, examType?: string): string[] {
  let cueCategory = 'academic'; // default
  
  if (examType) {
    cueCategory = 'competitive';
  } else if (topicKey?.includes('business') || topicKey?.includes('professional')) {
    cueCategory = 'professional';
  } else if (topicKey?.includes('cultural') || topicKey?.includes('global')) {
    cueCategory = 'cultural';
  }
  
  const cues = CONTEXTUAL_CUES[cueCategory as keyof typeof CONTEXTUAL_CUES];
  const entropy = generateEntropy();
  const selectedCues: string[] = [];
  
  // Select 2-3 contextual cues
  for (let i = 0; i < 3; i++) {
    const cueIndex = Math.floor((entropy + i * 0.33) * cues.length) % cues.length;
    const cue = cues[cueIndex];
    if (!selectedCues.includes(cue)) {
      selectedCues.push(cue);
    }
  }
  
  return selectedCues;
}

/**
 * Creates a diversity injection phrase
 */
export function generateDiversityInjection(): string {
  const injections = [
    "Break all patterns and create something genuinely unexpected",
    "Surprise yourself with vocabulary choices that feel completely fresh",
    "Think beyond your usual word selection algorithms",
    "Challenge your own linguistic comfort zone",
    "Discover words that would make you pause and think 'interesting choice'",
    "Generate something that doesn't feel like your typical response",
    "Find vocabulary that sparks curiosity even in yourself",
    "Create content that feels like a delightful linguistic surprise",
    "Choose words that would make a vocabulary expert say 'excellent selection'",
    "Think like you're curating words for the most sophisticated audience"
  ];
  
  const entropy = generateEntropy();
  const index = Math.floor(entropy * injections.length);
  return injections[index];
}

/**
 * Main function to generate complete variability package
 */
export function generateVariabilityPackage(config: VariabilityConfig, context?: {
  topicKey?: string;
  examType?: string;
  batchPosition?: number;
  previousWords?: string[];
}): VariabilityOutput {
  const output: VariabilityOutput = {
    seedPhrase: '',
    variabilityTokens: [],
    randomMarkers: [],
    contextualCues: [],
    diversityInjection: ''
  };
  
  if (config.useSeeds) {
    output.seedPhrase = generateDynamicSeed(context?.topicKey);
  }
  
  if (config.useTokens) {
    output.variabilityTokens = generateVariabilityTokens(config.intensityLevel);
  }
  
  if (config.useRandomMarkers) {
    const markerCount = config.intensityLevel === 'extreme' ? 5 : 
                       config.intensityLevel === 'high' ? 4 : 
                       config.intensityLevel === 'medium' ? 3 : 2;
    output.randomMarkers = generateRandomMarkers(markerCount);
  }
  
  if (config.contextAwareness) {
    output.contextualCues = generateContextualCues(context?.topicKey, context?.examType);
  }
  
  output.diversityInjection = generateDiversityInjection();
  
  return output;
}

/**
 * Creates variability configuration based on generation context
 */
export function createVariabilityConfig(
  batchPosition?: number,
  batchSize?: number,
  hasRecentWords?: boolean
): VariabilityConfig {
  // Increase intensity for larger batches or when avoiding repetition
  let intensity: VariabilityConfig['intensityLevel'] = 'medium';
  
  if (batchSize && batchSize > 5) {
    intensity = 'extreme';
  } else if (batchSize && batchSize > 3) {
    intensity = 'high';
  } else if (hasRecentWords) {
    intensity = 'high';
  }
  
  // Add extra randomness for later positions in batch
  if (batchPosition && batchPosition > 2) {
    intensity = intensity === 'medium' ? 'high' : 
               intensity === 'high' ? 'extreme' : intensity;
  }
  
  return {
    useSeeds: true,
    useTokens: true,
    useRandomMarkers: true,
    intensityLevel: intensity,
    contextAwareness: true
  };
}

/**
 * Injects variability into prompt text
 */
export function injectVariabilityIntoPrompt(
  basePrompt: string,
  variability: VariabilityOutput
): string {
  let enhancedPrompt = basePrompt;
  
  // Inject seed phrase at the beginning
  if (variability.seedPhrase) {
    enhancedPrompt = `COGNITIVE SEED: ${variability.seedPhrase}\n\n${enhancedPrompt}`;
  }
  
  // Inject variability tokens throughout
  if (variability.variabilityTokens.length > 0) {
    const tokenString = variability.variabilityTokens.join(' ');
    enhancedPrompt = enhancedPrompt.replace(
      'WORD SELECTION CRITERIA:',
      `VARIABILITY TOKENS: ${tokenString}\n\nWORD SELECTION CRITERIA:`
    );
  }
  
  // Inject random markers
  if (variability.randomMarkers.length > 0) {
    const markerString = variability.randomMarkers.join(' ');
    enhancedPrompt = enhancedPrompt.replace(
      'QUALITY STANDARDS:',
      `${markerString}\n\nQUALITY STANDARDS:`
    );
  }
  
  // Inject contextual cues
  if (variability.contextualCues.length > 0) {
    const cueString = variability.contextualCues.join(', ');
    enhancedPrompt = enhancedPrompt.replace(
      'Your goal is to discover',
      `CONTEXTUAL FRAMEWORK: ${cueString}\n\nYour goal is to discover`
    );
  }
  
  // Inject diversity requirement
  if (variability.diversityInjection) {
    enhancedPrompt = enhancedPrompt.replace(
      'VOCABULARY EXPLORATION MINDSET:',
      `DIVERSITY IMPERATIVE: ${variability.diversityInjection}\n\nVOCABULARY EXPLORATION MINDSET:`
    );
  }
  
  return enhancedPrompt;
}