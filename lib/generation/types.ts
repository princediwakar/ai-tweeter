// lib/generation/types.ts
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
  previousHeadlines?: number[]; // Track used headline numbers for satirist
  rssContext?: string;
  satiristFormat?: 'image' | 'text-only'; // Determine satirist output format before generation
}

import type { Account } from '../types';
import type { PersonaConfig } from '../personas';

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