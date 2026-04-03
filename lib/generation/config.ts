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
    maxTokens: 2000,
  },
  batch: {
    defaultSize: 1,
  },
};


const PERSONA_CONFIG = {
  satirist: {
    headlinesToFetch: 20,
    headlinesInPrompt: 8,
    tweetTextCharLimit: 140, // Hard limit for small accounts
    idealCharRange: { min: 140, max: 240 }, // Sweet spot for engagement
    imageFormatTweetTextLimit: 100, // Shorter hooks for image tweets
    imageContentCharLimit: 240,
    imageProbability: 0.1,
    deduplicationDays: 5,
    feeds: [
      'https://economictimes.indiatimes.com/tech/startups/rssfeeds/13357270.cms',
      // 'https://economictimes.indiatimes.com/tech/funding/rssfeeds/13357270.cms',
      'https://inc42.com/buzz/feed/',
      'https://yourstory.com/feed',
      // 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms'
      // 'https://www.techcircle.in/rss/technology/',
      // 'https://sajithpai.com/feed/',
    ],
  },

  patternSpotter: {
    headlinesToAnalyze: 30,
    headlinesInPrompt: 1, // ✅ Good - you're doing single article
    tweetTextCharLimit: 240, // CHANGE: Increased from 200
    idealCharRange: { min: 220, max: 240 }, // CHANGE: Updated range
    subredditsToFetch: 1,
    postsPerSubreddit: 3,
    twitterHandlesToFetch: 0,
    postsPerTwitterHandle: 0,
    imageProbability: 0,
    imageFormatTweetTextLimit: 120, // CHANGE: Increased from 100
    imageContentCharLimit: 240, // CHANGE: Increased from 200
    deduplicationDays: 5,
    feeds: {
      business: [
      // 'https://economictimes.indiatimes.com/tech/startups/rssfeeds/13357270.cms',
      'https://inc42.com/buzz/feed/',
      'https://yourstory.com/feed',
      // 'https://www.tubefilter.com/feed/',      
      // 'https://ehandbook.com/rss'
      // 'https://www.techcircle.in/rss/technology/',
      // 'https://www.livemint.com/rss/technology',
      // 'https://techcrunch.com/category/startups/feed'
      ],
      reddit: [
        // 'developersIndia',
        // 'ArtificialInteligence',
        // 'LifeProTips',
        // 'YouShouldKnow'
      ],
  
      twitter: [
        // '@princediwakar25',
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
      'https://economictimes.indiatimes.com/tech/startups/rssfeeds/13357270.cms',
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
  linkedinAnalyst: {
    headlinesToAnalyze: 10,
    headlinesInPrompt: 3,
    tweetTextCharLimit: 2500, // LinkedIn allows up to 3000 chars
    idealCharRange: { min: 800, max: 2000 }, // Long-form mini-case study
    imageProbability: 0.1, // Adjust as needed
    imageFormatTweetTextLimit: 120,
    imageContentCharLimit: 240,
    deduplicationDays: 7,
    batchSize: 1,
    feeds: {
      business: [
        'https://inc42.com/buzz/feed/',
        'https://yourstory.com/feed',
        'https://economictimes.indiatimes.com/tech/startups/rssfeeds/13357270.cms',
      ],
      reddit: [],
      twitter: [],
    },
  },
};


export const GENERATION_CONFIG = {
  ...FUNCTIONAL_CONFIG,
  personas: PERSONA_CONFIG,
} as const;

export type GenerationConfig = typeof GENERATION_CONFIG;