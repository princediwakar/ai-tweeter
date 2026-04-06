// lib/contentSource/formatters.ts
/**
 * Formatters to convert structured context data to strings for prompts
 * 
 * DESIGN: All formatters are dynamic - work for any persona
 * Reads config from DB (personas.rss_sources, personas.config)
 */

import type { PersonaContext } from './types';

/**
 * Formats any persona context into a prompt string
 * Works dynamically for any persona with RSS sources in DB
 */
export function formatPersonaContext(_persona: string, ctx: PersonaContext): string {
  // Return the pre-formatted articles JSON which contains
  // "###ARTICLE <n>" wrappers to prevent AI cross-contamination
  return ctx.articlesJson || '';
}