// lib/generation/types.ts - ADD THESE TYPES TO YOUR EXISTING FILE
import type { Account } from '../types';
import type { PersonaConfig } from '../personas';

// Existing types remain unchanged...
export interface VariationMarkers {
  time_marker: string;
  token_marker: string;
  generation_timestamp: number;
  content_hash: string;
}

// UPDATED: Added recentPatterns with proper typing
export interface TweetGenerationConfig {
  connected_account_id?: string;
  account_id?: string; // Deprecated - use connected_account_id
  persona?: string;
  category?: string;
  topic?: string;
  contentType?: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  batchPosition?: number;
  batchSize?: number;
  previousWords?: string[];
  previousHeadlines?: number[];
  recentPatterns?: RecentPattern[]; // UPDATED: Now properly typed
  usedSourceUrls?: string[];
  rssContext?: string;
  satiristFormat?: 'image' | 'text-only';
  patternSpotterFormat?: 'image' | 'text-only';
  vocabFormat?: 'image' | 'text-only';
}

// NEW: Pattern tracking type
export interface RecentPattern {
  text: string;
  timestamp?: string;
}



export interface HeadlineWithSource {
  headline: string;
  url: string;
  description?: string;
}

export interface GenerationContext {
  account: Account | null;
  useRSSSources: boolean;
  rssContext: string;
}

export interface PersonaGenerationResult {
  prompt: string;
  persona: PersonaConfig;
  topic: { key: string; displayName: string };
}