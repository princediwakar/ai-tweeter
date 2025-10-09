// lib/personas.ts
import { accountService } from './accountService';

// Represents a topic/subcategory in the persona hierarchy
export interface PersonaTopic {
  key: string;
  displayName: string;
  query_map?: string; // New: Key to map to specific queries in contentSources
}

// Defines the structure for personas with detailed topic breakdown
export interface PersonaConfig {
  key: string;
  displayName: string;
  description: string;
  topics: PersonaTopic[];
  prompt_template?: string; // Custom prompt template for this persona
  content_types?: ('single_tweet' | 'thread')[]; // Supported content types
  thread_templates?: string[]; // Available thread templates for this persona
  image_generation?: {
    enabled: boolean;
    unsplash_query?: string;
  }; // Image generation configuration
}

const CORE_VOCAB_TOPICS: PersonaTopic[] = [
  { key: 'eng_vocab_professional', displayName: 'Professional Vocabulary' },
  { key: 'eng_vocab_academic', displayName: 'Academic Words' },
  { key: 'eng_vocab_sophisticated', displayName: 'Sophisticated Daily Words' },
  { key: 'eng_vocab_business', displayName: 'Business Communication' },
  { key: 'eng_vocab_descriptive', displayName: 'Descriptive Adjectives' },
  { key: 'eng_vocab_action', displayName: 'Powerful Action Verbs' },
  { key: 'eng_vocab_emotions', displayName: 'Emotion & Feeling Words' },
  { key: 'eng_vocab_formal', displayName: 'Formal Writing Words' },
];

const ADVANCED_VOCAB_TOPICS: PersonaTopic[] = [
  { key: 'eng_vocab_etymology_roots', displayName: 'Etymology & Word Roots' },
  { key: 'eng_vocab_literary_advanced', displayName: 'Literary & Nuanced Words' },
  { key: 'eng_vocab_scientific_discourse', displayName: 'Scientific & Technical Terms' },
  { key: 'eng_vocab_philosophical', displayName: 'Philosophical & Abstract Concepts' },
  { key: 'eng_vocab_rare_sophisticated', displayName: 'Rare but Useful Words' },
];

const EXAM_VOCAB_TOPICS: PersonaTopic[] = [
  { key: 'eng_vocab_gre_advanced', displayName: 'GRE Advanced Vocabulary' },
  { key: 'eng_vocab_gmat_precision', displayName: 'GMAT Precision Words' },
  { key: 'eng_vocab_upsc_governance', displayName: 'UPSC Governance & Policy Terms' },
  { key: 'eng_vocab_ielts_academic', displayName: 'IELTS Academic Writing' },
  { key: 'eng_vocab_toefl_scholarly', displayName: 'TOEFL Scholarly Discourse' },
  { key: 'eng_vocab_debate_rhetoric', displayName: 'Debate & Rhetorical Terms' },
  { key: 'eng_vocab_policy_administration', displayName: 'Policy & Administration' }
];

export const VOCABULARY_BUILDER: PersonaConfig = {
  key: 'english_vocab_builder',
  displayName: 'Vocabulary Builder 🏆',
  description: 'Master new words, meanings, and usage in engaging ways',
  image_generation: {
    enabled: true,
    unsplash_query: 'white background'
  },
  topics: [
    ...CORE_VOCAB_TOPICS,
    ...ADVANCED_VOCAB_TOPICS,
    ...EXAM_VOCAB_TOPICS
  ]
};


