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
  PersonaContext
} from './types';

/**
 * Formats Satirist context into a prompt string
 */
export function formatSatiristContext(ctx: SatiristContext): string {
  const sections: string[] = [
    'ENRICHED NEWS BRIEFING FOR SATIRICAL ANALYSIS',
    '-------------------------------------------',
    ''
  ];

  ctx.articles.forEach((article, idx) => {
    const num = idx + 1;
    sections.push(`${num}. ${article.headline}`);

    if (article.description) {
      sections.push(`   Summary: ${article.description}`);
    }

    if (article.fullText) {
      const excerpt = article.fullText.substring(0, 500);
      sections.push(`   Full Article Excerpt: ${excerpt}...`);
    }

    if (article.entities.length > 0) {
      sections.push(`   Key Entities: ${article.entities.join(', ')}`);
    }

    sections.push(`   [SOURCE_${num}]: ${article.url}`);
    sections.push('');
  });

  sections.push('-------------------------------------------');
  sections.push(`Select ONE headline (1-${ctx.headlinesInPrompt}). Analyze deeply. Create a satirical tweet with hard data.`);

  return sections.join('\n');
}

/**
 * Formats Pattern Spotter context into a prompt string
 */
export function formatPatternSpotterContext(ctx: PatternSpotterContext): string {
  const sections: string[] = [
    'TRENDING HEADLINES ACROSS TECH, BUSINESS & CULTURE',
    '------------------------------------------------',
    ''
  ];

  ctx.headlines.forEach((h, idx) => {
    const num = idx + 1;
    sections.push(`${num}. ${h.headline}`);
    if (h.description) {
      sections.push(`   Context: ${h.description}`);
    }
    sections.push(`   [SOURCE_${num}]: ${h.url}`);
    sections.push('');
  });

  sections.push('------------------------------------------------');
  sections.push(`Total: ${ctx.totalHeadlines} headlines. Identify emerging patterns and synthesize a meta-insight.`);

  return sections.join('\n');
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
      return formatSatiristContext(ctx as SatiristContext);
    case 'pattern_spotter':
      return formatPatternSpotterContext(ctx as PatternSpotterContext);
    case 'business_storyteller':
      return formatBusinessStorytellerContext(ctx as BusinessStorytellerContext);
    case 'cricket_storyteller':
      return formatCricketStorytellerContext(ctx as CricketStorytellerContext);
    case 'english_vocab_builder':
      return formatEnglishVocabBuilderContext(ctx as EnglishVocabBuilderContext);
    default:
      return '';
  }
}
