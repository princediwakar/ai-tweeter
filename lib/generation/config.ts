// lib/generation/config.ts

// ========================================================================
// ⚙️ FUNCTIONAL CONFIGURATION (How the system works)
// ========================================================================

const FUNCTIONAL_CONFIG = {
  fetching: {
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    apiTimeout: 4000,
    articlePageTimeout: 5000,
    homepageTimeout: 5000,
  },
  enrichment: {
    maxConcurrent: 3,
    fullTextLimit: 8000,
    maxEntities: 20,
    batchDelay: 1000,
  },
  ai: {
    model: 'deepseek-chat',
    temperature: 0.9,
    maxTokens: 500,
  },
  batch: {
    defaultSize: 1,
  },
};


const PERSONA_CONFIG = {
  satirist: {
    headlinesToFetch: 20,
    headlinesInPrompt: 8,
    tweetTextCharLimit: 120, // Hard limit for small accounts
    idealCharRange: { min: 80, max: 120 }, // Sweet spot for engagement
    imageFormatTweetTextLimit: 100, // Shorter hooks for image tweets
    imageContentCharLimit: 240,
    imageProbability: 0,
    deduplicationDays: 5,
    feeds: [
      'https://economictimes.indiatimes.com/tech/startups/rssfeeds/13357270.cms',
      // 'https://economictimes.indiatimes.com/tech/funding/rssfeeds/13357270.cms',
      'https://inc42.com/buzz/feed/',
      // 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms'
    ],
  },

  patternSpotter: {
    headlinesToAnalyze: 20,
    tweetTextCharLimit: 120, // Hard limit for small accounts
    idealCharRange: { min: 80, max: 120 }, // Sweet spot for engagement
    subredditsToFetch: 0,
    postsPerSubreddit: 0,
    twitterHandlesToFetch: 2,
    postsPerTwitterHandle: 3,
    deduplicationDays: 5,
    feeds: {
      business: [
      'https://economictimes.indiatimes.com/tech/startups/rssfeeds/13357270.cms',
      'https://inc42.com/buzz/feed/',
      'https://yourstory.com/feed',
      // 'https://www.livemint.com/rss/technology',
      // 'https://techcrunch.com/category/apps/feed/',
      // 'https://techcrunch.com/category/startups/feed',
      ],
      reddit: [
        // 'developersIndia',
        // 'ArtificialInteligence'
      ],
  
      twitter: [
        // '@aviralbhat'
      ],
    
    },
  },
  englishVocabBuilder: {
    batchSize: 1,
    imageProbability: 0.3,
    ctaProbability: 0.15,
    deduplicationDays: 30,
    deduplicationLimit: 100,
  },
  businessStoryteller: {
    batchSize: 1,
    deduplicationDays: 7,
    feeds: [
      'https://indianstartupnews.com/rss',
      'https://inc42.com/feed',
      'https://economictimes.indiatimes.com/prime/technology-and-startups/rssfeeds/63319172.cms',
    ],
  },
  cricketStoryteller: {
    batchSize: 1,
    deduplicationDays: 7,
    feeds: [
      'https://www.espncricinfo.com/rss/content/story/feeds/6.xml',
      'https://www.thehindu.com/sport/cricket/feeder/default.rss',
      'https://sports.ndtv.com/rss/cricket',
    ],
  },
};


export const GENERATION_CONFIG = {
  ...FUNCTIONAL_CONFIG,
  personas: PERSONA_CONFIG,
} as const;

export type GenerationConfig = typeof GENERATION_CONFIG;