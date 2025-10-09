/**
 * Enhanced Multi-Account Tweet Scheduling System
 * * FINAL OPTIMIZATION BASED ON TWITTER ENGAGEMENT RATES (IST & Global) *
 * * - Satirist (News/Hot Take): Posts mid-morning for commute/work-start scroll.
 * - Storyteller (Thread): Posts prime-time (8 PM IST) for maximum long-form consumption.
 * - Gibbi (Education): Retains global spread with multiple peak slots.
 */

interface HourlySchedule {
  [hour: number]: string[];
}

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
type DailySchedule = Record<number, HourlySchedule>;

interface AccountSchedules {
  generation: DailySchedule;
  posting: DailySchedule;
  engagement?: DailySchedule; // + Added optional engagement schedule
  metadata: {
    strategy: string;
    target_audience: string;
    timezone_optimization: string;
    daily_post_target: number;
    generation_batches_per_day: number;
  };
}

/**
 * Gibbi English Learning Account Schedules (Global Focus)
 * Frequency: High (5 posts/day)
 */
const gibbiGenerationPattern: HourlySchedule = {
  8: ['english_vocab_builder'],        // Mid-day generation
  11: ['english_vocab_builder'],        // Afternoon generation
  16: ['english_vocab_builder'],        // Afternoon generation
  19: ['english_vocab_builder'],        // Afternoon generation
  21: ['english_vocab_builder'],        // Afternoon generation
};

const gibbiPostingPattern: HourlySchedule = {
  9: ['english_vocab_builder'],         // Morning (Asia/Europe commute)
  12: ['english_vocab_builder'],        // Lunch break (Global)
  17: ['english_vocab_builder'],        // Afternoon (US East Coast morning)
  20: ['english_vocab_builder'],        // Prime time (IST)
  22: ['english_vocab_builder'],        // Late Night (US West Coast evening)
};

/**
 * Prince Professional Account Schedules (IST Focus)
 * Frequency: Low (2 posts/day max) for high quality/long-form content
 */

// Thread A: Business Storyteller
const THREAD_A = 'business_storyteller'; 
// Thread B: Cricket Storyteller
const THREAD_B = 'cricket_storyteller';

const princeGenerationPattern: DailySchedule = {
  // Generation: Shifted Satirist generation later for the freshest news
  0: { 8: ['satirist'], 16: [THREAD_A] }, // Sunday: Business
  1: { 8: ['satirist'], 16: [THREAD_B] }, // Monday: Cricket
  2: { 8: ['satirist'], 16: [THREAD_A] }, // Tuesday: Business (Peak Engagement Day)
  3: { 8: ['satirist'], 16: [THREAD_B] }, // Wednesday: Cricket (Peak Engagement Day)
  4: { 8: ['satirist'], 16: [THREAD_A] }, // Thursday: Business
  5: { 8: ['satirist'], 16: [THREAD_B] }, // Friday: Cricket
  6: { 8: ['satirist'], 16: [THREAD_A] }, // Saturday: Business (Weekend high activity)
};

const princePostingPattern: DailySchedule = {
  // Posting: Optimized for Satire (Morning) and Thread (Prime Time)
  0: { 9: ['satirist'], 20: [THREAD_A] }, // Sunday
  1: { 9: ['satirist'], 20: [THREAD_B] }, // Monday
  2: { 9: ['satirist'], 20: [THREAD_A] }, // Tuesday
  3: { 9: ['satirist'], 20: [THREAD_B] }, // Wednesday
  4: { 9: ['satirist'], 20: [THREAD_A] }, // Thursday
  5: { 9: ['satirist'], 20: [THREAD_B] }, // Friday
  6: { 9: ['satirist'], 20: [THREAD_A] }, // Saturday
};


