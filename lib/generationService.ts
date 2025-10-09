// lib/generationService.ts
import OpenAI from 'openai';
import { getRandomTopicForPersona, getPersonaByKey, selectPersonaByWeight, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
import { EnhancedTweet, VocabularyCard } from './types';
import { getAccount } from './db';
import type { Account } from './types';
import { getDynamicContext } from './contentSource';
import { generateVariationMarkers, generateContentHash, shouldUseRSSSources } from './generation/utils';
import { getPersonaGenerator } from './generation/personas';
import type { TweetGenerationConfig, GenerationContext } from './generation/types';
import { TweetV2 } from './twitter';
import { EngagementTarget } from './engagement/targets';
const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

async function generateTweetPrompt(config: TweetGenerationConfig): Promise<{ prompt: string; persona: PersonaConfig; topic: unknown }> {
  const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;
  
  let account: Account | null = null;
  
  if (config.account_id && config.account_id !== 'fallback') {
    account = await getAccount(config.account_id);
    if (account) {
      console.log(`🎯 Account context: ${account.name} (${account.twitter_handle})`);
    }
  }
  
  const useRSSSources = shouldUseRSSSources(account);
  console.log(`📰 RSS sources ${useRSSSources ? 'enabled' : 'disabled'} for account: ${account?.name || 'unknown'}`);
  
  let rssContext = '';
  if (useRSSSources && config.persona) {
    try {
      if (['satirist'].includes(config.persona)) {
        const topicForRSS = config.topic || 'India';
        rssContext = await getDynamicContext(config.persona, topicForRSS);
        console.log(`📰 Fetched RSS context for ${config.persona}: ${rssContext.length > 0 ? 'success' : 'no content'}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch RSS context, continuing without it:', error);
    }
  }
  
  let persona: PersonaConfig | undefined;
  
  if (config.persona) {
    if (config.account_id && config.account_id !== 'fallback' && account) {
      if (!isPersonaAllowedForHandle(config.persona, account.twitter_handle)) {
        console.warn(`⚠️  Persona ${config.persona} not allowed for handle @${account.twitter_handle}, using allowed persona instead`);
        persona = getRandomPersonaForHandle(account.twitter_handle);
        console.log(`🔒 Using handle-allowed persona: ${persona.displayName}`);
      } else {
        persona = getPersonaByKey(config.persona);
        if (persona) {
          console.log(`✅ Using requested and validated persona: ${persona.displayName}`);
        }
      }
    } else {
      persona = getPersonaByKey(config.persona);
      if (persona) {
        console.log(`✅ Using requested persona (no account validation): ${persona.displayName}`);
      }
    }
  }
  
  if (!persona) {
    if (config.account_id && config.account_id !== 'fallback' && account) {
      try {
        persona = getRandomPersonaForHandle(account.twitter_handle);
        console.log(`🔒 Using handle-allowed random persona: ${persona.displayName} for @${account.twitter_handle}`);
      } catch (error) {
        console.error(`❌ Failed to get persona for handle @${account.twitter_handle}:`, error);
        persona = selectPersonaByWeight();
        console.log(`⚠️  Falling back to legacy random persona: ${persona.displayName}`);
      }
    } else {
      persona = selectPersonaByWeight();
      console.log(`🎲 Using legacy random persona: ${persona.displayName}`);
    }
  }
    
  if (!persona) {
    throw new Error('Invalid persona specified');
  }

  const topic = config.topic 
    ? persona.topics.find(t => t.key === config.topic)
    : getRandomTopicForPersona(persona.key);
    
  if (!topic) {
    throw new Error('No valid topic found for persona');
  }

  const personaGenerator = getPersonaGenerator(persona.key);
  if (!personaGenerator) {
    throw new Error(`No generator found for persona: ${persona.key}`);
  }

  const context: GenerationContext = {
    account,
    useRSSSources,
    rssContext
  };

  const prompt = personaGenerator.generatePrompt(
    config,
    context,
    persona,
    topic,
    { timeMarker, tokenMarker }
  );

  return {
    prompt,
    persona,
    topic
  };
}

function parseAndValidateTweetResponse(
  content: string, 
  persona: string, 
  topic: { key: string; displayName: string }
): { tweet: EnhancedTweet; cardData: VocabularyCard | null } | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedContent);

    let cardData: VocabularyCard | null = null;
    let tweetContent: string;

    if (persona === 'english_vocab_builder') {
      if (!data.tweetText || !data.cardData || !data.cardData.word || !data.cardData.meaning) {
        throw new Error('AI response for vocab_builder missing required fields: tweetText or cardData.');
      }
      tweetContent = data.tweetText;
      cardData = {
        word: data.cardData.word,
        meaning: data.cardData.meaning,
        partOfSpeech: data.cardData.partOfSpeech,
        example: data.cardData.example,
        synonyms: data.cardData.synonyms,
        type: data.cardData.type,
      };
    } else {
      if (!data.content || typeof data.content !== 'string') {
        throw new Error('AI response missing required "content" field.');
      }
      tweetContent = data.content;
    }

    // Hashtags are now included naturally in the content by the AI
    // Empty hashtags array kept for backward compatibility
    const ctaString = data.gibbiCTA ? '\n\n' + data.gibbiCTA : '';
    const totalLength = tweetContent.length + ctaString.length;

    if (totalLength > 280) {
      console.warn(`Generated tweet exceeds 280 characters (${totalLength}), truncating content...`);
      const availableLength = 280 - ctaString.length;
      if (availableLength > 0) {
        tweetContent = tweetContent.substring(0, availableLength - 3) + '...';
      } else {
        tweetContent = tweetContent.substring(0, 200);
      }
    }

    const tweet: EnhancedTweet = {
      content: tweetContent,
      hashtags: [],
      persona: persona,
      category: topic.key.split('_')[1] || 'general',
      topic: topic.key,
      engagementHooks: data.teachingElements || [],
      gibbiCTA: data.gibbiCTA || undefined,
      contentType: 'explanation'
    };

    return { tweet, cardData };
    
  } catch (error) {
    console.error(`Failed to parse AI tweet response. Content: "${content}"`, error);
    return null;
  }
}

export async function generateTweet(config: TweetGenerationConfig = {}): Promise<EnhancedTweet | null> {
  try {
    const { prompt, persona, topic } = await generateTweetPrompt(config);

    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AI returned no content.');
    }

    if (!persona || !topic) {
      throw new Error('Invalid persona or topic configuration');
    }

    const parsedResponse = parseAndValidateTweetResponse(content, persona.key, topic as { key: string; displayName: string });
    if (!parsedResponse) {
      throw new Error('Failed to parse or validate AI response.');
    }

    const { tweet: tweetData, cardData } = parsedResponse;

    const imageUrl: string | undefined = undefined;
    let imageStatus: 'none' | 'pending' = 'none';
    
    console.log(`🔍 Checking image generation for persona ${persona.displayName}: enabled=${persona.image_generation?.enabled}`);
    if (persona.image_generation?.enabled && cardData) {
      console.log(`🖼️ Queueing async image generation for ${persona.displayName} with key ${persona.key}`);
      imageStatus = 'pending';
    } else {
      console.log(`🔍 Image generation disabled or no card data for persona ${persona.displayName}`);
    }

    const contentHash = generateContentHash(tweetData);
    
    console.log(`✅ Generated enhanced tweet for ${persona.displayName} on ${(topic as { key: string; displayName: string }).displayName} Hash: ${contentHash}`);
    
    return {
      ...tweetData,
      imageUrl,
      imageStatus,
      cardData: cardData || undefined
    };

  } catch (error) {
    console.error(`❌ Failed to generate enhanced tweet:`, error);
    return null;
  }
}

async function getRecentVocabularyWords(accountId: string, days: number = 30): Promise<string[]> {
  try {
    // Import here to avoid circular dependency
    const { sql } = await import('@vercel/postgres');
    
    const result = await sql`
      SELECT DISTINCT card_data
      FROM tweets 
      WHERE account_id = ${accountId} 
        AND persona = 'english_vocab_builder'
        AND card_data IS NOT NULL
        AND created_at > NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const recentWords: string[] = [];
    for (const row of result.rows) {
      if (row.card_data) {
        try {
          const cardData = typeof row.card_data === 'string' 
            ? JSON.parse(row.card_data) 
            : row.card_data;
          if (cardData?.word) {
            recentWords.push(cardData.word.toLowerCase());
          }
        } catch {
          // Skip malformed card data
        }
      }
    }
    
    return recentWords;
  } catch (error) {
    console.warn('Failed to fetch recent vocabulary words:', error);
    return [];
  }
}

export async function generateBatchTweets(count: number, config: TweetGenerationConfig = {}): Promise<EnhancedTweet[]> {
  const tweets: EnhancedTweet[] = [];
  const generatedWords: string[] = [];
  
  // Get recent words from database to avoid repetition
  let recentWords: string[] = [];
  if (config.account_id && config.persona === 'english_vocab_builder') {
    recentWords = await getRecentVocabularyWords(config.account_id, 30);
    console.log(`📚 Found ${recentWords.length} recent vocabulary words to avoid repetition`);
  }

  for (let i = 0; i < count; i++) {
    // Combine recent database words with current batch words
    const allPreviousWords = [...recentWords, ...generatedWords];
    
    const batchConfig = {
      ...config,
      batchPosition: i + 1,
      batchSize: count,
      previousWords: allPreviousWords.length > 0 ? allPreviousWords : undefined
    };
    
    const result = await generateTweet(batchConfig);
    
    if (result) {
      tweets.push(result);
      // Track the word for vocabulary builder persona to prevent duplicates
      if (result.persona === 'english_vocab_builder' && result.cardData?.word) {
        const newWord = result.cardData.word.toLowerCase();
        generatedWords.push(newWord);
        console.log(`🆕 New word generated: ${newWord}`);
      }
    }
  }

  console.log(`📊 Enhanced batch generation complete: ${tweets.length}/${count} successful tweets`);
  console.log(`🔤 Generated words: ${generatedWords.join(', ')}`);
  console.log(`🚫 Avoided ${recentWords.length} recent words from database`);
  return tweets;
}



/**
 * Generates a reply to a tweet based on a specific persona.
 */
export async function generateEngagementReply(
  tweet: TweetV2,
  target: EngagementTarget,
  persona: PersonaConfig
): Promise<string | null> {
  const prompt = `
You are an AI assistant tasked with generating a high-quality reply to a tweet.
Your reply must embody the following persona:
---
Persona: ${persona.key}
Style: ${persona.description}
---

You are replying to a tweet from ${target.username}, who is ${target.description}.

Original tweet text:
"${tweet.text}"

Instructions for your reply (max 280 characters):
1.  Add SPECIFIC value. This could be a data point, a historical parallel, a thoughtful contrarian perspective, or a niche insight.
2.  Use a peer-to-peer, respectful, and intellectually curious tone. You are a fellow thought leader, not a fan.
3.  Politely invite further discussion or offer a new angle.
4.  ABSOLUTELY NO generic praise. Avoid phrases like "Great point!", "Well said!", "Love this!", "I agree!", etc.
5.  Do not use hashtags unless it is a natural part of the conversation.

Generate only the text for the reply.
Reply:
`;

  try {
    console.log(`[Generator] Generating engagement reply for tweet ${tweet.id} with persona ${persona.key}`);
    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8, // Slightly lower temp for more focused replies
      max_tokens: 80,   // Max chars is 280, 80 tokens is a safe limit
    });
    const replyText = response.choices[0].message.content;
    
    if (!replyText) {
        console.error('[Generator] AI returned an empty reply.');
        return null;
    }
    
    // Basic cleanup: remove quotes and trim whitespace
    const cleanedReply = replyText.replace(/"/g, '').trim();
    
    console.log(`[Generator] Generated reply: "${cleanedReply}"`);
    return cleanedReply;
  } catch (error) {
    console.error('[Generator] Error generating AI reply:', error);
    return null;
  }
}
