import OpenAI from 'openai';
import { getRandomTopicForPersona, getPersonaByKey, selectPersonaByWeight, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
import { EnhancedTweet, VocabularyCard } from './types';
import { getAccount } from './db';
import type { Account } from './types';
import { getDynamicContext } from './contentSource';
import { generateVariationMarkers, generateContentHash, shouldUseRSSSources } from './generation/utils';
import { getPersonaGenerator } from './generation/personas';
import type { TweetGenerationConfig, GenerationContext } from './generation/types';

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
      if (['satirist', 'business_storyteller', 'cricket_storyteller'].includes(config.persona)) {
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

    // Handle optional hashtags array
    let hashtags: string[] = [];
    if (data.hashtags && Array.isArray(data.hashtags)) {
      hashtags = data.hashtags.slice(0, 2);
    }
    
    const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.map((tag: string) => {
      // Remove any existing # symbols and ensure single # prefix
      const cleanTag = tag.replace(/^#+/, '').trim();
      return cleanTag ? `#${cleanTag}` : '';
    }).filter(tag => tag.length > 1).join(' ') : '';
    const ctaString = data.gibbiCTA ? '\n\n' + data.gibbiCTA : '';
    const totalLength = tweetContent.length + hashtagString.length + ctaString.length;
    
    if (totalLength > 270) {
      console.warn(`Generated tweet exceeds 270 characters (${totalLength}), truncating content...`);
      const availableLength = 270 - hashtagString.length - ctaString.length;
      if (availableLength > 0) {
        tweetContent = tweetContent.substring(0, availableLength - 3) + '...';
      } else {
        tweetContent = tweetContent.substring(0, 200);
        hashtags = hashtags.slice(0, 2);
      }
    }

    const tweet: EnhancedTweet = {
      content: tweetContent,
      hashtags: hashtags.map((tag: string) => {
        // Ensure consistent hashtag format in return object
        const cleanTag = tag.replace(/^#+/, '').trim();
        return cleanTag ? `#${cleanTag}` : '';
      }).filter(tag => tag.length > 1),
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