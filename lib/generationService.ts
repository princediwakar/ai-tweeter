// lib/generationService.ts
import OpenAI from 'openai';
import { getPersonaByKey, selectPersonaByWeight, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
// MODIFIED: Added sourceUrl to the EnhancedTweet type import
import { EnhancedTweet, CardData, SatiristCard } from './types';
import { accountService } from './accountService';
import type { Account } from './types';
import { getDynamicContext } from './contentSource';
import { generateVariationMarkers, generateContentHash, shouldUseRSSSources } from './generation/utils';
import { getPersonaGenerator } from './generation/personas';
import type { TweetGenerationConfig, GenerationContext } from './generation/types';
import { TweetV2 } from './twitter';
import { EngagementTarget } from './engagement/targets';
import { GENERATION_CONFIG } from './generation/config';

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

async function generateTweetPrompt(config: TweetGenerationConfig): Promise<{ prompt: string; persona: PersonaConfig; rssContext?: string }> {
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
        // Pass accountId for satirist source filtering
        rssContext = await getDynamicContext(config.persona, config.topic || '', config.account_id);
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

  // For satirist persona, decide image vs text-only format BEFORE prompt generation
  if (persona.key === 'satirist' && !config.satiristFormat) {
    const shouldGenerateImage = Math.random() < GENERATION_CONFIG.imageGeneration.satiristImagePercentage;
    config.satiristFormat = shouldGenerateImage ? 'image' : 'text-only';
    console.log(`🎲 [Satirist] Format decided: ${config.satiristFormat} (${Math.round(GENERATION_CONFIG.imageGeneration.satiristImagePercentage * 100)}% roll: ${shouldGenerateImage ? 'success' : 'miss'})`);
  }

  // For english_vocab_builder persona, decide image vs text-only format
  if (persona.key === 'english_vocab_builder' && !config.vocabFormat) {
    const imagePercentage = GENERATION_CONFIG.imageGeneration.vocabImagePercentage || 0.8; // Default to 80% if not configured
    const shouldGenerateImage = Math.random() < imagePercentage;
    config.vocabFormat = shouldGenerateImage ? 'image' : 'text-only';
    console.log(`🎲 [Vocab Builder] Format decided: ${config.vocabFormat} (${Math.round(imagePercentage * 100)}% roll: ${shouldGenerateImage ? 'success' : 'miss'})`);
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
    { timeMarker, tokenMarker }
  );

  return {
    prompt,
    persona,
    rssContext
  };
}

// MODIFIED: Function signature and logic updated to extract and return sourceUrl
function parseAndValidateTweetResponse(
  content: string,
  persona: string,
  rssContext?: string
): { tweet: EnhancedTweet; cardData: CardData | null; sourceUrl: string | undefined } | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedContent);
    let sourceUrl: string | undefined;

    if (rssContext) {
      if (persona === 'satirist' || persona === 'pattern_spotter') {
        if (data.selectedHeadlineNumber) {
          const headlineNumber = data.selectedHeadlineNumber;
          const sourcePattern = new RegExp(`\\[SOURCE_${headlineNumber}\\]: (.+)`, 'm');
          const match = rssContext.match(sourcePattern);
          if (match && match[1]) {
            sourceUrl = match[1].trim();
            console.log(`📰 [${persona}] Extracted source for headline #${headlineNumber}: ${sourceUrl}`);
          } else {
            console.error(`❌ [${persona}] Failed to extract source URL for headline #${headlineNumber}. Source pattern not found in RSS context.`);
            console.error(`RSS Context preview: ${rssContext.substring(0, 500)}...`);
          }
        } else {
          // This should never happen now due to validation above, but keeping as safety net
          console.error(`❌ [${persona}] Missing selectedHeadlineNumber in AI response. Cannot extract source URL.`);
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

    let cardData: CardData | null = null;
    let tweetContent: string;

    if (persona === 'english_vocab_builder') {
      if (!data.tweetText) { // tweetText is always required
        throw new Error('AI response for vocab_builder missing required field: tweetText.');
      }
      tweetContent = data.tweetText;

      // If cardData exists and is valid, it's an image tweet.
      if (data.cardData && data.cardData.word && data.cardData.meaning) {
        cardData = {
          word: data.cardData.word,
          meaning: data.cardData.meaning,
          partOfSpeech: data.cardData.partOfSpeech,
          example: data.cardData.example,
          synonyms: data.cardData.synonyms,
          type: data.cardData.type,
        };
      } else {
        // Otherwise, it's a text-only tweet, so cardData remains null.
        // This handles cases where cardData is explicitly null or malformed.
        if (data.cardData) {
             console.warn(`[vocab_builder] Received malformed cardData for a text-only tweet. Discarding.`, data.cardData);
        }
        cardData = null;
      }
    } else if (persona === 'satirist') {
      if (!data.tweetText) {
        throw new Error('AI response for satirist missing required field: tweetText.');
      }
      // CRITICAL: Validate selectedHeadlineNumber is present for source URL tracking
      if (!data.selectedHeadlineNumber || typeof data.selectedHeadlineNumber !== 'number') {
        throw new Error('AI response for satirist missing required field: selectedHeadlineNumber. Cannot track source URL without it.');
      }
      if (data.selectedHeadlineNumber < 1 || data.selectedHeadlineNumber > 8) {
        throw new Error(`AI response for satirist has invalid selectedHeadlineNumber: ${data.selectedHeadlineNumber}. Must be between 1 and 8.`);
      }
      tweetContent = data.tweetText;
      // Store imageContent in cardData ONLY if present (image format)
      if (data.imageContent) {
        cardData = {
          type: 'satirist_insight',
          imageContent: data.imageContent,
        } satisfies SatiristCard;
      }
      // For text-only format, cardData remains null
    } else if (persona === 'pattern_spotter') {
      if (!data.tweetText) {
        throw new Error('AI response for pattern_spotter missing required field: tweetText.');
      }
      // CRITICAL: Validate selectedHeadlineNumber is present for source URL tracking
      if (!data.selectedHeadlineNumber || typeof data.selectedHeadlineNumber !== 'number') {
        throw new Error('AI response for pattern_spotter missing required field: selectedHeadlineNumber. Cannot track source URL without it.');
      }
      const maxHeadlines = GENERATION_CONFIG.patternSpotter.headlinesToFetch;
      if (data.selectedHeadlineNumber < 1 || data.selectedHeadlineNumber > maxHeadlines) {
        throw new Error(`AI response for pattern_spotter has invalid selectedHeadlineNumber: ${data.selectedHeadlineNumber}. Must be between 1 and ${maxHeadlines}.`);
      }
      tweetContent = data.tweetText;
      console.log(`🔍 [Pattern Spotter] Used headline #${data.selectedHeadlineNumber} as primary source`);
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
      engagementHooks: data.teachingElements || [],
      gibbiCTA: data.gibbiCTA || undefined,
      contentType: 'explanation',
      selectedHeadlineNumber: data.selectedHeadlineNumber || undefined
    };

    // CRITICAL: Final validation for satirist and pattern_spotter personas - must have source URL
    if ((persona === 'satirist' || persona === 'pattern_spotter') && !sourceUrl) {
      console.error(`❌ [${persona}] Critical validation failed: No source URL extracted for tweet. This tweet will be rejected.`);
      console.error(`Tweet content: "${tweetContent}"`);
      console.error(`Selected headline: ${data.selectedHeadlineNumber}`);
      throw new Error(`${persona} tweet missing source URL - cannot proceed without attribution`);
    }

    // MODIFIED: Return the extracted sourceUrl
    return { tweet, cardData, sourceUrl };
    
  } catch (error) {
    console.error(`Failed to parse AI tweet response. Content: "${content}"`, error);
    return null;
  }
}


export async function generateTweet(config: TweetGenerationConfig = {}): Promise<EnhancedTweet | null> {
  try {

    const { prompt, persona, rssContext } = await generateTweetPrompt(config);

    const response = await deepseekClient.chat.completions.create({
      model: GENERATION_CONFIG.ai.model,
      messages: [{ role: "user", content: prompt }],
      temperature: GENERATION_CONFIG.ai.temperature,
      max_tokens: GENERATION_CONFIG.ai.maxTokens,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AI returned no content.');
    }



    const parsedResponse = parseAndValidateTweetResponse(
      content,
      persona.key,
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
      // If cardData exists, it means we decided to generate an image (format decision already made for satirist)
      console.log(`🖼️ Queueing async image generation for ${persona.displayName} with key ${persona.key}`);
      imageStatus = 'pending';
    } else if (persona.image_generation?.enabled && !cardData) {
      console.log(`🔍 Image generation enabled but no card data for persona ${persona.displayName} (text-only format selected)`);
    } else {
      console.log(`🔍 Image generation disabled for persona ${persona.displayName}`);
    }

    const contentHash = generateContentHash(tweetData);

    console.log(`✅ Generated enhanced tweet for ${persona.displayName} on contnt Hash: ${contentHash}`);

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

async function getRecentVocabularyWords(accountId: string, days: number = GENERATION_CONFIG.deduplication.vocabularyWordDays): Promise<string[]> {
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
      LIMIT ${GENERATION_CONFIG.deduplication.vocabularyWordLimit}
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
    recentWords = await getRecentVocabularyWords(config.account_id);
    console.log(`📚 Found ${recentWords.length} recent vocabulary words to avoid repetition`);
  }

  // Fetch account to determine if RSS sources should be used
  let account: Account | null = null;
  if (config.account_id && config.account_id !== 'fallback') {
    account = await accountService.getAccount(config.account_id);
    if (account) {
      console.log(`🎯 Batch generation account context: ${account.name} (${account.twitter_handle})`);
    }
  }

  // --- START: MODIFIED BATCH LOGIC ---
  // Fetch context ONCE for the entire batch to ensure efficiency and provide the same pool of news to each generator.
  let batchRssContext = '';
  if (config.persona && shouldUseRSSSources(account)) {
    try {
      // Pass accountId for satirist source filtering
      batchRssContext = await getDynamicContext(config.persona, '', config.account_id);
      console.log(`📰 Fetched RSS context for batch generation (${config.persona}): ${batchRssContext.length > 0 ? 'success' : 'empty'}`);
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
      if (result.persona === 'english_vocab_builder' && result.cardData && result.cardData.type !== 'satirist_insight' && result.cardData.word) {
        const newWord = result.cardData.word.toLowerCase();
        generatedWords.push(newWord);
        console.log(`🆕 New word generated: ${newWord}`);
      }
      // Track used headlines for satirist and pattern_spotter personas
      if ((result.persona === 'satirist' || result.persona === 'pattern_spotter') && result.selectedHeadlineNumber) {
        usedHeadlines.push(result.selectedHeadlineNumber);
        console.log(`📰 ${result.persona} used headline #${result.selectedHeadlineNumber}`);
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
  const prompt = `You are The Catalyst. Your goal is to spark meaningful conversation. You analyze a tweet's intent (is it news, humor, a debate?) and adapt your mode: from sharp analyst to witty partner to empathetic validator. Your voice is versatile and intelligent, optimized for high-reach replies that resonate deeply.

BACKGROUND CONTEXT (use strategically, not always):
You're from IIT BHU Varanasi with experience in the Indian startup ecosystem. This gives you credibility when discussing:
- Technical/product decisions by IIT founders or tech leaders
- Pattern recognition across Indian startups and scaling challenges
- Engineering-first approaches vs off-the-shelf solutions
- India's tech transformation (digital payments, startup ecosystem growth)

WHEN TO USE THIS CONTEXT:
✅ Founder discussing technical architecture, scaling, or hiring
✅ Debates about India vs global tech/business models
✅ Pattern recognition across IIT/startup ecosystem
✅ Technical validation where engineering background adds weight

WHEN NOT TO USE:
❌ Generic business advice or news commentary
❌ Personal/lifestyle topics unrelated to tech/startups
❌ When it feels like forced credential-dropping
❌ Topics where lived experience doesn't add unique insight

When you use context, be specific ("IIT founder playbook", "we saw this pattern at BHU") not generic ("as an engineer...").,


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