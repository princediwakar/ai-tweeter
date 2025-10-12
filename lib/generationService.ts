// lib/generationService.ts
import OpenAI from 'openai';
import { getRandomTopicForPersona, getPersonaByKey, selectPersonaByWeight, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
// MODIFIED: Added sourceUrl to the EnhancedTweet type import
import { EnhancedTweet, VocabularyCard } from './types';
import { accountService } from './accountService';
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

async function generateTweetPrompt(config: TweetGenerationConfig): Promise<{ prompt: string; persona: PersonaConfig; topic: unknown; rssContext?: string }> {
  const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;
  
  let account: Account | null = null;

  if (config.account_id && config.account_id !== 'fallback') {
    account = await accountService.getAccount(config.account_id);
    if (account) {
      console.log(`🎯 Account context: ${account.name} (${account.twitter_handle})`);
    }
  }
  
  const useRSSSources = shouldUseRSSSources(account);
  console.log(`📰 RSS sources ${useRSSSources ? 'enabled' : 'disabled'} for account: ${account?.name || 'unknown'}`);
  
  // --- START: MODIFIED CONTEXT LOGIC ---
  // Prioritize pre-fetched context passed from a batch job.
  let rssContext = config.rssContext || '';
  
  // Only fetch context if it wasn't already provided (e.g., for a single tweet generation).
  if (!rssContext && useRSSSources && config.persona) {
    try {
        // The topic passed here is now ignored by the new satirist logic in getDynamicContext, which is what we want.
        rssContext = await getDynamicContext(config.persona, config.topic || '');
        console.log(`📰 (Single Fetch) Fetched RSS context for ${config.persona}: ${rssContext.length > 0 ? 'success' : 'no content'}`);
    } catch (error) {
      console.warn('⚠️ Failed to fetch RSS context for single tweet, continuing without it:', error);
    }
  }
  // --- END: MODIFIED CONTEXT LOGIC ---

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
    topic,
    rssContext
  };
}

// MODIFIED: Function signature and logic updated to extract and return sourceUrl
function parseAndValidateTweetResponse(
  content: string,
  persona: string,
  topic: { key: string; displayName: string },
  rssContext?: string
): { tweet: EnhancedTweet; cardData: VocabularyCard | null; sourceUrl: string | undefined } | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedContent);
    let sourceUrl: string | undefined;

    if (rssContext) {
      if (persona === 'satirist') {
        if (data.selectedHeadlineNumber) {
          const headlineNumber = data.selectedHeadlineNumber;
          const sourcePattern = new RegExp(`\\[SOURCE_${headlineNumber}\\]: (.+)`, 'm');
          const match = rssContext.match(sourcePattern);
          if (match && match[1]) {
            sourceUrl = match[1].trim();
            console.log(`📰 [Satirist] Extracted source for headline #${headlineNumber}: ${sourceUrl}`);
          }
        }
      } else if (['business_storyteller', 'cricket_storyteller'].includes(persona)) {
        // Generic extraction for personas with a "Primary News Item"
        const sourcePattern = /Source URL \(for context\): (https?:\/\/\S+)/m;
        const match = rssContext.match(sourcePattern);
        if (match && match[1]) {
          sourceUrl = match[1].trim();
          console.log(`📰 [${persona}] Extracted Primary News Item source: ${sourceUrl}`);
        }
      }
    }

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
      contentType: 'explanation',
      selectedHeadlineNumber: data.selectedHeadlineNumber || undefined
    };

    // MODIFIED: Return the extracted sourceUrl
    return { tweet, cardData, sourceUrl };
    
  } catch (error) {
    console.error(`Failed to parse AI tweet response. Content: "${content}"`, error);
    return null;
  }
}


export async function generateTweet(config: TweetGenerationConfig = {}): Promise<EnhancedTweet | null> {
  try {
    const { prompt, persona, topic, rssContext } = await generateTweetPrompt(config);

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

    const parsedResponse = parseAndValidateTweetResponse(
      content,
      persona.key,
      topic as { key: string; displayName: string },
      rssContext
    );
    if (!parsedResponse) {
      throw new Error('Failed to parse or validate AI response.');
    }

    // MODIFIED: Destructure sourceUrl from the parsed response
    const { tweet: tweetData, cardData, sourceUrl } = parsedResponse;

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

    // MODIFIED: Add sourceUrl to the final returned object
    return {
      ...tweetData,
      imageUrl,
      imageStatus,
      cardData: cardData || undefined,
      sourceUrl, // Add the extracted source URL
    };

  } catch (error) {
    console.error(`❌ Failed to generate enhanced tweet:`, error);
    return null;
  }
}

