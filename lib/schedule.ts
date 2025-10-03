/**
 * Enhanced Multi-Account Tweet Scheduling System
 * Each account has its own independent schedule with specific persona assignments and timing strategies.
 */

interface HourlySchedule {
  [hour: number]: string[];
}

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
type DailySchedule = Record<number, HourlySchedule>;

interface AccountSchedules {
  generation: DailySchedule;
  posting: DailySchedule;
  metadata: {
    strategy: string;
    target_audience: string;
    timezone_optimization: string;
    daily_post_target: number;
    generation_batches_per_day: number;
  };
}

/**
 * Gibbi English Learning Account Schedules
 * Focus: Global English learners across time zones
 */
const gibbiGenerationPattern: HourlySchedule = {
  6: ['english_vocab_builder'],         // Mid-morning generation
  13: ['english_vocab_builder'],        // Morning generation
  16: ['english_vocab_builder'],        // Evening generation
};

const gibbiPostingPattern: HourlySchedule = {
  7: ['english_vocab_builder'],         // Morning motivation
  9: ['english_vocab_builder'],         // Lunch break learning
  16: ['english_vocab_builder'],        // Post-work session
  18: ['english_vocab_builder'],        // Evening study prep
  20: ['english_vocab_builder'],        // Prime time engagement
  22: ['english_vocab_builder'],        // Night revision
};

/**
 * Prince Professional Account Schedules
 * Focus: Threading system optimized for Indian business storytelling
 * 5-minute interval support for thread progression
 */
const princeGenerationPattern: HourlySchedule = {
  8: ['satirist'],   // Morning satirical tweet generation
  16: ['business_storyteller'],  // Evening thread generation (randomized between business_storyteller/cricket_storyteller)
  20: ['satirist'],  // Late evening satirical tweet generation
};

const princePostingPattern: HourlySchedule = {
  7: ['satirist'],          // Morning satirical tweet posting
  9: ['satirist'],         // Lunch break satirical tweet posting
  16: ['satirist'],         // Afternoon satirical tweet posting
  19: ['satirist'],         // Afternoon satirical tweet posting
  20: ['business_storyteller'], // Prime time thread posting (randomized between business_storyteller/cricket_storyteller)
  21: ['satirist'],         // Late night satirical tweet posting
  22: ['satirist'],         // Late night satirical tweet posting
};

// Twitter handle mapping - maps twitter handles to schedule keys
const TWITTER_HANDLE_MAPPING: Record<string, string> = {
  '@gibbi_ai': 'gibbi_account',
  '@princediwakar25': 'prince_account',
};

// Reverse mapping - from schedule keys to twitter handles
const SCHEDULE_KEY_TO_HANDLE: Record<string, string> = {
  'gibbi_account': '@gibbi_ai',
  'prince_account': '@princediwakar25',
};

/**
 * Map twitter handle to schedule key
 */
function getScheduleKey(twitterHandle: string): string | undefined {
  return TWITTER_HANDLE_MAPPING[twitterHandle];
}

// Enhanced account-specific schedules with metadata and strategy information
const ACCOUNT_SCHEDULES: Record<string, AccountSchedules> = {
  gibbi_account: {
    generation: {
      0: gibbiGenerationPattern, // Sunday
      1: gibbiGenerationPattern, // Monday
      2: gibbiGenerationPattern, // Tuesday
      3: gibbiGenerationPattern, // Wednesday
      4: gibbiGenerationPattern, // Thursday
      5: gibbiGenerationPattern, // Friday
      6: gibbiGenerationPattern, // Saturday
    },
    posting: {
      0: gibbiPostingPattern, // Sunday
      1: gibbiPostingPattern, // Monday
      2: gibbiPostingPattern, // Tuesday
      3: gibbiPostingPattern, // Wednesday
      4: gibbiPostingPattern, // Thursday
      5: gibbiPostingPattern, // Friday
      6: gibbiPostingPattern, // Saturday
    },
    metadata: {
      strategy: 'Global English learners with consistent educational content across timezones',
      target_audience: 'English language learners worldwide (A2-C1 level)',
      timezone_optimization: 'Multiple timezone coverage for global reach',
      daily_post_target: 7,
      generation_batches_per_day: 6
    }
  },

  prince_account: {
    generation: {
      0: princeGenerationPattern, // Sunday
      1: princeGenerationPattern, // Monday
      2: princeGenerationPattern, // Tuesday
      3: princeGenerationPattern, // Wednesday
      4: princeGenerationPattern, // Thursday
      5: princeGenerationPattern, // Friday
      6: princeGenerationPattern, // Saturday
    },
    posting: {
      0: princePostingPattern, // Sunday
      1: princePostingPattern, // Monday
      2: princePostingPattern, // Tuesday
      3: princePostingPattern, // Wednesday
      4: princePostingPattern, // Thursday
      5: princePostingPattern, // Friday
      6: princePostingPattern, // Saturday
    },
    metadata: {
      strategy: 'Threading-optimized Indian business storytelling with 5-minute intervals',
      target_audience: 'Entrepreneurs, business leaders, startup enthusiasts (25-45 age group)',
      timezone_optimization: 'IST business hours with thread progression timing',
      daily_post_target: 7, // Increased for thread-heavy strategy
      generation_batches_per_day: 7 // More frequent generation for threading
    }
  }
};

