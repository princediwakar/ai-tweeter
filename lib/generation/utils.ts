import { randomBytes } from 'crypto';
import type { Account, EnhancedTweet } from '../types';
import type { VariationMarkers } from './types';

export function generateVariationMarkers(): VariationMarkers {
  const timestamp = Date.now();
  const timeMarker = `T${timestamp}-${randomBytes(2).toString('hex').toUpperCase()}`;
  const tokenMarker = `TK${randomBytes(4).toString('hex').toUpperCase()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  
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
  // All accounts use RSS by default - config should come from account in DB
  return true;
}