async function getRecentVocabularyWords(accountId: string, days: number = 30): Promise<string[]> {
  try {
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
  const usedHeadlines: number[] = [];

  let recentWords: string[] = [];
  if (config.account_id && config.persona === 'english_vocab_builder') {
    recentWords = await getRecentVocabularyWords(config.account_id, 30);
    console.log(`📚 Found ${recentWords.length} recent vocabulary words to avoid repetition`);
  }

  // --- START: MODIFIED BATCH LOGIC ---
  // Fetch context ONCE for the entire batch to ensure efficiency and provide the same pool of news to each generator.
  let batchRssContext = '';
  if (config.persona && shouldUseRSSSources(null)) {
    try {
      batchRssContext = await getDynamicContext(config.persona, '');
    } catch (error) {
      console.error("❌ Failed to fetch batch of dynamic contexts. Proceeding without them.", error);
    }
  }

  for (let i = 0; i < count; i++) {
    const allPreviousWords = [...recentWords, ...generatedWords];

    const batchConfig: TweetGenerationConfig = {
      ...config,
      batchPosition: i + 1,
      batchSize: count,
      previousWords: allPreviousWords.length > 0 ? allPreviousWords : undefined,
      previousHeadlines: usedHeadlines.length > 0 ? usedHeadlines : undefined,
      rssContext: batchRssContext // Pass the same pre-fetched context to each iteration.
    };

    const result = await generateTweet(batchConfig);

    if (result) {
      tweets.push(result);
      if (result.persona === 'english_vocab_builder' && result.cardData?.word) {
        const newWord = result.cardData.word.toLowerCase();
        generatedWords.push(newWord);
        console.log(`🆕 New word generated: ${newWord}`);
      }
      // Track used headlines for satirist persona
      if (result.persona === 'satirist' && result.selectedHeadlineNumber) {
        usedHeadlines.push(result.selectedHeadlineNumber);
        console.log(`📰 Satirist used headline #${result.selectedHeadlineNumber}`);
      }
    }
  }
  // --- END: MODIFIED BATCH LOGIC ---

  console.log(`📊 Enhanced batch generation complete: ${tweets.length}/${count} successful tweets`);
  console.log(`🔤 Generated words: ${generatedWords.join(', ')}`);
  console.log(`🚫 Avoided ${recentWords.length} recent words from database`);
  if (usedHeadlines.length > 0) {
    console.log(`📰 Used headlines: #${usedHeadlines.join(', #')}`);
  }
  return tweets;
}


/* Generates a high-impact reply to a tweet using the "THE_CATALYST" philosophy.
* This function is optimized for insight and brevity over all else.
*/
export async function generateEngagementReply(
 tweet: TweetV2,
 target: EngagementTarget,
 persona: PersonaConfig
): Promise<string | null> {
  const prompt = `
  ${persona.prompt_persona}

  Reply Context:
  - You are replying to: @${target.username} (Tier ${target.tier} influencer: ${target.description})
  - Their original tweet: "${tweet.text}"

  ---

  **Core Logic: A 3-Step Process**

  1.  **Analyze the Tweet's INTENT:** First, silently determine the primary nature of the original tweet. Is it:
      * **Informational/News:** Reporting a fact, statistic, or event.
      * **Opinion/Debate:** Presenting a viewpoint to be discussed.
      * **Humor/Meme:** Intended to be funny or relatable.
      * **Personal/Story:** Sharing a personal experience or feeling.
      * **Question:** Directly asking for input from the audience.

  2.  **Select the ENGAGEMENT MODE:** Based on the intent, choose one of these strategic modes for your reply.
      * **For Informational/News -> The Analyst Mode:** Find the "signal within the noise." Provide the deeper implication, the overlooked context, or the next logical question.
      * **For Opinion/Debate -> The Reframer Mode:** Don't just agree or disagree. Reframe the core idea with a surprising analogy, a thoughtful counterpoint, or by revealing the underlying principle that everyone is missing.
      * **For Humor/Meme -> The Riff Mode:** Add to the joke. Don't just say "lol". Build on the premise with a witty observation or a clever twist, like a good improv partner ("Yes, and...").
      * **For Personal/Story -> The Validator Mode:** Validate the person's experience and distill it into a universal human truth. Make them feel seen, then connect their feeling to a broader insight. Avoid generic sympathy.
      * **For Question -> The Sage Mode:** Provide an answer that isn't the most obvious one, but the most insightful one. Answer the question behind the question.

  3.  **Execute with THE CATALYST PRINCIPLES:**
      * **Principle 1: Add Definitive Value.** Your reply must contribute something new: insight, humor, or empathy. Never be a generic "This!" or "So true."
      * **Principle 2: Economize Every Word.** Be ruthlessly concise, but don't sacrifice clarity or wit. Aim for high impact-per-character. Under 200 characters is ideal.
      * **Principle 3: Resonate with Emotion.** Match the emotional frequency of the original tweet, whether it's serious, funny, or vulnerable. A tonal mismatch kills reach.
      * **Principle 4: Use Background Context Strategically.** Only reference your IIT/startup background when it adds unique credibility (technical decisions, pattern recognition, founder challenges). Never force it.

  **Final Instruction:**
  Generate ONLY the raw text for the reply based on your analysis. Do not explain your choice of mode.

  `;

 try {
   console.log(`[Generator] Generating engagement reply for tweet ${tweet.id} with persona ${persona.key}`);
   const response = await deepseekClient.chat.completions.create({
     model: "deepseek-chat",
     messages: [{ role: "user", content: prompt }],
     temperature: 0.85,
     max_tokens: 120,
   });
   const replyText = response.choices[0].message.content;

   if (!replyText) {
       console.error('[Generator] AI returned an empty reply.');
       return null;
   }

   const cleanedReply = replyText.replace(/"/g, '').trim();

   if (cleanedReply.length > 280) {
     console.error(`[Generator] ❌ Generated reply exceeds 280 chars (${cleanedReply.length}). Rejecting this reply.`);
     console.error(`[Generator] Reply text: "${cleanedReply}"`);
     return null;
   }

   console.log(`[Generator] ✅ Generated reply (${cleanedReply.length} chars): "${cleanedReply}"`);
   return cleanedReply;
 } catch (error) {
   console.error('[Generator] Error generating AI reply:', error);
   return null;
 }
}