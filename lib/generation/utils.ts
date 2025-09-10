import { randomBytes } from 'crypto';
import type { Account, EnhancedTweet } from '../types';
import type { VariationMarkers } from './types';

export function generateVariationMarkers(): VariationMarkers {
  const timestamp = Date.now();
  const timeMarker = `T${timestamp}`;
  const tokenMarker = `TK${randomBytes(4).toString('hex').toUpperCase()}`;
  
  return { 
    time_marker: timeMarker, 
    token_marker: tokenMarker, 
    generation_timestamp: timestamp,
    content_hash: ''
  };
}

export function generateContentHash(tweet: EnhancedTweet): string {
  const contentString = JSON.stringify({
    content: tweet.content,
    hashtags: tweet.hashtags,
    persona: tweet.persona
  });
  
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `CH${Math.abs(hash).toString(36).toUpperCase()}`;
}

export function shouldUseRSSSources(account: Account | null): boolean {
  if (!account) return false;
  
  const handle = account.twitter_handle.replace('@', '').toLowerCase();
  
  switch (handle) {
    case 'gibbi_ai':
      return false;
    case 'princediwakar25':
      return true;
    default:
      return true;
  }
}