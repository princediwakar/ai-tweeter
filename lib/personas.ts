/**
 * English Learning Persona System with Comprehensive Topic Coverage
 * Designed for engaging English language learning content generation
 */

// Represents a topic/subcategory in the persona hierarchy
interface PersonaTopic {
  key: string;
  displayName: string;
}

// Defines the structure for personas with detailed topic breakdown
export interface PersonaConfig {
  key: string;
  displayName: string;
  description: string;
  topics: PersonaTopic[];
  prompt_template?: string; // Custom prompt template for this persona
  hashtag_sets?: string[][]; // Different hashtag sets for variety
  content_types?: ('single_tweet' | 'thread')[]; // Supported content types
  thread_templates?: string[]; // Available thread templates for this persona
  image_generation?: {
    enabled: boolean;
    unsplash_query?: string;
  }; // Image generation configuration
}

export const VOCABULARY_BUILDER: PersonaConfig = {
  key: 'english_vocab_builder',
  displayName: 'Vocabulary Builder 🏆',
  description: 'Master new words, meanings, and usage in engaging ways',
  image_generation: {
    enabled: true,
    unsplash_query: 'white background'
  },
  // MODIFIED: Comprehensive vocabulary topics for competitive exam preparation
  topics: [
    // Core Categories
    { key: 'eng_vocab_professional', displayName: 'Professional Vocabulary' },
    { key: 'eng_vocab_academic', displayName: 'Academic Words' },
    { key: 'eng_vocab_sophisticated', displayName: 'Sophisticated Daily Words' },
    { key: 'eng_vocab_business', displayName: 'Business Communication' },
    { key: 'eng_vocab_descriptive', displayName: 'Descriptive Adjectives' },
    { key: 'eng_vocab_action', displayName: 'Powerful Action Words' },
    { key: 'eng_vocab_emotions', displayName: 'Emotion & Feeling Words' },
    { key: 'eng_vocab_formal', displayName: 'Formal Writing Words' },
    { key: 'eng_vocab_alternatives', displayName: 'Better Word Alternatives' },
    { key: 'eng_vocab_intellectual', displayName: 'Intellectual Discourse' },
    
    // Competitive Exam Categories
    { key: 'eng_vocab_gre_advanced', displayName: 'GRE Advanced Vocabulary' },
    { key: 'eng_vocab_gmat_precision', displayName: 'GMAT Precision Words' },
    { key: 'eng_vocab_upsc_governance', displayName: 'UPSC Governance & Policy Terms' },
    { key: 'eng_vocab_ielts_academic', displayName: 'IELTS Academic Writing' },
    { key: 'eng_vocab_toefl_scholarly', displayName: 'TOEFL Scholarly Discourse' },
    
    // Specialized Advanced Categories
    { key: 'eng_vocab_etymology_roots', displayName: 'Etymology & Word Roots' },
    { key: 'eng_vocab_literary_advanced', displayName: 'Literary & Nuanced Words' },
    { key: 'eng_vocab_scientific_discourse', displayName: 'Scientific & Technical Terms' },
    { key: 'eng_vocab_philosophical', displayName: 'Philosophical & Abstract Concepts' },
    { key: 'eng_vocab_rare_sophisticated', displayName: 'Rare but Useful Words' },
    
    // Contextual Categories
    { key: 'eng_vocab_debate_rhetoric', displayName: 'Debate & Rhetorical Terms' },
    { key: 'eng_vocab_critical_analysis', displayName: 'Critical Analysis Vocabulary' },
    { key: 'eng_vocab_research_methodology', displayName: 'Research & Methodology Terms' },
    { key: 'eng_vocab_policy_administration', displayName: 'Policy & Administration' }
  ]
};