// Satirist persona: The Bureaucracy Bard (single tweets only)
export const SATIRIST: PersonaConfig = {
  key: 'satirist',
  displayName: 'The Everyday Indian\'s Witty Rant 😠',
  description: 'Deadpan satire on Indian bureaucracy with a casual, conversational twist—inviting users to share their own absurd stories for collective venting.',
  content_types: ['single_tweet', 'thread'], // Added 'thread' for deeper satire
  topics: [
    // Primary Focus: Bureaucracy and Systemic Failure (Query Map keys link directly to contentSources.ts)
    { key: 'political_rhetoric_vs_reality', displayName: 'Political Rhetoric vs. Reality', query_map: 'POLITICS_RHETORIC' },
    { key: 'indian_bureaucracy_failure', displayName: 'Bureaucratic Delays & Red Tape', query_map: 'BUREAUCRACY_FAILURE' },
    { key: 'digital_services_failure', displayName: 'Digital Services & Server Issues', query_map: 'DIGITAL_FAIL' },
    { key: 'infrastructure_absurdity', displayName: 'Infrastructure Gaps & Delays', query_map: 'INFRASTRUCTURE' },
    { key: 'economic_policies_friction', displayName: 'Economic Policies & Citizen Friction', query_map: 'ECONOMY_FRICTION' },
    { key: 'social_trends_cultural_gap', displayName: 'Social Trends & Cultural Contradictions', query_map: 'SOCIAL_IDENTITY' },
    { key: 'startup_scene_regulation', displayName: 'Startup Scene & Regulatory Hurdles', query_map: 'BUSINESS_RED_TAPE' },
    { key: 'law_order_absurdity', displayName: 'Law & Order Absurdity', query_map: 'LAW_ORDER' }, // Added to ensure high diversity
    { key: 'global_south_gallows', displayName: 'Global Affairs Absurdity', query_map: 'GLOBAL_GALLOWS' },
    { key: 'user_submitted_horror_stories', displayName: 'User-Submitted Bureaucracy Horror Stories', query_map: 'BUREAUCRACY_FAILURE' }, // Added for interactivity
  ]
};

// Business storyteller persona with Indian business story templates
export const BUSINESS_STORYTELLER: PersonaConfig = {
  key: 'business_storyteller',
  displayName: 'Business Storyteller 📈',
  description: 'Compelling Indian business stories with emotional depth and strategic insights',
  content_types: ['thread'],
  thread_templates: [
    'founder_struggle',
    'business_decision', 
    'family_business_dynamics',
    'cross_era_parallel',
    'failure_recovery',
    'market_disruption',
    'succession_story',
    'crisis_leadership',
    'innovation_breakthrough',
    'cultural_adaptation'
  ],
  topics: [
    // Indian Business Stories (Simplified topic list for better thread focus)
    { key: 'founder_stories', displayName: 'Founder Journey Stories' },
    { key: 'market_disruption', displayName: 'Market Disruption Stories' },
    { key: 'fintech_revolution_india', displayName: 'FinTech Revolution in India' },
    { key: 'digital_payments_upi', displayName: 'Digital Payments & UPI Revolution' },
    
    // Global Tech Stories (for comparative storytelling)
    { key: 'silicon_valley_legends', displayName: 'Silicon Valley Origin Stories' },
    { key: 'big_tech_evolution', displayName: 'Big Tech Company Evolution' },
    { key: 'deep_tech_ai_india', displayName: 'Deep Tech & AI Innovation' },
  ]
};

// Cricket storyteller persona focusing on human stories through cricket lens
export const CRICKET_STORYTELLER: PersonaConfig = {
  key: 'cricket_storyteller',
  displayName: 'Cricket Storyteller 🏏',
  description: 'Human stories with cricket as the backdrop - exploring character, psychology, and life lessons through iconic cricket moments',
  content_types: ['thread'],
  thread_templates: [
    'iconic_moment_character_reveal',
    'pressure_psychology_breakdown', 
    'controversy_comeback_arc',
    'larger_than_life_personality',
    'rivalry_human_dynamics',
    'career_crossroads_character',
    'leadership_personality_clash',
  ],
  topics: [
    { key: 'character_through_cricket', displayName: 'Character Revealed Through Cricket' },
    { key: 'pressure_psychology', displayName: 'Psychology of Pressure Moments' },
    { key: 'cricket_personalities', displayName: 'Larger-than-Life Cricket Personalities' },
    { key: 'personal_battles_cricket', displayName: 'Personal Battles on Cricket Stage' },
    { key: 'cricket_life_lessons', displayName: 'Life Lessons Through Cricket' },
    { key: 'rivalry_psychology', displayName: 'Psychology of Cricket Rivalries' },
    { key: 'cultural_impact_cricket', displayName: 'Cultural Impact Beyond Cricket' }
  ]
};

// +++ Engagement Persona Addition +++
// This persona is for engagement only and should not be used for content generation.
export const BUSINESS_THOUGHT_LEADER: PersonaConfig = {
  key: 'business_thought_leader',
  displayName: 'Business Thought Leader 🤝',
  description: 'Peer-to-peer engagement with data-driven insights, historical parallels, and contrarian perspectives. Not for content generation.',
  topics: [], // No content generation topics
  content_types: [], // Not for generating new content
  thread_templates: [],
  image_generation: {
    enabled: false
  },
};

