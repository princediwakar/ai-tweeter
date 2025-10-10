// lib/engagement/config.ts

export const qualityFilters = {
    min_tweet_age_minutes: 1,        // Engage quickly but not immediately
    max_tweet_age_minutes: 20,      
    min_tweet_likes: 0,              // Lower threshold for very recent tweets
    max_tweet_likes: 50000,           // Higher threshold for popular influencers
    min_text_length: 40,            // Require substantive tweets (not just images)
    lookback_minutes: 18,           
    max_tweets_per_retrieval: 2,    // Keep it 2 otherwise it might cross the reads limit per month (100)
    exclude_image_only_tweets: false, // Allow image tweets (we'll check text length instead)
  };

  export type QualityFilters = typeof qualityFilters;