/**
 * Get generation schedule for a specific account
 */
export function getGenerationSchedule(twitterHandle: string): DailySchedule {
  const scheduleKey = getScheduleKey(twitterHandle);
  if (!scheduleKey) {
    throw new Error(`No schedule mapping found for twitter handle: ${twitterHandle}`);
  }
  
  const schedules = ACCOUNT_SCHEDULES[scheduleKey];
  if (!schedules) {
    throw new Error(`No generation schedule found for twitter handle: ${twitterHandle} (scheduleKey: ${scheduleKey})`);
  }
  return schedules.generation;
}

/**
 * Get posting schedule for a specific account
 */
export function getPostingSchedule(twitterHandle: string): DailySchedule {
  const scheduleKey = getScheduleKey(twitterHandle);
  if (!scheduleKey) {
    throw new Error(`No schedule mapping found for twitter handle: ${twitterHandle}`);
  }
  
  const schedules = ACCOUNT_SCHEDULES[scheduleKey];
  if (!schedules) {
    throw new Error(`No posting schedule found for twitter handle: ${twitterHandle} (scheduleKey: ${scheduleKey})`);
  }
  return schedules.posting;
}

/**
 * Randomly selects between business_storyteller and cricket_storyteller for Prince's account
 * Returns the selected persona for daily thread generation
 */
function getRandomThreadPersonaForPrince(): string {
  const threadPersonas = ['business_storyteller', 'cricket_storyteller'];
  const randomIndex = Math.floor(Math.random() * threadPersonas.length);
  return threadPersonas[randomIndex];
}

/**
 * Get personas scheduled for generation at a specific time for an account
 */
export function getScheduledPersonasForGeneration(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number
): string[] {
  const schedule = getGenerationSchedule(twitterHandle);
  const daySchedule = schedule[dayOfWeek];
  let personas = daySchedule?.[hour] || [];
  
  // For Prince's account, randomize between thread personas
  if (twitterHandle === '@princediwakar25') {
    personas = personas.map(persona => {
      if (persona === 'business_storyteller' || persona === 'cricket_storyteller') {
        return getRandomThreadPersonaForPrince();
      }
      return persona;
    });
  }
  
  return personas;
}

/**
 * Get personas scheduled for posting at a specific time for an account
 */
export function getScheduledPersonasForPosting(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number
): string[] {
  const schedule = getPostingSchedule(twitterHandle);
  const daySchedule = schedule[dayOfWeek];
  let personas = daySchedule?.[hour] || [];
  
  // For Prince's account, randomize between thread personas
  if (twitterHandle === '@princediwakar25') {
    personas = personas.map(persona => {
      if (persona === 'business_storyteller' || persona === 'cricket_storyteller') {
        return getRandomThreadPersonaForPrince();
      }
      return persona;
    });
  }
  
  return personas;
}

/**
 * Check if generation is scheduled for an account at current time
 */
export function isGenerationScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const personas = getScheduledPersonasForGeneration(twitterHandle, dayOfWeek, hour);
  return personas.length > 0;
}

/**
 * Check if posting is scheduled for an account at current time
 */
export function isPostingScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const personas = getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour);
  return personas.length > 0;
}

/**
 * Get all available twitter handles with schedules
 */
export function getScheduledTwitterHandles(): string[] {
  return Object.values(SCHEDULE_KEY_TO_HANDLE);
}

/**
 * Get account metadata for scheduling strategy insights
 */
export function getAccountMetadata(twitterHandle: string): AccountSchedules['metadata'] | null {
  const scheduleKey = getScheduleKey(twitterHandle);
  if (!scheduleKey) {
    return null;
  }
  
  const schedules = ACCOUNT_SCHEDULES[scheduleKey];
  return schedules ? schedules.metadata : null;
}

/**
 * Get current scheduled activity for all accounts (for monitoring/debugging)
 */