// Active personas optimized for current multi-account strategy
export const PERSONAS: PersonaConfig[] = [
  SATIRIST,
  BUSINESS_STORYTELLER,
  CRICKET_STORYTELLER,
  VOCABULARY_BUILDER,
  BUSINESS_THOUGHT_LEADER, // + Added new persona
] as const;



export type PersonaKey = typeof PERSONAS[number]['key'];

export function getPersonaByKey(key: string): PersonaConfig | undefined {
  if (!key) return undefined;
  return PERSONAS.find(p => p.key === key);
}

export function getRandomTopicForPersona(personaKey: string): PersonaTopic | undefined {
  const persona = getPersonaByKey(personaKey);
  if (!persona?.topics?.length) return undefined;
  
  const randomIndex = Math.floor(Math.random() * persona.topics.length);
  return persona.topics[randomIndex];
}

export function getAllTopicsForPersona(personaKey: string): PersonaTopic[] {
  const persona = getPersonaByKey(personaKey);
  return persona ? persona.topics : [];
}

// Content distribution by weight (equal distribution among defined PERSONAS)
export function selectPersonaByWeight(): PersonaConfig {
  const randomIndex = Math.floor(Math.random() * PERSONAS.length);
  return PERSONAS[randomIndex];
}

// Account-to-persona mapping for strict isolation based on Twitter handles
const ACCOUNT_PERSONA_MAPPING: Record<string, string[]> = {
  'gibbi_ai': ['english_vocab_builder'],
  'princediwakar25': ['satirist', 'business_storyteller', 'cricket_storyteller'] 
};

export function getAllowedPersonasForHandle(twitterHandle: string): string[] {
  if (!twitterHandle) return [];
  const cleanHandle = twitterHandle.replace('@', '').toLowerCase();
  return ACCOUNT_PERSONA_MAPPING[cleanHandle] || [];
}

/**
 * Get allowed personas for a specific account ID (requires account lookup)
 */
export async function getAllowedPersonasForAccount(accountId: string): Promise<string[]> {
  try {
    const account = await accountService.getAccount(accountId);
    if (!account) {
      return [];
    }
    return getAllowedPersonasForHandle(account.twitter_handle);
  } catch (error) {
    console.error(`Failed to get account for ID ${accountId}:`, error);
    return [];
  }
}

/**
 * Check if a persona is allowed for a specific Twitter handle
 */
export function isPersonaAllowedForHandle(personaKey: string, twitterHandle: string): boolean {
  const allowedPersonas = getAllowedPersonasForHandle(twitterHandle);
  return allowedPersonas.includes(personaKey);
}

/**
 * Check if a persona is allowed for a specific account (requires account lookup)
 */
export async function isPersonaAllowedForAccount(personaKey: string, accountId: string): Promise<boolean> {
  const allowedPersonas = await getAllowedPersonasForAccount(accountId);
  return allowedPersonas.includes(personaKey);
}

/**
 * Get random persona from handle's allowed personas
 */
export function getRandomPersonaForHandle(twitterHandle: string, personaKeys?: string[]): PersonaConfig {
  const allowedPersonas = getAllowedPersonasForHandle(twitterHandle);
  
  if (allowedPersonas.length === 0) {
    throw new Error(`No personas allowed for handle: ${twitterHandle}`);
  }
  
  let eligiblePersonas = allowedPersonas;
  if (personaKeys && personaKeys.length > 0) {
    eligiblePersonas = personaKeys.filter(key => allowedPersonas.includes(key));
  }
  
  if (eligiblePersonas.length === 0) {
    eligiblePersonas = allowedPersonas;
  }
  
  const randomKey = eligiblePersonas[Math.floor(Math.random() * eligiblePersonas.length)];
  const persona = getPersonaByKey(randomKey);
  
  if (!persona) {
    throw new Error(`Persona not found: ${randomKey}`);
  }
  
  return persona;
}

/**
 * Get random persona from account's allowed personas (requires account lookup)
 */
export async function getRandomPersonaForAccount(accountId: string, personaKeys?: string[]): Promise<PersonaConfig> {

  const account = await accountService.getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  return getRandomPersonaForHandle(account.twitter_handle, personaKeys);
}


export function getHashtagsForPersona(persona: PersonaConfig, variation = 0): string[] {
  return [];
}


/**
 * Get all available personas for any account (account-agnostic)
 */
export function getAllPersonas(): PersonaConfig[] {
  return PERSONAS;
}

// Legacy compatibility export with persona ID and emoji
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