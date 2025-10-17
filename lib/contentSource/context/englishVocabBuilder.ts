// lib/contentSource/context/englishVocabBuilder.ts
/**
 * English Vocab Builder context builder - returns structured data
 */

import type { PersonaTopic } from '../../personas';
import { fetchFromGoogle } from '../fetchers';
import { getCachedContext, setCachedContext, getTodayDateKey } from '../utils';
import type { EnglishVocabBuilderContext } from '../types';

/**
 * Generates real news queries for English Vocab Builder
 */
function generateRealNewsQueries(topic: PersonaTopic | string | undefined): string[] {
  const topicStr = typeof topic === 'object' && topic !== null ? topic.displayName : topic as string;
  const vocabQueries = [
    'English vocabulary learning tips',
    'new words English language today',
    'competitive exam vocabulary words',
    'academic writing vocabulary'
  ];
  return topicStr ? [topicStr] : vocabQueries.slice(0, 2);
}

/**
 * Builds structured context for English Vocab Builder persona
 * Returns structured data about headlines for inspiration
 */
export async function getEnglishVocabBuilderContext(topic: PersonaTopic | string): Promise<EnglishVocabBuilderContext | null> {
  const isPersonaTopic = typeof topic === 'object' && topic !== null && 'key' in topic;
  const topicString: string = isPersonaTopic ? (topic as PersonaTopic).displayName : (topic as string);
  const searchQueries = generateRealNewsQueries(topic);
  const dateKey = getTodayDateKey();
  const cacheDuration = 60;
  const cacheKey = `english_vocab_builder_${topicString.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '_')}_${dateKey}_${Math.floor(Date.now() / (1000 * 60 * cacheDuration))}`;

  console.log(`[Content Source] 🎯 Fetching real news for english_vocab_builder on topic "${topicString}"`);

  const cached = getCachedContext(cacheKey);
  if (cached) {
    // Parse cached string back to structured format
    const headlines = cached.split('\n').filter(line => line.startsWith('- ')).map(line => line.substring(2));
    return {
      headlines,
      topic: topicString
    };
  }

  try {
    const fetchPromises = searchQueries.map(query => fetchFromGoogle(query));
    const results = await Promise.allSettled(fetchPromises);
    const allContent: string[] = [];

    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        const values = res.value.map(item => item.headline);
        allContent.push(...values);
      }
    });

    if (allContent.length === 0) {
      return null; // Signal: no content available
    }

    const headlines = allContent.slice(0, 5);

    // Cache for future use
    const cacheString = "Recent educational content and vocabulary trends:\n" +
      headlines.map(c => `- ${c}`).join('\n') +
      "\n\nUse these as inspiration for engaging vocabulary lessons and word learning content.";
    setCachedContext(cacheKey, cacheString);

    return {
      headlines,
      topic: topicString
    };
  } catch (error) {
    console.error('[Content Source] ❌ Context failure for english_vocab_builder:', error);
    return null;
  }
}
