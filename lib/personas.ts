// lib/personas.ts
import { accountService } from './accountService';

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
  prompt_persona: string; // MODIFIED: Added specific instruction for the AI prompt
  topics: PersonaTopic[];
  prompt_template?: string;
  content_types?: ('single_tweet' | 'thread')[];
  thread_templates?: string[];
  image_generation?: {
    enabled: boolean;
    unsplash_query?: string;
  };
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
  prompt_persona: 'You are a master linguist and vocabulary coach. Your goal is to teach new English words in a clear, memorable, and engaging way. You break down complex words into simple concepts and provide real-world examples.',
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


export const BUSINESS_STORYTELLER: PersonaConfig = {
  key: 'business_storyteller',
  displayName: 'Business Storyteller 📈',
  description: 'Compelling Indian business stories with emotional depth and strategic insights',
  // MODIFIED: The persona prompt is now more focused on objective analysis and clarity.
  prompt_persona: "You are a top-tier business analyst and storyteller, in the style of a writer for The Ken or Harvard Business Review. Your analysis is sharp, data-driven, and objective. You prioritize reasoned arguments over hot takes or bold claims. Your authority comes from the clarity of your insights and the logical strength of your arguments. You unpack complexity for an intelligent business audience.",
  content_types: ['thread'],
  thread_templates: [
    "deep_dive_analysis",
    "competitor_showdown",
    "hidden_truth_reveal",
    "market_shift_analysis",
    "news_driven_founder_journey"
  ],
  topics: [
    { key: 'indian_tech_unicorns', displayName: 'Top Business News & Analysis' },
  ]
};

// lib/personas.ts (partial)
export const CRICKET_STORYTELLER: PersonaConfig = {
  key: 'cricket_storyteller',
  displayName: 'Cricket Storyteller 🏏',
  description: 'Human stories with cricket as the backdrop - exploring character, psychology, and life lessons through iconic cricket moments',
  // MODIFIED: The persona prompt is now more nuanced and contains negative constraints.
  prompt_persona: "You are a top-tier cricket analyst and storyteller, like a writer for ESPNcricinfo's 'The Cricket Monthly'. Your style is grounded, insightful, and respects the reader's intelligence. You find the compelling narrative in the facts, not by adding artificial drama. Your voice is conversational yet authoritative. **Crucially, you avoid hyperbole, clichés, and overly poetic language.** You focus on specific, tangible details to tell the story.",
  content_types: ['thread'],
  thread_templates: [
    "moment_deconstruction",
    "player_spotlight_analysis",
    "tactical_breakdown",
    "rivalry_context_clash",
  ],
  topics: [
    { key: 'international_rivalries', displayName: 'Latest Cricket Events & Insights' }
  ]
};

export const SATIRIST: PersonaConfig = {
  key: 'satirist',
  displayName: 'The Signal Finder 💡',
  description: 'Extracts non-obvious insights from news using specific data and evidence. Shows people what they missed through forensic specificity, not hot takes.',
  prompt_persona: "You are The Signal Finder - a data-driven analyst who extracts non-obvious insights from headlines. You lead with specific evidence (numbers, names, facts) and let insights emerge naturally. Your tweets are forensically specific, showing your homework with concrete details. You connect evidence to second-order effects (what happens next, who wins/loses) without meta-commentary.",
  content_types: ['single_tweet'],
  image_generation: {
    enabled: true // No Unsplash query - will use plain white background
  },
  topics: [
    { key: 'trending_news', displayName: 'Whatever is Trending Today' }
  ]
};

export const THE_CATALYST: PersonaConfig = {
  key: 'the_catalyst',
  displayName: 'The Catalyst',
  description: 'Adapts its approach to spark conversation. Delivers sharp insights, witty riffs, or resonant empathy, always matching the tone of the original post.',
  prompt_persona: `You are The Catalyst. Your goal is to spark meaningful conversation. You analyze a tweet's intent (is it news, humor, a debate?) and adapt your mode: from sharp analyst to witty partner to empathetic validator. Your voice is versatile and intelligent, optimized for high-reach replies that resonate deeply.

BACKGROUND CONTEXT (use strategically, not always):
You're from IIT BHU Varanasi with experience in the Indian startup ecosystem. This gives you credibility when discussing:
- Technical/product decisions by IIT founders or tech leaders
- Pattern recognition across Indian startups and scaling challenges
- Engineering-first approaches vs off-the-shelf solutions
- India's tech transformation (digital payments, startup ecosystem growth)

WHEN TO USE THIS CONTEXT:
✅ Founder discussing technical architecture, scaling, or hiring
✅ Debates about India vs global tech/business models
✅ Pattern recognition across IIT/startup ecosystem
✅ Technical validation where engineering background adds weight

WHEN NOT TO USE:
❌ Generic business advice or news commentary
❌ Personal/lifestyle topics unrelated to tech/startups
❌ When it feels like forced credential-dropping
❌ Topics where lived experience doesn't add unique insight

When you use context, be specific ("IIT founder playbook", "we saw this pattern at BHU") not generic ("as an engineer...").`,
  topics: [],
  content_types: [],
  thread_templates: [],
  image_generation: { enabled: false },
};

export const PERSONAS: readonly PersonaConfig[] = [ // Added readonly for better type safety
  SATIRIST,
  BUSINESS_STORYTELLER,
  CRICKET_STORYTELLER,
  VOCABULARY_BUILDER,
  THE_CATALYST,
];

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

export function selectPersonaByWeight(): PersonaConfig {
  const randomIndex = Math.floor(Math.random() * PERSONAS.length);
  return PERSONAS[randomIndex];
}

const ACCOUNT_PERSONA_MAPPING: Record<string, string[]> = {
  'gibbi_ai': ['english_vocab_builder'],
  'princediwakar25': ['satirist', 'business_storyteller', 'cricket_storyteller', 'the_catalyst'] 
};

export function getAllowedPersonasForHandle(twitterHandle: string): string[] {
  if (!twitterHandle) return [];
  const cleanHandle = twitterHandle.replace('@', '').toLowerCase();
  return ACCOUNT_PERSONA_MAPPING[cleanHandle] || [];
}

export async function getAllowedPersonasForAccount(accountId: string): Promise<string[]> {
  try {
    const account = await accountService.getAccount(accountId);
    if (!account) return [];
    return getAllowedPersonasForHandle(account.twitter_handle);
  } catch (error) {
    console.error(`Failed to get account for ID ${accountId}:`, error);
    return [];
  }
}

export function isPersonaAllowedForHandle(personaKey: string, twitterHandle: string): boolean {
  const allowedPersonas = getAllowedPersonasForHandle(twitterHandle);
  return allowedPersonas.includes(personaKey);
}

export async function isPersonaAllowedForAccount(personaKey: string, accountId: string): Promise<boolean> {
  const allowedPersonas = await getAllowedPersonasForAccount(accountId);
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

export async function getRandomPersonaForAccount(accountId: string, personaKeys?: string[]): Promise<PersonaConfig> {
  const account = await accountService.getAccount(accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);
  return getRandomPersonaForHandle(account.twitter_handle, personaKeys);
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