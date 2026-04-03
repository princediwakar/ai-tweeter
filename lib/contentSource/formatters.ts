// lib/contentSource/formatters.ts
/**
 * Formatters to convert structured context data to strings for prompts
 * This is a transitional layer - eventually persona generators will consume structured data directly
 */

import type {
  SatiristContext,
  PatternSpotterContext,
  BusinessStorytellerContext,
  CricketStorytellerContext,
  EnglishVocabBuilderContext,
  LinkedinAnalystContext,
  PersonaContext
} from './types';

/**
 * Formats Satirist context into a prompt string
 * ✨ FIXED: This now passes the pre-formatted `articlesJson` string directly.
 * This mimics the PatternSpotter logic and prevents cross-contamination.
 */
export function formatSatiristContext(ctx: SatiristContext): string {
  return ctx.articlesJson || '';
}


/**
 * Formats Pattern Spotter context into a prompt string
 * ✨ FIXED: This now passes the pre-formatted `articlesJson` string directly.
 * This string already contains the "###ARTICLE <n>" wrappers,
 * which prevents AI cross-contamination.
 */
export function formatPatternSpotterContext(ctx: PatternSpotterContext): string {
  // The articlesJson field is now pre-formatted in getPatternSpotterContext
  // to include the "### ARTICLE <n>" wrappers. We just return it.
  return ctx.articlesJson || '';
}

/**
 * Formats Linkedin Analyst context into a prompt string
 */
export function formatLinkedinAnalystContext(ctx: LinkedinAnalystContext): string {
  return ctx.articlesJson || '';
}


/**
 * Formats Business Storyteller context into a prompt string
 */
export function formatBusinessStorytellerContext(ctx: BusinessStorytellerContext): string {
  const sections: string[] = [
    'PRIMARY NEWS ITEM (Indian Business Focus):',
    `→ ${ctx.mainStory.headline}`,
    ''
  ];

  if (ctx.mainStory.description) {
    sections.push(`Summary: ${ctx.mainStory.description}`);
    sections.push('');
  }

  sections.push(`Primary Entity: ${ctx.mainEntity}`);
  sections.push(`Source URL (for context): ${ctx.sourceUrl}`);
  sections.push('');

  if (ctx.enrichmentContext.length > 0) {
    sections.push('ENRICHMENT CONTEXT (Background Research):');
    ctx.enrichmentContext.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item}`);
    });
    sections.push('');
  }

  sections.push('Create a narrative tweet that tells the human story behind this business news.');

  return sections.join('\n');
}

/**
 * Formats Cricket Storyteller context into a prompt string
 */
export function formatCricketStorytellerContext(ctx: CricketStorytellerContext): string {
  const sections: string[] = [
    'PRIMARY CRICKET NEWS ITEM:',
    `→ ${ctx.mainStory.headline}`,
    ''
  ];

  if (ctx.mainStory.description) {
    sections.push(`Summary: ${ctx.mainStory.description}`);
    sections.push('');
  }

  sections.push(`Key Player: ${ctx.keyPlayer}`);
  sections.push(`Source URL (for context): ${ctx.sourceUrl}`);
  sections.push('');

  if (ctx.enrichmentContext.length > 0) {
    sections.push('ENRICHMENT CONTEXT (Match Background):');
    ctx.enrichmentContext.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item}`);
    });
    sections.push('');
  }

  sections.push('Create a narrative tweet that captures the human drama and emotion of this cricket moment.');

  return sections.join('\n');
}

/**
 * Formats English Vocab Builder context into a prompt string
 */
export function formatEnglishVocabBuilderContext(ctx: EnglishVocabBuilderContext): string {
  const sections: string[] = [
    'Recent educational content and vocabulary trends:',
    ''
  ];

  ctx.headlines.forEach(headline => {
    sections.push(`- ${headline}`);
  });

  sections.push('');
  sections.push('Use these as inspiration for engaging vocabulary lessons and word learning content.');

  return sections.join('\n');
}

/**
 * Main formatter that routes to the correct formatter based on context type
 */
export function formatPersonaContext(persona: string, ctx: PersonaContext): string {
  switch (persona) {
    case 'satirist':
      // ✨ FIXED: This now correctly uses the new (simpler) formatter
      return formatSatiristContext(ctx as SatiristContext);
    case 'pattern_spotter':
      return formatPatternSpotterContext(ctx as PatternSpotterContext);
    case 'business_storyteller':
      return formatBusinessStorytellerContext(ctx as BusinessStorytellerContext);
    case 'cricket_storyteller':
      return formatCricketStorytellerContext(ctx as CricketStorytellerContext);
    case 'english_vocab_builder':
      return formatEnglishVocabBuilderContext(ctx as EnglishVocabBuilderContext);
    case 'linkedin_analyst':
      return formatLinkedinAnalystContext(ctx as LinkedinAnalystContext);
    default:
      return '';
  }
}