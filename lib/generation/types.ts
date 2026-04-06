import type { Account, Persona } from '../types';

export interface VariationMarkers {
  time_marker: string;
  token_marker: string;
  generation_timestamp: number;
  content_hash: string;
}

export interface TweetGenerationConfig {
  connected_account_id?: string;
  persona?: string;
  category?: string;
  topic?: string;
  contentType?: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  batchPosition?: number;
  batchSize?: number;
  previousWords?: string[];
  previousHeadlines?: number[];
  recentPatterns?: RecentPattern[];
  usedSourceUrls?: string[];
  rssContext?: string;
  generationFormat?: 'image' | 'text-only';
}

export interface RecentPattern {
  text: string;
  timestamp?: string;
}

export interface GenerationContext {
  account: Account | null;
  useRSSSources: boolean;
  rssContext: string;
}

export interface PersonaGenerationResult {
  prompt: string;
  persona: Persona;
  topic: string;
}