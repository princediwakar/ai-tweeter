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
 * ✨ UPDATED: Now formats articles as a JSON array to prevent context bleed.
 */
export function formatPatternSpotterContext(ctx: PatternSpotterContext): string {
  
  // 1. Create a clean array of objects for the AI to analyze.
  // We only include the data the AI needs, not the full text.
  const articlesForJson = ctx.articles.map((article, idx) => ({
    index: idx + 1,
    headline: article.headline,
    // Use keyMetrics, fallback to a truncated excerpt if keyMetrics is empty
    keyMetrics: article.keyMetrics && article.keyMetrics.length > 50 
      ? article.keyMetrics 
      : article.fullText?.substring(0, 1500) || '',
    entities: article.entities.slice(0, 10) // Limit to top 10 entities
  }));

  // 2. Stringify this array into a JSON block
  const jsonString = JSON.stringify(articlesForJson, null, 2);

  // 3. Create a separate "Source Map" using the [SOURCE_X] format.
  // Your parser in `generationService.ts` already supports this format (from the Satirist persona).
  const sourceMap = ctx.articles.map(
    (article, idx) => `[SOURCE_${idx + 1}]: ${article.url}`
  ).join('\n');

  // 4. Combine them into the final prompt string
  const sections: string[] = [
    'Here is a list of articles for analysis in JSON format.',
    '**Instruction:** Find a non-obvious pattern or contrast between 2-3 articles.',
    '**CRITICAL RULE:** You MUST NOT mix data between articles. Facts from one article (e.g., index 1) CANNOT be attributed to another (e.g., index 2).',
    '',
    '---',
    'ARTICLES_JSON_PAYLOAD:',
    '```json',
    jsonString,
    '```',
    '',
    '---',
    'SOURCE_URL_MAP (For internal reference ONLY):',
    sourceMap,
    ''
  ];

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
