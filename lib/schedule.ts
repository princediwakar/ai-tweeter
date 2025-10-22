/**
 * Enhanced Multi-Account Tweet Scheduling System
 * * FINAL OPTIMIZATION BASED ON TWITTER ENGAGEMENT RATES (IST & Global) *
 * * - Satirist (News/Hot Take): Posts mid-morning for commute/work-start scroll.
 * - Storyteller (Thread): Posts prime-time (8 PM IST) for maximum long-form consumption.
 * - Gibbi (Education): Retains global spread with multiple peak slots.
 * - Pattern Spotter: Identifies patterns from headlines 
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
/**
 * OPTIMIZED SCHEDULES FOR 96-FOLLOWER ACCOUNT (60-Day Pattern Spotter Focus)
 *
 * Philosophy at this stage:
 * - Consistency > Volume (build posting habit)
 * - Quality > Quantity (every tweet must earn engagement)
 * - Single persona mastery (Pattern Spotter with 3 rotating lanes for variety)
 * - Sustainable pace (5 tweets/week leaves energy for engagement)
 * - Focus on testing which lanes get most saves/replies
 *
 * Target: 5 tweets/week
 * Strategy: Pattern Spotter only, lane rotation provides tonal variety
 * Goal: Reach 200-300 followers in 60 days via content + engagement
 */

// ============================================================================
// TWITTER GENERATION SCHEDULE (60-Day Pattern Spotter Focus)
// ============================================================================
const princeGenerationPattern: DailySchedule = {
  // Pattern Spotter 5x/week: Sustainable quality over volume
  // Generate 1-2 hours before posting to allow review/editing
  0: {}, // Sunday - rest
  1: { 9: ['pattern_spotter'] }, // Monday - morning insight 
  2: { 13: ['pattern_spotter'] }, // Tuesday - afternoon insight 
  3: { 9: ['pattern_spotter'] }, // Wednesday - morning insight 
  4: { 13: ['pattern_spotter'] }, // Thursday - afternoon insight 
  5: { 9: ['pattern_spotter'] }, // Friday - morning insight 
  6: {}, // Saturday - rest
};
// Total: 5 tweets/week (pattern_spotter only) - focus on lane variety & engagement

// ============================================================================
// TWITTER POSTING SCHEDULE (60-Day Pattern Spotter Focus)
// ============================================================================
const princePostingPattern: DailySchedule = {
  // Pattern Spotter 5x/week: Mix of morning (9am) and afternoon (1pm) for variety
  // All posts optimized for Indian audience peak engagement times

  0: {}, // Sunday - rest
  1: { 9: ['pattern_spotter'] }, // Monday morning
  2: { 13: ['pattern_spotter'] }, // Tuesday afternoon
  3: { 9: ['pattern_spotter'] }, // Wednesday morning
  4: { 13: ['pattern_spotter'] }, // Thursday afternoon
  5: { 9: ['pattern_spotter'] }, // Friday morning
  6: {}, // Saturday - rest
};
// Total: 5 posts/week (pattern_spotter only)


// ============================================================================
// LINKEDIN POSTING SCHEDULE
// ============================================================================
/**
 * LinkedIn Strategy for 2400 Connections:
 * - You have REACH - use it (4-5 posts/week, not 3)
 * - Tuesday-Thursday focus PLUS Monday opener + Friday closer
 * - Pattern Spotter dominant (LinkedIn = insights platform)
 * - Morning + early afternoon slots (global professionals)
 * - Different tone than Twitter (more professional, less casual)
 */
const princeLinkedInPostingPattern: DailySchedule = {
  0: {}, // Sunday
  1: { 9: ['satirist'] }, // Monday - week starter insight
  2: { 10: ['satirist'], 14: ['pattern_spotter'] }, // Tuesday - double down (peak day)
  3: { 10: ['pattern_spotter'] }, // Wednesday - mid-week insight
  4: { 10: ['satirist'], 14: ['pattern_spotter'] }, // Thursday - double down (peak day)
  5: { 9: ['pattern_spotter'] }, // Friday - week closer insight
  6: {}, // Saturday
};
// Total: 8 posts/week (5 pattern_spotter, 3 satirist)


// ============================================================================
// TWITTER ENGAGEMENT SCHEDULE
// ============================================================================
const princeEngagementPattern: HourlySchedule = {
  // Focus: Reply to bigger accounts in your niche (10-50K followers)
  // Goal: Get noticed, not spam
  // Time budget: 15-20 min per session
  
  9: ['engagement'],   // Post-posting: reply to morning tweets
  10: ['engagement'],   // Post-posting: reply to morning tweets
  11: ['engagement'],  // Lunch break: reply to trending topics
  13: ['engagement'],  // Lunch break: reply to trending topics
  19: ['engagement'],  // Evening: reply to day's popular tweets (when big accounts are active)
  20: ['engagement'],  // Evening: reply to day's popular tweets (when big accounts are active)
  21: ['engagement'],  // Evening: reply to day's popular tweets (when big accounts are active)
};
// Total: 3 sessions/day, ~45-60 min total engagement time

// ============================================================================
// GANDHI ACCOUNT ENGAGEMENT SCHEDULE
// ============================================================================
const gandhiEngagementPattern: HourlySchedule = {
  // Focus: Engage with leaders, activists, and news about social issues
  // Goal: Share wisdom, promote peace and ethical thinking
  // Time budget: 20-25 min per session
  // Philosophy: Thoughtful engagement during key moments of global discourse

  9: ['engagement'],   // Morning: Engage with early morning posts from leaders
  10: ['engagement'],   // Morning: Engage with early morning posts from leaders
  14: ['engagement'],  // Evening: Engage with day's political/social discussions
  20: ['engagement'],  // Night: Reflect on day's events with wisdom
};
// Total: 4 sessions/day, targeting social/political discourse

;
// Twitter handle mapping - maps twitter handles to schedule keys
const TWITTER_HANDLE_MAPPING: Record<string, string> = {
  '@gibbi_ai': 'gibbi_account',
  '@princediwakar25': 'prince_account',
  '@gandhi_wisdom_': 'gandhi_account',
};

// Reverse mapping - from schedule keys to twitter handles
const SCHEDULE_KEY_TO_HANDLE: Record<string, string> = {
  'gibbi_account': '@gibbi_ai',
  'prince_account': '@princediwakar25',
  'gandhi_account': '@gandhi_wisdom_',
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
  },

  gandhi_account: {
    // Gandhi account is engagement-only (no content generation/posting)
    generation: {}, // No content generation
    posting: {}, // No content posting
    engagement: {
      0: gandhiEngagementPattern, // Sunday
      1: gandhiEngagementPattern, // Monday
      2: gandhiEngagementPattern, // Tuesday
      3: gandhiEngagementPattern, // Wednesday
      4: gandhiEngagementPattern, // Thursday
      5: gandhiEngagementPattern, // Friday
      6: gandhiEngagementPattern, // Saturday
    },
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