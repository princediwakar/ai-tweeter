// lib/personas.ts

// Represents a topic/subcategory in the persona hierarchy
export interface PersonaTopic {
  key: string;
  displayName: string;
}

// Defines the structure for personas with detailed topic breakdown
export interface PersonaConfig {
  key: string;
  displayName: string;
  description: string; // For UI and general purpose
  prompt_template?: string;
  content_types?: ('single_tweet' | 'thread')[];
  thread_templates?: string[];
  image_generation?: {
    enabled: boolean;
    unsplash_query?: string;
  };
}


export const VOCABULARY_BUILDER: PersonaConfig = {
  key: 'english_vocab_builder',
  displayName: 'Vocabulary Builder 🏆',
  description: 'Master new words, meanings, and usage in engaging ways',
  image_generation: {
    enabled: true,
    unsplash_query: 'white background'
  }
};


export const BUSINESS_STORYTELLER: PersonaConfig = {
  key: 'business_storyteller',
  displayName: 'Business Storyteller 📈',
  description: 'Compelling Indian business stories with emotional depth and strategic insights',
  // MODIFIED: The persona prompt is now more focused on objective analysis and clarity.
  content_types: ['thread']
};

// lib/personas.ts (partial)
export const CRICKET_STORYTELLER: PersonaConfig = {
  key: 'cricket_storyteller',
  displayName: 'Cricket Storyteller 🏏',
  description: 'Human stories with cricket as the backdrop - exploring character, psychology, and life lessons through iconic cricket moments',
  // MODIFIED: The persona prompt is now more nuanced and contains negative constraints.
  content_types: ['thread'],
};

export const SATIRIST: PersonaConfig = {
  key: 'satirist',
  displayName: 'The Signal Finder 💡',
  description: 'Extracts non-obvious insights from news using specific data and evidence. Shows people what they missed through forensic specificity, not hot takes.',
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true // No Unsplash query - will use plain white background
  },
};

export const PATTERN_SPOTTER: PersonaConfig = {
  key: 'pattern_spotter',
  displayName: 'The Pattern Spotter 🔍',
  description: 'Finds non-obvious patterns across multiple news stories. Connects dots others miss by looking at the bigger picture.',
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true // No image generation for pattern spotter
  },
};

export const LINKEDIN_ANALYST: PersonaConfig = {
  key: 'linkedin_analyst',
  displayName: 'LinkedIn Analyst 📊',
  description: 'Creates meaningful, long-form content on AI, products, startups, data, trends, and mini-case studies specifically for LinkedIn.',
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true
  },
};


export const PERSONAS: readonly PersonaConfig[] = [ // Added readonly for better type safety
  SATIRIST,
  PATTERN_SPOTTER,
  BUSINESS_STORYTELLER,
  CRICKET_STORYTELLER,
  VOCABULARY_BUILDER,
  LINKEDIN_ANALYST,
];

export type PersonaKey = typeof PERSONAS[number]['key'];

export function getPersonaByKey(key: string): PersonaConfig | undefined {
  if (!key) return undefined;
  return PERSONAS.find(p => p.key === key);
}


export function selectPersonaByWeight(): PersonaConfig {
  const randomIndex = Math.floor(Math.random() * PERSONAS.length);
  return PERSONAS[randomIndex];
}

const ACCOUNT_PERSONA_MAPPING: Record<string, string[]> = {
  'gibbi_ai': ['english_vocab_builder'],
  'princediwakar25': ['satirist', 'pattern_spotter', 'business_storyteller', 'cricket_storyteller', 'linkedin_analyst'],
};

export function getAllowedPersonasForHandle(twitterHandle: string): string[] {
  if (!twitterHandle) return [];
  const cleanHandle = twitterHandle.replace('@', '').toLowerCase();
  return ACCOUNT_PERSONA_MAPPING[cleanHandle] || [];
}

export function isPersonaAllowedForHandle(personaKey: string, twitterHandle: string): boolean {
  const allowedPersonas = getAllowedPersonasForHandle(twitterHandle);
  return allowedPersonas.includes(personaKey);
}

export function getRandomPersonaForHandle(twitterHandle: string, personaKeys?: string[]): PersonaConfig {
  const allowedPersonas = getAllowedPersonasForHandle(twitterHandle);
  if (allowedPersonas.length === 0) throw new Error(`No personas allowed for handle: ${twitterHandle}`);
  
  let eligiblePersonas = allowedPersonas;
  if (personaKeys && personaKeys.length > 0) {
    eligiblePersonas = personaKeys.filter(key => allowedPersonas.includes(key));
  }
  if (eligiblePersonas.length === 0) eligiblePersonas = allowedPersonas;
  
  const randomKey = eligiblePersonas[Math.floor(Math.random() * eligiblePersonas.length)];
  const persona = getPersonaByKey(randomKey);
  if (!persona) throw new Error(`Persona not found: ${randomKey}`);
  return persona;
}

export function getAllPersonas(): PersonaConfig[] {
  // Return a mutable copy if needed, otherwise the readonly version is fine
  return [...PERSONAS];
}

export const personas = PERSONAS.map(p => {
  const emojiMatch = p.displayName.match(/\p{Emoji}/u);
  return {
      id: p.key,
      name: p.displayName,
      emoji: emojiMatch ? emojiMatch[0] : '🗣️',
      description: p.description,
  };
});

export default PERSONAS;