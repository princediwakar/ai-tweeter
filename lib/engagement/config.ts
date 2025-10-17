// lib/engagement/config.ts

export const qualityFilters = {
    min_tweet_age_minutes: 1,        // Engage quickly but not immediately
    max_tweet_age_minutes: 65,      // 3 hours for more engagement opportunities
    min_tweet_likes: 0,              // Lower threshold for very recent tweets
    max_tweet_likes: 50000,          // Higher threshold for popular influencers
    min_text_length: 40,             // Reduced to catch more tweets (was 40)
    lookback_minutes: 60,           // 3 hours lookback window
    max_tweets_per_retrieval: 1,    // Keep it 1 otherwise it might cross the reads limit per month (100)
    exclude_image_only_tweets: false, // Allow image tweets (we'll check text length instead)
  };

  export type QualityFilters = typeof qualityFilters;