const princeEngagementPattern: HourlySchedule = {
  9: ['engagement'],   // Morning window: 9:00, 9:15, 9:30, 9:45
  10: ['engagement'],   // Morning window: 10:00, 10:15, 10:30, 10:45
  11: ['engagement'],   // Morning window 11:00,119:15, 11:30, 11:45
  20: ['engagement'],   // Evening window: 20:00, 20:15, 20:30, 20:45
  21: ['engagement']   // Evening window: 21:00, 21:15, 21:30, 21:45
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
 * Handles both @username and username formats
 */
function getScheduleKey(twitterHandle: string): string | undefined {
  // Normalize the handle by ensuring it starts with @
  const normalizedHandle = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`;
  return TWITTER_HANDLE_MAPPING[normalizedHandle];
}

// Enhanced account-specific schedules with metadata and strategy information
const ACCOUNT_SCHEDULES: Record<string, AccountSchedules> = {
  gibbi_account: {
    generation: {
      0: gibbiGenerationPattern,
      1: gibbiGenerationPattern,
      2: gibbiGenerationPattern,
      3: gibbiGenerationPattern,
      4: gibbiGenerationPattern,
      5: gibbiGenerationPattern,
      6: gibbiGenerationPattern,
    },
    posting: {
      0: gibbiPostingPattern,
      1: gibbiPostingPattern,
      2: gibbiPostingPattern,
      3: gibbiPostingPattern,
      4: gibbiPostingPattern,
      5: gibbiPostingPattern,
      6: gibbiPostingPattern,
    },
    metadata: {
      strategy: 'Global English learners with frequent educational content (5x daily) during global peak learning hours.',
      target_audience: 'English language learners worldwide (A2-C1 level)',
      timezone_optimization: 'Multiple global peaks (IST Morning, Global Lunch, US Evening)',
      daily_post_target: 5, // Reduced from 7 for higher quality/less noise
      generation_batches_per_day: 2 // Two focused generation runs
    }
  },

  prince_account: {
    generation: princeGenerationPattern,
    posting: princePostingPattern,
    engagement: {
      0: princeEngagementPattern, // Sunday
      1: princeEngagementPattern, // Monday
      2: princeEngagementPattern, // Tuesday
      3: princeEngagementPattern, // Wednesday
      4: princeEngagementPattern, // Thursday
      5: princeEngagementPattern, // Friday
      6: princeEngagementPattern, // Saturday
    },
    metadata: {
      strategy: 'High-impact, low-frequency posting: Satire (Morning) and Alternating Threads (Prime Time). Max 2 content pieces/day.',
      target_audience: 'Entrepreneurs, business leaders, startup enthusiasts (25-45 age group)',
      timezone_optimization: 'IST peak commute (10 AM) and IST prime-time (8 PM) for thread consumption.',
      daily_post_target: 2, // 1 Satirist + 1 Thread = 2 high-value content slots
      generation_batches_per_day: 2 // One for Satire, One for Thread
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
 * Get personas scheduled for generation at a specific time for an account
 */
export function getScheduledPersonasForGeneration(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number
): string[] {
  const schedule = getGenerationSchedule(twitterHandle);
  const daySchedule = schedule[dayOfWeek];
  const personas = daySchedule?.[hour] || [];
  
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
  const personas = daySchedule?.[hour] || [];
  

  
  return personas;
}

/**
 * Check if generation is scheduled for an account at current time
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function isGenerationScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  const personas = getScheduledPersonasForGeneration(twitterHandle, dayOfWeek, hour);
  return personas.length > 0;
}

/**
 * Check if posting is scheduled for an account at current time
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function isPostingScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  const personas = getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour);
  return personas.length > 0;
}



// +++ New Engagement Schedule Functions +++

/**
 * Get engagement schedule for a specific account
 */
export function getEngagementSchedule(twitterHandle: string): DailySchedule {
  const scheduleKey = getScheduleKey(twitterHandle);
  if (!scheduleKey) {
    // Return empty schedule if no mapping found
    return {};
  }
  
  const schedules = ACCOUNT_SCHEDULES[scheduleKey];
  return schedules?.engagement || {};
}

/**
 * Check if engagement is scheduled for an account at current time
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function isEngagementScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  const schedule = getEngagementSchedule(twitterHandle);
  const daySchedule = schedule[dayOfWeek];

  // Check if the 'engagement' task is listed for the current hour
  return daySchedule?.[hour]?.includes('engagement') || false;
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
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function getCurrentScheduledActivity(date: Date = new Date()): {
  twitterHandle: string;
  metadata: AccountSchedules['metadata'];
  generation_personas: string[];
  posting_personas: string[];
}[] {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  
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
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function getGenerationBatchInfo(twitterHandle: string, date: Date = new Date(), debugMode: boolean = false): {
  should_generate: boolean;
  personas: string[];
  batch_size: number;
  account_strategy: string;
} {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  let personas = getScheduledPersonasForGeneration(twitterHandle, dayOfWeek, hour);
  const metadata = getAccountMetadata(twitterHandle);
  
  // In debug mode, provide default personas if none scheduled
  if (debugMode && personas.length === 0) {
    if (twitterHandle === '@gibbi_ai') {
      personas = ['english_vocab_builder'];
    } else if (twitterHandle === '@princediwakar25') {
      personas = ['business_storyteller', 'cricket_storyteller'];
    }
  }
  
  let batchSize = 1; // Default for threads
  if (metadata) {
    if (twitterHandle === '@gibbi_ai' || metadata.target_audience.includes('learners')) {
      batchSize = 1; // Educational content can be batched larger
    } else if (twitterHandle === '@princediwakar25') {
      // If the scheduled persona is Satirist, only generate one post
      if (personas.length === 1 && personas[0] === 'satirist') {
          batchSize = 1; 
      } else if (personas.length === 1 && (personas[0] === THREAD_A || personas[0] === THREAD_B)) {
          batchSize = 1; // Only one thread template per generation run
      } else {
          batchSize = 1; // Fallback for multi-persona/topic runs (rare in optimized schedule)
      }
    }
  }
  
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
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function getPostingEligibility(twitterHandle: string, date: Date = new Date()): {
  should_post: boolean;
  personas: string[];
  max_posts_this_hour: number;
  account_strategy: string;
} {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  const personas = getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour);
  const metadata = getAccountMetadata(twitterHandle);
  
  let maxPostsThisHour = 1; // Conservative default
  if (metadata) {
    if (twitterHandle === '@gibbi_ai') {
      // Educational posts are frequent but short. Max 2 posts to allow catch-up.
      maxPostsThisHour = personas.length > 0 ? 2 : 1; 
    } else if (metadata.target_audience.includes('professionals')) {
      // Only 1 main content piece (single satirist tweet OR a thread start) is allowed per hour slot.
      maxPostsThisHour = 1; 
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