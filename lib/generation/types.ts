export interface VariationMarkers {
  time_marker: string;
  token_marker: string;
  generation_timestamp: number;
  content_hash: string;
}

export interface TweetGenerationConfig {
  account_id?: string;
  persona?: string;
  category?: string;
  topic?: string;
  contentType?: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  batchPosition?: number;
  batchSize?: number;
  previousWords?: string[];
}

import type { Account } from '../types';
import type { PersonaConfig } from '../personas';

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