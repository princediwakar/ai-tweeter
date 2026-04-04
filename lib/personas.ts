import { sql } from '@vercel/postgres';
import { accountService } from './accountService';

export interface PersonaTopic {
  key: string;
  displayName: string;
}

export interface PersonaConfig {
  key: string;
  displayName: string;
  description: string;
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
  content_types: ['thread']
};

export const CRICKET_STORYTELLER: PersonaConfig = {
  key: 'cricket_storyteller',
  displayName: 'Cricket Storyteller 🏏',
  description: 'Human stories with cricket as the backdrop - exploring character, psychology, and life lessons through iconic cricket moments',
  content_types: ['thread'],
};

export const SATIRIST: PersonaConfig = {
  key: 'satirist',
  displayName: 'The Signal Finder 💡',
  description: 'Extracts non-obvious insights from news using specific data and evidence.',
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true
  },
};

export const PATTERN_SPOTTER: PersonaConfig = {
  key: 'pattern_spotter',
  displayName: 'The Pattern Spotter 🔍',
  description: 'Finds non-obvious patterns across multiple news stories.',
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true
  },
};

export const LINKEDIN_ANALYST: PersonaConfig = {
  key: 'linkedin_analyst',
  displayName: 'LinkedIn Analyst 📊',
  description: 'Creates meaningful, long-form content on AI, products, startups, trends.',
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true
  },
};

export const PERSONAS: readonly PersonaConfig[] = [
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

export function getAllPersonas(): PersonaConfig[] {
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

const FALLBACK_ACCOUNT_PERSONA_MAPPING: Record<string, string[]> = {
  'gibbi_ai': ['english_vocab_builder'],
  'princediwakar25': ['satirist', 'pattern_spotter', 'business_storyteller', 'cricket_storyteller', 'linkedin_analyst'],
};

export async function getAllowedPersonasForHandle(twitterHandle: string): Promise<string[]> {
  if (!twitterHandle) return [];
  const cleanHandle = twitterHandle.replace('@', '').toLowerCase();

  try {
    const account = await accountService.getAccountByTwitterHandle(cleanHandle);
    if (account && account.personas && account.personas.length > 0) {
      return account.personas;
    }
  } catch (e) {
    console.warn('Failed to get DB personas, using fallback:', e);
  }

  return FALLBACK_ACCOUNT_PERSONA_MAPPING[cleanHandle] || [];
}

export function isPersonaAllowedForHandle(personaKey: string, twitterHandle: string): boolean {
  const allowedPersonas = FALLBACK_ACCOUNT_PERSONA_MAPPING[twitterHandle.replace('@', '').toLowerCase()] || [];
  return allowedPersonas.includes(personaKey);
}

export async function getRandomPersonaForHandle(twitterHandle: string, personaKeys?: string[]): Promise<PersonaConfig> {
  const allowedPersonas = await getAllowedPersonasForHandle(twitterHandle);
  
  let eligiblePersonas = allowedPersonas;
  if (personaKeys && personaKeys.length > 0) {
    eligiblePersonas = personaKeys.filter(key => allowedPersonas.includes(key));
  }
  if (eligiblePersonas.length === 0) eligiblePersonas = allowedPersonas;
  
  if (eligiblePersonas.length === 0) {
    throw new Error(`No personas allowed for handle: ${twitterHandle}`);
  }
  
  const randomKey = eligiblePersonas[Math.floor(Math.random() * eligiblePersonas.length)];
  const persona = getPersonaByKey(randomKey);
  if (!persona) throw new Error(`Persona not found: ${randomKey}`);
  return persona;
}

export default PERSONAS;
