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
  linkedin_posting?: DailySchedule; // + LinkedIn cross-posting schedule
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
  // Strategy: Focused on Tue-Thu peaks; removed weekends. Total: 12 satirist, 3 pattern_spotter, 1 thread/week
  0: {}, // Sunday - cricket thread
  1: { 8: ['satirist'], 12: ['satirist'] }, // Monday - lighter mornings
  2: { 8: ['satirist'], 12: ['satirist'], 18: [THREAD_A] }, // Tuesday - full day + evening thread
  3: { 8: ['satirist'], 12: ['satirist'], 11: ['pattern_spotter'] }, // Wednesday - morning heavy
  4: { 8: ['satirist'], 12: ['satirist'], 11: ['pattern_spotter'] }, // Thursday - morning heavy
  5: { 8: ['satirist'], 12: ['pattern_spotter'] }, // Friday - lighter
  6: {}, // Saturday - removed for focus
};

const princePostingPattern: DailySchedule = {
  // Posting: 9-10 AM mornings, 1 PM afternoons (Tue-Thu emphasis). Thread Tue 7 PM prime.
  0: {}, // Sunday - cricket thread
  1: { 9: ['satirist'], 13: ['satirist'] }, // Monday
  2: { 9: ['satirist'], 13: ['satirist'], 19: [THREAD_A] }, // Tuesday
  3: { 10: ['satirist'], 12: ['satirist'], 13: ['pattern_spotter'] }, // Wednesday
  4: { 10: ['satirist'], 12: ['satirist'], 13: ['pattern_spotter'] }, // Thursday
  5: { 9: ['satirist'], 13: ['pattern_spotter'] }, // Friday
  6: {}, // Saturday - no posts
};

const princeEngagementPattern: HourlySchedule = {
  9: ['engagement'],  // Morning: 9-11 AM window
  10: ['engagement'],
  19: ['engagement']  // Evening: 7-8 PM for threads/replies
};



/**
 * Optimized Prince LinkedIn Posting Schedule
 * Strategy: Tue-Thu heavy in pro windows; Mon/Fri lighter. Total: 10-12 posts/week for algorithm sweet spot.
 * No weekends; evenings minimized as mornings drive 2x views.
 */
const princeLinkedInPostingPattern: DailySchedule = {
  0: {}, // Sunday - none
  1: { 10: ['satirist'], 13: ['satirist'] }, // Monday - mornings/afternoons
  2: { 10: ['satirist'], 12: ['satirist'], 15: ['pattern_spotter'] }, // Tuesday - full pro day
  3: { 10: ['satirist'], 12: ['satirist'], 15: ['pattern_spotter'] }, // Wednesday - full pro day
  4: { 10: ['satirist'], 12: ['satirist'], 15: ['pattern_spotter'] }, // Thursday - full pro day
  5: { 9: ['satirist'], 13: ['pattern_spotter'] }, // Friday - lighter
  6: {}, // Saturday - none
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
    linkedin_posting: princeLinkedInPostingPattern,
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
 * Get LinkedIn posting schedule for a specific account
 */
export function getLinkedInPostingSchedule(twitterHandle: string): DailySchedule {
  const scheduleKey = getScheduleKey(twitterHandle);
  if (!scheduleKey) {
    return {};
  }

  const schedules = ACCOUNT_SCHEDULES[scheduleKey];
  return schedules?.linkedin_posting || {};
}

/**
 * Get personas scheduled for LinkedIn posting at a specific time for an account
 */
export function getScheduledPersonasForLinkedInPosting(
  twitterHandle: string,
  dayOfWeek: number,
  hour: number
): string[] {
  const schedule = getLinkedInPostingSchedule(twitterHandle);
  const daySchedule = schedule[dayOfWeek];
  const personas = daySchedule?.[hour] || [];

  return personas;
}

/**
 * Check if LinkedIn posting is scheduled for an account at current time
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function isLinkedInPostingScheduled(twitterHandle: string, date: Date = new Date()): boolean {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  const personas = getScheduledPersonasForLinkedInPosting(twitterHandle, dayOfWeek, hour);
  return personas.length > 0;
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
 * Get current scheduled activity for all accounts (for monitoring/debugging)
 * IMPORTANT: Schedules are defined in IST, so we convert UTC to IST for comparison
 */
export function getCurrentScheduledActivity(date: Date = new Date()): {
  twitterHandle: string;
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

    return {
      twitterHandle,
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
} {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  let personas = getScheduledPersonasForGeneration(twitterHandle, dayOfWeek, hour);

  // In debug mode, provide default personas if none scheduled
  if (debugMode && personas.length === 0) {
    if (twitterHandle === '@gibbi_ai') {
      personas = ['english_vocab_builder'];
    } else if (twitterHandle === '@princediwakar25') {
      personas = ['business_storyteller', 'cricket_storyteller', 'satirist', 'pattern_spotter'];
    }
  }

  let batchSize = 1; // Default for threads
  if (twitterHandle === '@gibbi_ai') {
    batchSize = 1; // Educational content can be batched larger
  } else if (twitterHandle === '@princediwakar25') {
    // If the scheduled persona is Satirist, only generate one post
    if (personas.length === 1 && personas[0] === 'satirist') {
      batchSize = 1;
    } else if (personas.length === 1 && personas[0] === 'pattern_spotter') {
      batchSize = 1;
    } else if (personas.length === 1 && (personas[0] === THREAD_A || personas[0] === THREAD_B)) {
      batchSize = 1; // Only one thread template per generation run
    } else {
      batchSize = 1; // Fallback for multi-persona/topic runs (rare in optimized schedule)
    }
  }

  const shouldGenerate = debugMode ? personas.length > 0 : personas.length > 0;

  return {
    should_generate: shouldGenerate,
    personas,
    batch_size: batchSize,
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
} {
  // Convert to IST (UTC+5:30)
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dayOfWeek = istDate.getDay();
  const hour = istDate.getHours();
  const personas = getScheduledPersonasForPosting(twitterHandle, dayOfWeek, hour);

  let maxPostsThisHour = 1; // Conservative default
  if (twitterHandle === '@gibbi_ai') {
    // Educational posts are frequent but short. Max 2 posts to allow catch-up.
    maxPostsThisHour = personas.length > 0 ? 2 : 1;
  } else if (twitterHandle === '@princediwakar25') {
    // Only 1 main content piece (single satirist tweet OR a thread start) is allowed per hour slot.
    maxPostsThisHour = 1;
  }


  return {
    should_post: personas.length > 0,
    personas,
    max_posts_this_hour: maxPostsThisHour,
  };
}



// Export types
export type { HourlySchedule, DailySchedule, AccountSchedules };