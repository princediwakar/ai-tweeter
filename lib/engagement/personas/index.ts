// lib/engagement/personas/index.ts

import { EngagementPersonaPrompt } from './types';
import { gandhi } from './gandhi';
import { theCatalyst } from './the_catalyst';

// Registry of all available engagement personas
export const ENGAGEMENT_PERSONAS: Record<string, EngagementPersonaPrompt> = {
  the_catalyst: theCatalyst,
  gandhi: gandhi,
};

/**
 * Get a specific engagement persona by key
 */
export function getEngagementPersona(key: string): EngagementPersonaPrompt | null {
  return ENGAGEMENT_PERSONAS[key] || null;
}

/**
 * Get all available engagement personas
 */
export function getAllEngagementPersonas(): EngagementPersonaPrompt[] {
  return Object.values(ENGAGEMENT_PERSONAS);
}

/**
 * Get list of all persona keys
 */
export function getEngagementPersonaKeys(): string[] {
  return Object.keys(ENGAGEMENT_PERSONAS);
}

// Re-export types for convenience
export type { EngagementPersonaPrompt } from './types';