export function getCurrentScheduledActivity(date: Date = new Date()): {
  twitterHandle: string;
  metadata: AccountSchedules['metadata'];
  generation_personas: string[];
  posting_personas: string[];
}[] {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  
  return getScheduledTwitterHandles().map(twitterHandle => {
    const generationPersonas = getScheduledPersonasForGeneration(twitterHandle, dayOfWeek, hour);
    const postingPersonas = getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour);
    const metadata = getAccountMetadata(twitterHandle)!;
    
    return {
      twitterHandle,
      metadata,
      generation_personas: generationPersonas,
      posting_personas: postingPersonas
    };
  });
}

/**
 * Check if an account should generate content at current time with batch size information
 * Inspired by YouTube system's intelligent batch management
 */
export function getGenerationBatchInfo(twitterHandle: string, date: Date = new Date(), debugMode: boolean = false): {
  should_generate: boolean;
  personas: string[];
  batch_size: number;
  account_strategy: string;
} {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  let personas = getScheduledPersonasForGeneration(twitterHandle, dayOfWeek, hour);
  const metadata = getAccountMetadata(twitterHandle);
  
  // In debug mode, provide default personas if none scheduled
  if (debugMode && personas.length === 0) {
    // Provide default personas based on account type using the twitter handle
    if (twitterHandle === '@gibbi_ai') {
      personas = ['english_vocab_builder'];
    } else if (twitterHandle === '@princediwakar25') {
      personas = ['business_storyteller', 'satirist', 'cricket_storyteller'];
    } else {
      // Generic default personas for unknown accounts
      personas = ['business_storyteller'];
    }
  }
  
  // Default batch size based on account type and scheduled personas
  let batchSize = 2; // Default
  if (metadata) {
    // Educational accounts (like Gibbi) generate more content per batch
    if (twitterHandle === '@gibbi_ai' || metadata.target_audience.includes('learners')) {
      batchSize = 3;
    }
    // Professional accounts generate focused content
    else if (metadata.target_audience.includes('entrepreneurs') || metadata.target_audience.includes('professionals')) {
      batchSize = 2;
    }
  }
  
  // In debug mode, always allow generation if we have personas
  const shouldGenerate = debugMode ? personas.length > 0 : personas.length > 0;
  
  return {
    should_generate: shouldGenerate,
    personas,
    batch_size: batchSize,
    account_strategy: metadata?.strategy || 'Unknown strategy'
  };
}

/**
 * Get posting eligibility with intelligent rate limiting
 * Inspired by YouTube system's account-aware posting logic
 */
export function getPostingEligibility(twitterHandle: string, date: Date = new Date()): {
  should_post: boolean;
  personas: string[];
  max_posts_this_hour: number;
  account_strategy: string;
} {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const personas = getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour);
  const metadata = getAccountMetadata(twitterHandle);
  
  // Intelligent posting limits based on account strategy
  let maxPostsThisHour = 1; // Conservative default
  if (metadata) {
    // Educational accounts can post more frequently during peak learning times
    if (twitterHandle === '@gibbi_ai') {
      // Peak learning hours (7-9, 12-14, 18-22)
      if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 22)) {
        maxPostsThisHour = 2;
      }
    }
    // Professional accounts focus on business hours
    else if (metadata.target_audience.includes('professionals')) {
      // Business hours (8-18)
      if (hour >= 8 && hour <= 18) {
        maxPostsThisHour = 1;
      }
    }
  }
  
  return {
    should_post: personas.length > 0,
    personas,
    max_posts_this_hour: maxPostsThisHour,
    account_strategy: metadata?.strategy || 'Unknown strategy'
  };
}

/**
 * Advanced scheduling insights for monitoring and optimization
 */
export function getSchedulingInsights(): {
  total_accounts: number;
  accounts_with_metadata: number;
  daily_targets: Record<string, number>;
  generation_strategies: Record<string, string>;
  current_activity_summary: string;
} {
  const twitterHandles = getScheduledTwitterHandles();
  const now = new Date();
  const currentActivity = getCurrentScheduledActivity(now);
  
  const dailyTargets: Record<string, number> = {};
  const generationStrategies: Record<string, string> = {};
  
  twitterHandles.forEach(twitterHandle => {
    const metadata = getAccountMetadata(twitterHandle);
    if (metadata) {
      dailyTargets[twitterHandle] = metadata.daily_post_target;
      generationStrategies[twitterHandle] = metadata.strategy;
    }
  });
  
  const activeAccounts = currentActivity.filter(
    a => a.generation_personas.length > 0 || a.posting_personas.length > 0
  );
  
  return {
    total_accounts: twitterHandles.length,
    accounts_with_metadata: Object.keys(dailyTargets).length,
    daily_targets: dailyTargets,
    generation_strategies: generationStrategies,
    current_activity_summary: `${activeAccounts.length} accounts active at ${now.getHours()}:00`
  };
}

// Export types
export type { HourlySchedule, DailySchedule, AccountSchedules };