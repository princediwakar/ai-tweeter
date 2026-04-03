// lib/contentSource/index.ts
/**
 * Main entry point for content source module
 * Fetches structured data and formats it into strings for prompts
 */

import type { PersonaTopic } from '../personas';
import {
  getSatiristContext,
  getPatternSpotterContext,
  getBusinessStorytellerContext,
  getCricketStorytellerContext,
  getEnglishVocabBuilderContext,
  getLinkedinAnalystContext
} from './context';
import { formatPersonaContext } from './formatters';
import type { PersonaContext } from './types';

/**
 * Fetches structured context data for a given persona (internal use)
 * @param persona - The persona key
 * @param topic - The topic (for english_vocab_builder)
 * @param accountId - Optional account ID for deduplication
 * @returns Structured context data or null if no content available
 */
async function getStructuredContext(
  persona: string,
  topic: PersonaTopic | string,
  accountId?: string
): Promise<PersonaContext | null> {
  console.log(`[Content Source] 🎯 Fetching context for persona: ${persona}`);

  switch (persona) {
    case 'satirist':
      return getSatiristContext(accountId);

    case 'pattern_spotter':
      return getPatternSpotterContext(accountId);

    case 'business_storyteller':
      return getBusinessStorytellerContext(accountId);

    case 'cricket_storyteller':
      return getCricketStorytellerContext(accountId);

    case 'english_vocab_builder':
      return getEnglishVocabBuilderContext(topic);

    case 'linkedin_analyst':
      return getLinkedinAnalystContext(accountId);

    default:
      console.log(`[Content Source] ⚠️ No handler found for persona: ${persona}`);
      return null;
  }
}

/**
 * Main entry point: Fetches context and formats it into a string for prompts
 * @param persona - The persona key
 * @param topic - The topic (for english_vocab_builder)
 * @param accountId - Optional account ID for deduplication
 * @returns Formatted context string or empty string if no content available
 */
export async function getDynamicContext(
  persona: string,
  topic: PersonaTopic | string,
  accountId?: string
): Promise<string> {
  const structuredContext = await getStructuredContext(persona, topic, accountId);

  if (!structuredContext) {
    console.log(`[Content Source] ⚠️ No context available for persona: ${persona}`);
    return '';
  }

  const formatted = formatPersonaContext(persona, structuredContext);
  console.log(`[Content Source] ✅ Formatted context for ${persona} (${formatted.length} chars)`);
  return formatted;
}

// Re-export types for convenience
export type {
  HeadlineWithSource,
  EnrichedArticle,
  SourceMetadata,
  SatiristContext,
  PatternSpotterContext,
  BusinessStorytellerContext,
  CricketStorytellerContext,
  EnglishVocabBuilderContext,
  LinkedinAnalystContext,
  PersonaContext
} from './types';

// Re-export fetchers for direct use if needed
export { fetchHeadlinesOnly } from './fetchers';