// Satirist persona for Prince's account (single tweets only)
export const SATIRIST: PersonaConfig = {
  key: 'satirist',
  displayName: 'Satirist 😏',
  description: 'Witty and satirical observations about current events, politics, business, and social trends',
  content_types: ['single_tweet'],
  topics: [
    // Indian Domestic Politics & Society (Primary Focus)
    { key: 'political_satire', displayName: 'Indian Political Drama' },
    { key: 'current_events_humor', displayName: 'Indian Current Events' },
    { key: 'business_news_irony', displayName: 'Indian Business & Startup Scene' },
    { key: 'social_trends_comedy', displayName: 'Indian Social Media & Trends' },
    { key: 'bollywood_politics_satire', displayName: 'Bollywood Meets Politics' },
    { key: 'indian_bureaucracy_humor', displayName: 'Indian Bureaucracy & Governance' },
    { key: 'economic_policies_satire', displayName: 'Indian Economic Policies & RBI' },
    { key: 'sports_politics_india', displayName: 'Indian Sports & Politics' },
    
    // India-Centric Geopolitics (Strategic Relations)
    { key: 'india_us_relations', displayName: 'India-US Strategic Partnership' },
    { key: 'india_china_tensions', displayName: 'India-China Border & Trade' },
    { key: 'india_pakistan_dynamics', displayName: 'India-Pakistan Relations' },
    { key: 'india_russia_ties', displayName: 'India-Russia Strategic Relations' },
    { key: 'india_israel_partnership', displayName: 'India-Israel Defense & Tech' },
    { key: 'india_middle_east', displayName: 'India-Middle East Energy & Diaspora' },
    { key: 'india_global_south', displayName: 'India & Global South Leadership' },
    { key: 'quad_brics_diplomacy', displayName: 'QUAD vs BRICS Balancing Act' },
  ],
  hashtag_sets: [
    ['#PoliticalSatire', '#CurrentEvents', '#NewsHumor', '#Satire'],
    ['#IndianPolitics', '#NewsCommentary', '#Reality', '#Truth'],
    ['#BusinessNews', '#NewsSatire', '#MediaHumor', '#Irony'],
    ['#SocialTrends', '#NewsParody', '#Commentary', '#Humor'],
    ['#PoliticalHumor', '#NewsAbsurdity', '#SatiricalNews', '#WittyTakes']
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
    { key: 'founder_stories', displayName: 'Founder Journey Stories' },
    { key: 'produce_stories', displayName: 'Product Journey Stories' },
    { key: 'business_decisions', displayName: 'Strategic Business Decisions' },
    { key: 'market_disruption', displayName: 'Market Disruption Stories' },
    { key: 'crisis_management', displayName: 'Crisis Leadership Stories' },
    { key: 'cultural_business', displayName: 'Cultural Adaptation in Business' },
    { key: 'succession_planning', displayName: 'Business Succession Stories' },
    { key: 'innovation_breakthroughs', displayName: 'Innovation Breakthrough Stories' },
    
    // Tech Stories from India
    { key: 'indian_tech_unicorns', displayName: 'Indian Tech Unicorns & Scaling Stories' },
    { key: 'indian_tech_pioneers', displayName: 'Indian Tech Pioneers & Early Internet' },
    { key: 'fintech_revolution_india', displayName: 'FinTech Revolution in India' },
    { key: 'edtech_transformation', displayName: 'EdTech Transformation Stories' },
    { key: 'ecommerce_battles_india', displayName: 'E-commerce Wars & Market Battles' },
    { key: 'digital_payments_upi', displayName: 'Digital Payments & UPI Revolution' },
    { key: 'saas_india_global', displayName: 'Indian SaaS Going Global' },
    { key: 'gaming_content_creators', displayName: 'Gaming & Content Creator Economy' },
    { key: 'deep_tech_ai_india', displayName: 'Deep Tech & AI Innovation in India' },
    { key: 'space_tech_startups', displayName: 'Space Tech & NewSpace Startups' },
    
    // Global Tech Stories
    { key: 'silicon_valley_legends', displayName: 'Silicon Valley Origin Stories' },
    { key: 'big_tech_evolution', displayName: 'Big Tech Company Evolution' },
    { key: 'startup_ecosystem_global', displayName: 'Global Startup Ecosystem Stories' },
    { key: 'tech_disruption_industries', displayName: 'Tech Disrupting Traditional Industries' },
    { key: 'crypto_blockchain_stories', displayName: 'Crypto & Blockchain Revolution' },
    { key: 'ai_ml_breakthrough', displayName: 'AI/ML Breakthrough Moments' },
    { key: 'social_media_impact', displayName: 'Social Media Platform Stories' },
    { key: 'mobile_revolution', displayName: 'Mobile & App Revolution Stories' },
    { key: 'cloud_computing_shift', displayName: 'Cloud Computing Transformation' },
    { key: 'cybersecurity_battles', displayName: 'Cybersecurity & Digital Warfare' }
  ],
  hashtag_sets: [
    ['#IndianBusiness', '#Entrepreneurship', '#StartupStories', '#Leadership'],
    ['#BusinessHistory', '#Founders', '#Strategy', '#Innovation'],
    ['#TataGroup', '#Reliance', '#BusinessLessons', '#Success'],
    ['#StartupIndia', '#Jugaad', '#BusinessWisdom', '#Founders'],
    ['#FamilyBusiness', '#Succession', '#Legacy', '#Vision'],
    ['#BusinessDecisions', '#CrisisLeadership', '#MarketDisruption', '#Growth'],
    ['#TechStories', '#IndianTech', '#Innovation', '#StartupEcosystem'],
    ['#Unicorns', '#TechFounders', '#ScaleUp', '#DigitalIndia'],
    ['#FinTech', '#UPI', '#DigitalPayments', '#TechRevolution'],
    ['#GlobalTech', '#SiliconValley', '#TechDisruption', '#AI'],
    ['#SaaS', '#TechExport', '#IndianSaaS', '#GlobalMarket']
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
    'entertainment_cricket_drama',
    'personal_battle_public_stage',
    'leadership_personality_clash',
    'legacy_beyond_boundaries'
  ],
  topics: [
    { key: 'character_through_cricket', displayName: 'Character Revealed Through Cricket' },
    { key: 'pressure_psychology', displayName: 'Psychology of Pressure Moments' },
    { key: 'cricket_personalities', displayName: 'Larger-than-Life Cricket Personalities' },
    { key: 'personal_battles_cricket', displayName: 'Personal Battles on Cricket Stage' },
    { key: 'cricket_life_lessons', displayName: 'Life Lessons Through Cricket' },
    { key: 'entertainment_cricket', displayName: 'Cricket as Entertainment & Drama' },
    { key: 'rivalry_psychology', displayName: 'Psychology of Cricket Rivalries' },
    { key: 'cultural_impact_cricket', displayName: 'Cultural Impact Beyond Cricket' }
  ],
  hashtag_sets: [
    ['#Cricket', '#HumanStories', '#Character', '#Psychology'],
    ['#CricketPersonalities', '#LifeLessons', '#Drama', '#Cricket'],
    ['#CricketLegends', '#HumanNature', '#Pressure', '#Stories'],
    ['#CricketPhilosophy', '#Entertainment', '#Personality', '#Cricket'],
    ['#SportsPsychology', '#CricketDrama', '#Inspiration', '#Cricket'],
    ['#CricketCulture', '#IconicMoments', '#HumanBehavior', '#Cricket']
  ]
};

