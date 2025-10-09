// lib/engagement/config.ts

export const qualityFilters = {
    min_tweet_age_minutes: 1,    
    max_tweet_age_minutes: 120,   // The top 20-minute window for engagement
    min_tweet_likes: 5,          // Filter out spam or low-traction tweets
    max_tweet_likes: 1000,       // Avoid overly competitive tweets
    lookback_minutes: 120,        // How far back the Counts API should check
    max_tweets_per_retrieval: 2, // Limit quota usage per active check
    exclude_image_only_tweets: true, // Avoid tweets where AI lacks visual context
  };
  
  export type QualityFilters = typeof qualityFilters;