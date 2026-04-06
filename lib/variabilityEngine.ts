/**
 * Generic Variability Engine
 * Generates dynamic tokens, seeds, and randomization markers
 * All variability is persona-agnostic - reads from DB config
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
 * Generic seed phrases - no hardcoded persona references
 * All categories are abstract and apply to any content domain
 */
const SEED_PHRASES = {
  creative: [
    "Think like a polymath discovering connections across disciplines",
    "Channel the curiosity of an explorer uncovering hidden insights",
    "Approach this with fresh perspective and unconventional thinking",
    "Embody the perspective of a collector gathering meaningful data",
    "Think as a scientist mapping patterns and relationships"
  ],
  
  analytical: [
    "Apply rigorous methodology with precision and accuracy",
    "Think with the precision of an expert craftsman",
    "Approach like a data scientist mining patterns",
    "Channel the methodology of a researcher studying samples",
    "Think as an analyst examining millions of data points"
  ],
  
  exploratory: [
    "Venture into uncharted territories with curiosity",
    "Navigate landscapes with the wonder of discovery",
    "Explore networks mapping meaningful connections",
    "Journey through information like an explorer",
    "Discover insights with the wonder of exploration"
  ],
  
  expert: [
    "Think with the sophistication of an industry expert",
    "Channel the expertise of a specialist in the field",
    "Approach with authority and deep knowledge",
    "Think like a professional selecting the most effective elements",
    "Embody the mindset of a craftsman perfecting their art"
  ]
};

/**
 * Generic variability tokens - domain-agnostic
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
  
  analytical: [
    "{DATA_DRIVEN}", "{PATTERN_ANALYSIS}", "{INSIGHT_FOCUS}", "{METRIC_MINDSET}",
    "{EVIDENCE_BASED}", "{QUANTITATIVE_VIEW}", "{LOGICAL_FRAME}", "{STRUCTURED_THINK}"
  ],
  
  temporal: [
    "{TEMPORAL_SHIFT}", "{PERSPECTIVE_SHIFT}", "{MODERN_TWIST}", "{FUTURISTIC_LENS}",
    "{HISTORICAL_VIEW}", "{CONTEMPORARY_FLAVOR}", "{TIMELESS_QUALITY}", "{EVOLUTIONARY_VIEW}"
  ]
};

/**
 * Generic random markers - no domain specificity
 */
const RANDOM_MARKERS = {
  attention: [
    "⚡FOCUS_ALPHA⚡", "🎯INTENSITY_BETA🎯", "🔥PRECISION_GAMMA🔥",
    "💎CLARITY_DELTA💎", "🌟BRILLIANCE_EPSILON🌟", "⭐EXCELLENCE_ZETA⭐"
  ],
  
  cognitive: [
    "🧠NEURAL_PATTERNS🧠", "🔬ANALYTICAL_LENS🔬", "🎨CREATIVE_FILTER🎨",
    "📊DATA_MODE📊", "🌈SPECTRUM_VIEW🌈", "🔮INSIGHT_PORTAL🔮"
  ],
  
  randomization: [
    "🎲CHAOS_SEED🎲", "🌀ENTROPY_FIELD🌀", "⚡RANDOM_PULSE⚡",
    "🔄VARIABILITY_WAVE🔄", "🎭PATTERN_BREAK🎭", "🚀INNOVATION_BURST🚀"
  ]
};

/**
 * Generic contextual cues - apply to any domain
 */
const CONTEXTUAL_CUES = {
  academic: [
    "Research-oriented mindset", "Scholarly discourse", "Evidence-based precision",
    "Academic vocabulary", "Professional depth", "Expert-level analysis"
  ],
  
  professional: [
    "Executive communication", "Industry perspective", "Expert vocabulary",
    "Business context", "Strategic language", "Professional quality"
  ],
  
  cultural: [
    "Global awareness", "Cross-cultural sensitivity", "International perspective",
    "Diplomatic communication", "Broad understanding", "Worldly sophistication"
  ],
  
  creative: [
    "Innovative mindset", "Creative exploration", "Novel perspective",
    "Artistic expression", "Unconventional approach", "Breakthrough thinking"
  ]
};

/**
 * Generates pseudo-random number from entropy
 */
function generateEntropy(): number {
  const now = Date.now();
  const micro = performance.now();
  const random = Math.random();
  const entropy = (now * micro * random) % 1000000;
  return entropy / 1000000;
}

/**
 * Creates a dynamic seed based on randomness
 */
export function generateDynamicSeed(): string {
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
  const tokenCounts = { low: 2, medium: 4, high: 6, extreme: 8 };
  const count = tokenCounts[intensityLevel];
  const allTokens = Object.values(VARIABILITY_TOKENS).flat();
  const tokens: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const entropy = generateEntropy();
    const tokenIndex = Math.floor(entropy * allTokens.length);
    const token = allTokens[tokenIndex];
    if (!tokens.includes(token)) tokens.push(token);
  }
  
  return tokens;
}

/**
 * Generates random markers for AI attention
 */
export function generateRandomMarkers(count: number = 2): string[] {
  const allMarkers = Object.values(RANDOM_MARKERS).flat();
  const markers: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const entropy = generateEntropy();
    const index = Math.floor(entropy * allMarkers.length);
    const marker = allMarkers[index];
    if (!markers.includes(marker)) markers.push(marker);
  }
  
  return markers;
}

/**
 * Generates contextual cues based on persona config
 */
export function generateContextualCues(count: number = 3): string[] {
  const allCues = Object.values(CONTEXTUAL_CUES).flat();
  const cues: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const entropy = generateEntropy();
    const index = Math.floor(entropy * allCues.length);
    const cue = allCues[index];
    if (!cues.includes(cue)) cues.push(cue);
  }
  
  return cues;
}

/**
 * Main function: generate full variability output
 */
export function generateVariability(config: VariabilityConfig): VariabilityOutput {
  const seedPhrase = config.useSeeds ? generateDynamicSeed() : "";
  const variabilityTokens = config.useTokens ? generateVariabilityTokens(config.intensityLevel) : [];
  const randomMarkers = config.useRandomMarkers ? generateRandomMarkers(2) : [];
  const contextualCues = config.contextAwareness ? generateContextualCues(3) : [];
  
  const diversityInjection = [
    variabilityTokens.join(" "),
    randomMarkers.join(" "),
    contextualCues.join(" | ")
  ].filter(Boolean).join("\n");
  
  return {
    seedPhrase,
    variabilityTokens,
    randomMarkers,
    contextualCues,
    diversityInjection
  };
}