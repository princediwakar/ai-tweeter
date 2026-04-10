import type { ConnectedAccount, Persona } from '../types';

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
  sourceContext?: string;
  generationFormat?: 'image' | 'text-only';
  skipRSS?: boolean;
}

export interface RecentPattern {
  text: string;
  timestamp?: string;
}

export interface GenerationContext {
  account: ConnectedAccount | null;
  useRSSSources: boolean;
  sourceContext: string;
  userTopicContext?: string;
}

export interface PersonaGenerationResult {
  prompt: string;
  persona: Persona;
  topic: string;
}