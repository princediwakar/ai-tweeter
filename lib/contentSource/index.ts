// lib/contentSource/index.ts
// Content source module - unified interface for content fetching

import { getPersonaByKey } from '@/lib/personas';
import { contentPipeline, type ContentItem } from './ContentPipeline';

export { contentPipeline, type ContentItem } from './ContentPipeline';

/**
 * Get dynamic context for persona - wraps ContentPipeline
 * @deprecated Use contentPipeline.fetchForPersona() directly
 */
export async function getDynamicContext(
  personaKey: string,
  topic: string,
  accountId?: string,
  fallbackPersonaKey?: string
): Promise<string> {
  console.log(`[Content Source] 🔄 Building dynamic context for persona: ${personaKey}`);

  const persona = await getPersonaByKey(personaKey);
  if (!persona) {
    console.warn(`[Content Source] ⚠️ Persona not found: ${personaKey}`);
    return "";
  }

  const items = await contentPipeline.fetchForPersona(persona, topic);
  
  if (items.length === 0) {
    console.warn(`[Content Source] ⚠️ No content fetched for persona: ${personaKey}`);
    return "";
  }

  const formattedContext = contentPipeline.formatForPrompt(items);
  console.log(`[Content Source] ✅ Pipeline complete. Formatted ${items.length} articles (${formattedContext.length} chars)`);
  
  return formattedContext;
}