// Active personas optimized for current multi-account strategy
export const PERSONAS: PersonaConfig[] = [
  SATIRIST,
  BUSINESS_STORYTELLER,
  CRICKET_STORYTELLER,
  VOCABULARY_BUILDER, 
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

// Content distribution by weight (equal distribution)
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
  // Import here to avoid circular dependency
  const { getAccount } = await import('./db');
  
  try {
    const account = await getAccount(accountId);
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
  
  // If specific persona keys requested, filter by allowed personas
  let eligiblePersonas = allowedPersonas;
  if (personaKeys && personaKeys.length > 0) {
    eligiblePersonas = personaKeys.filter(key => allowedPersonas.includes(key));
  }
  
  if (eligiblePersonas.length === 0) {
    // Fall back to any allowed persona for this handle
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
  // Import here to avoid circular dependency
  const { getAccount } = await import('./db');
  
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }
  
  return getRandomPersonaForHandle(account.twitter_handle, personaKeys);
}


export function getHashtagsForPersona(persona: PersonaConfig, variation = 0): string[] {
  if (!persona.hashtag_sets || persona.hashtag_sets.length === 0) {
    // Generate default hashtags for active personas (including tech stories)
    const defaultHashtags: Record<string, string[]> = {
      english_vocab_builder: ['#EnglishLearning', '#Vocabulary', '#WordPower', '#Learning'],
      satirist: ['#StartupLife', '#TechHumor', '#BusinessReality', '#Satire'],
      business_storyteller: ['#IndianBusiness', '#Entrepreneurship', '#TechStories', '#Leadership'],
      cricket_storyteller: ['#Cricket', '#HumanStories', '#Character', '#Psychology']
    };
    
    return defaultHashtags[persona.key] || ['#Content', '#Learning', '#Growth', '#Tips'];
  }
  
  const setIndex = variation % persona.hashtag_sets.length;
  return persona.hashtag_sets[setIndex];
}


/**
 * Get all available personas for any account (account-agnostic)
 */
export function getAllPersonas(): PersonaConfig[] {
  return PERSONAS;
}

// Legacy compatibility export with a more robust emoji fallback
export const personas = PERSONAS.map(p => {
  const emojiMatch = p.displayName.match(/\p{Emoji}/u);
  return {
      id: p.key,
      name: p.displayName,
      emoji: emojiMatch ? emojiMatch[0] : '🗣️', // Safer emoji extraction
      description: p.description,
  };
});

export default PERSONAS;