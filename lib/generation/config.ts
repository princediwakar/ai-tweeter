/**
 * Centralized Configuration for Content Generation
 *
 * This file contains all hardcoded configuration values used throughout
 * the content generation pipeline. Extracted for easy modification.
 */

export const GENERATION_CONFIG = {
  // ============================================
  // RSS FEED & ARTICLE FETCHING
  // ============================================
  rss: {
    /** Number of headlines to fetch per RSS feed */
    headlinesPerFeed: 5,

    /** Maximum total headlines to fetch from Indian business RSS feeds */
    maxTotalHeadlines: 20,

    /** Number of headlines selected for satirist persona enrichment */
    selectedHeadlinesForSatirist: 5,

    /** Cache time-to-live for RSS content (milliseconds) */
    cacheTTL: 5 * 60 * 1000, // 5 minutes

    /** Timeout for RSS feed fetching (milliseconds) */
    fetchTimeout: 4000,
  },

  // ============================================
  // ARTICLE ENRICHMENT
  // ============================================
  enrichment: {
    /** Maximum number of articles to enrich concurrently */
    maxConcurrent: 3,

    /** Maximum character length for extracted article text */
    fullTextLimit: 3000,

    /** Maximum number of entities (companies/people) to extract */
    maxEntities: 10,

    /** Timeout for article page fetching (milliseconds) */
    articleFetchTimeout: 8000,

    /** Homepage fetch timeout for Twitter handle discovery (milliseconds) */
    homepageFetchTimeout: 5000,

    /** Delay between enrichment batches (milliseconds) */
    batchDelay: 500,
  },

  // ============================================
  // DEDUPLICATION
  // ============================================
  deduplication: {
    /** Days to check for recently used satirist sources */
    satiristSourceDays: 5,

    /** Days to check for recently used vocabulary words */
    vocabularyWordDays: 30,

    /** Maximum number of recent vocabulary words to fetch */
    vocabularyWordLimit: 100,
  },

  // ============================================
  // IMAGE GENERATION
  // ============================================
  imageGeneration: {
    /** Percentage of satirist tweets that should have images (0.0 - 1.0) */
    satiristImagePercentage: 0.1, // 100% - all satirist tweets get images
  },

  // ============================================
  // AI GENERATION
  // ============================================
  ai: {
    /** Temperature for AI generation (higher = more creative) */
    temperature: 0.9,

    /** Maximum tokens for AI response */
    maxTokens: 500,

    /** AI model to use */
    model: 'deepseek-chat',
  },

  // ============================================
  // BATCH GENERATION
  // ============================================
  batch: {
    /** Default batch size for tweet generation */
    defaultBatchSize: 1,

    /** Batch size for gibbi_ai account (educational content) */
    gibbiBatchSize: 1,

    /** Batch size for princediwakar25 account (storytelling/satirist) */
    princeBatchSize: 1,
  },

  // ============================================
  // CTA (CALL TO ACTION)
  // ============================================
  cta: {
    /** Probability of including a Gibbi CTA in tweets (0.0 - 1.0) */
    gibbiCtaPercentage: 0.15, // 15% of tweets include Gibbi CTA
  },

  // ============================================
  // SATIRIST PERSONA
  // ============================================
  satirist: {
    /** Number of headlines available in the prompt for AI selection */
    availableHeadlinesInPrompt: 5,

    /** Character limit for tweet text (text-only format) */
    tweetTextCharLimit: 250,

    /** Character limit for tweet text (image format) */
    imageFormatTweetTextLimit: 120,

    /** Character limit for image content */
    imageContentCharLimit: 240,
  },

  // ============================================
  // PATTERN SPOTTER PERSONA
  // ============================================
  patternSpotter: {
    /** Number of headlines (with title + description) to fetch for pattern analysis */
    headlinesToFetch: 25,

    /** Character limit for pattern observation tweet */
    tweetTextCharLimit: 250,
  },

  // ============================================
  // CONTENT SOURCE FEEDS
  // ============================================
  feeds: {
    business: [
      'https://indianstartupnews.com/rss',
      'https://inc42.com/feed',
      'https://economictimes.indiatimes.com/prime/technology-and-startups/rssfeeds/63319172.cms',
    ],
    cricket: [
      'https://www.espncricinfo.com/rss/content/story/feeds/6.xml',
      'https://www.thehindu.com/sport/cricket/feeder/default.rss',
      'https://sports.ndtv.com/rss/cricket',
    ],
  },
} as const;

// Type-safe access to config values
export type GenerationConfig = typeof GENERATION_CONFIG;
