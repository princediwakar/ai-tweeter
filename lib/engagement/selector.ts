// lib/engagement/selector.ts
import { TweetV2 } from '../twitter';
import { qualityFilters } from './config';

/**
 * Applies all defined quality filters to a single tweet.
 */
function isTweetValid(tweet: TweetV2): boolean {
  const now = new Date();
  const tweetDate = new Date(tweet.created_at!);
  const ageMinutes = (now.getTime() - tweetDate.getTime()) / (1000 * 60);

  // Check age
  if (ageMinutes < qualityFilters.min_tweet_age_minutes || ageMinutes > qualityFilters.max_tweet_age_minutes) {
    console.log(`[Selector] Rejecting tweet ${tweet.id}: Age (${ageMinutes.toFixed(1)} min) is outside window.`);
    return false;
  }

  // Check likes
  const likes = tweet.public_metrics?.like_count ?? 0;
  if (likes < qualityFilters.min_tweet_likes || likes > qualityFilters.max_tweet_likes) {
    console.log(`[Selector] Rejecting tweet ${tweet.id}: Likes (${likes}) are outside range.`);
    return false;
  }

  console.log(`[Selector] Approving tweet ${tweet.id}: Age=${ageMinutes.toFixed(1)}min, Likes=${likes}`);
  return true;
}

/**
 * V1 Selector: Filters a list of tweets and selects the most recent valid one.
 */
export function selectBestTweet(tweets: TweetV2[]): TweetV2 | null {
  if (!tweets || tweets.length === 0) {
    return null;
  }

  const validTweets = tweets.filter(isTweetValid);

  if (validTweets.length === 0) {
    console.log('[Selector] No tweets passed the quality filters.');
    return null;
  }

  // Sort by most recent (descending creation time) and return the first one.
  validTweets.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
  
  const bestTweet = validTweets[0];
  console.log(`[Selector] Selected best tweet: ${bestTweet.id}`);
  return bestTweet;
}