// lib/generationService.ts
import OpenAI from 'openai';
import { getPersonaByKey, selectPersonaByWeight, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
// --- MODIFIED ---
// Added PatternSpotterCard to the import
import { EnhancedTweet, CardData, SatiristCard, PatternSpotterCard } from './types';
// --- END MODIFIED ---
import { accountService } from './accountService';
import type { Account } from './types';
import { getDynamicContext } from './contentSource';
import { generateVariationMarkers, generateContentHash, shouldUseRSSSources } from './generation/utils';
import { getPersonaGenerator } from './generation/personas';
import type { TweetGenerationConfig, GenerationContext, RecentPattern } from './generation/types';
import { TweetV2 } from './twitter';
import { EngagementTarget } from './engagement/targets';
import { GENERATION_CONFIG } from './generation/config';
import { getRecentPatternData, getRecentSatiristData, getRecentVocabularyWords } from './db';

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
    const imageProbability = GENERATION_CONFIG.personas.satirist.imageProbability;
    const shouldGenerateImage = Math.random() < imageProbability;
    config.satiristFormat = shouldGenerateImage ? 'image' : 'text-only';
    console.log(`🎲 [Satirist] Format decided: ${config.satiristFormat} (${Math.round(imageProbability * 100)}% roll: ${shouldGenerateImage ? 'success' : 'miss'})`);
  }
  
  // --- NEW ---
  // For patternSpotter persona, decide image vs text-only format
  // --- MODIFIED: Used correct 'pattern_spotter' key ---
  if (persona.key === 'pattern_spotter' && !config.patternSpotterFormat) {
    const imageProbability = GENERATION_CONFIG.personas.patternSpotter.imageProbability;
    const shouldGenerateImage = Math.random() < imageProbability;
    config.patternSpotterFormat = shouldGenerateImage ? 'image' : 'text-only';
    console.log(`🎲 [PatternSpotter] Format decided: ${config.patternSpotterFormat} (${Math.round(imageProbability * 100)}% roll: ${shouldGenerateImage ? 'success' : 'miss'})`);
  }
  // --- END NEW ---

  // For english_vocab_builder persona, decide image vs text-only format
  if (persona.key === 'english_vocab_builder' && !config.vocabFormat) {
    const imageProbability = GENERATION_CONFIG.personas.englishVocabBuilder.imageProbability;
    const shouldGenerateImage = Math.random() < imageProbability;
    config.vocabFormat = shouldGenerateImage ? 'image' : 'text-only';
    console.log(`🎲 [Vocab Builder] Format decided: ${config.vocabFormat} (${Math.round(imageProbability * 100)}% roll: ${shouldGenerateImage ? 'success' : 'miss'})`);
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

// ✨ FIXED: Complete rewrite of parseAndValidateTweetResponse
function parseAndValidateTweetResponse(
  content: string,
  persona: string,
  rssContext?: string,
  actualHeadlineCount?: number
): { tweet: EnhancedTweet; cardData: CardData | null; sourceUrl: string | undefined } | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();    
    const data = JSON.parse(cleanedContent);
    
    // Check for AI-reported errors first
    if (data.error) {
      throw new Error(`AI returned a controlled error: ${data.error}`);
    }
    
    // Initialize variables that will be populated in persona-specific branches
    let sourceUrl: string | undefined;
    let cardData: CardData | null = null;
    let tweetContent: string;

    // ========================================
    // STEP 1: Extract source URL from RSS context (for applicable personas)
    // ========================================
    // --- MODIFIED ---
    // Reverted to 'pattern_spotter' (snake_case)
    if (rssContext && (persona === 'satirist' || persona === 'pattern_spotter')) {
    // --- END MODIFIED ---
      if (data.selectedHeadlineNumber) {
        const headlineNumber = data.selectedHeadlineNumber;
        
        // --- MODIFIED ---
        // Reverted to 'pattern_spotter' (snake_case)
        if (persona === 'pattern_spotter') {
        // --- END MODIFIED ---
          // ✨ FIXED: New parser for "###ARTICLE <n>" JSON format
          const articleRegex = new RegExp(`### ARTICLE ${headlineNumber}\n({[\\s\\S]*?})\n### END ARTICLE ${headlineNumber}`, 'm');
          const articleMatch = rssContext.match(articleRegex);
          
          if (articleMatch && articleMatch[1]) {
            try {
              const articleJson = JSON.parse(articleMatch[1]);
              if (articleJson.url) {
                sourceUrl = articleJson.url.trim();
                // --- MODIFIED ---
                console.log(`📰 [pattern_spotter] Extracted source from ARTICLE ${headlineNumber} JSON: ${sourceUrl}`);
                // --- END MODIFIED ---
              } else {
                 // --- MODIFIED ---
                 console.error(`❌ [pattern_spotter] Found ARTICLE ${headlineNumber} but "url" key was missing inside the JSON.`);
                 // --- END MODIFIED ---
              }
            } catch (e) {
              // --- MODIFIED ---
              console.error(`❌ [pattern_spotter] Failed to parse JSON from ARTICLE ${headlineNumber}.`, e);
              // --- END MODIFIED ---
            }
          } else {
             // --- MODIFIED ---
             console.error(`❌ [pattern_spotter] Failed to find "### ARTICLE ${headlineNumber}" block in RSS context.`);
             // --- END MODIFIED ---
          }
          
        } else if (persona === 'satirist') {
          // Keep old parser for Satirist's [SOURCE_X] format
          const sourcePattern = new RegExp(`\\[SOURCE_${headlineNumber}\\]: (.+)`, 'm');
          const match = rssContext.match(sourcePattern);
          if (match && match[1]) {
            sourceUrl = match[1].trim();
            console.log(`📰 [satirist] Extracted source for headline #${headlineNumber}: ${sourceUrl}`);
          } else {
            console.error(`❌ [satirist] Failed to extract source URL for headline #${headlineNumber}. Source pattern not found.`);
          }
        }
        
      } else {
        console.error(`❌ [${persona}] Missing selectedHeadlineNumber in AI response. Cannot extract source URL.`);
      }
    } else if (rssContext && ['business_storyteller', 'cricket_storyteller'].includes(persona)) {
      // Generic extraction for storyteller personas with a "Primary News Item"
      const sourcePattern = /Source URL \(for context\): (https?:\/\/\S+)/m;
      const match = rssContext.match(sourcePattern);
      if (match && match[1]) {
        sourceUrl = match[1].trim();
        console.log(`📰 [${persona}] Extracted Primary News Item source: ${sourceUrl}`);
      }
    }

    // ========================================
    // STEP 2: Parse persona-specific response format
    // ========================================
    
    if (persona === 'english_vocab_builder') {
      // Vocab Builder: requires tweetText, optionally has cardData for image tweets
      if (!data.tweetText) {
        throw new Error('AI response for vocab_builder missing required field: tweetText.');
      }
      tweetContent = data.tweetText;

      // If cardData exists and is valid, it's an image tweet
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
        // Text-only tweet, cardData remains null
        if (data.cardData) {
          console.warn(`[vocab_builder] Received malformed cardData for a text-only tweet. Discarding.`, data.cardData);
        }
        cardData = null;
      }
    } 
    
    else if (persona === 'satirist') {
      // Satirist: requires tweetText and selectedHeadlineNumber, optionally has imageContent
      if (!data.tweetText) {
        throw new Error('AI response for satirist missing required field: tweetText.');
      }
      
      // CRITICAL: Validate selectedHeadlineNumber is present for source URL tracking
      if (!data.selectedHeadlineNumber || typeof data.selectedHeadlineNumber !== 'number') {
        throw new Error('AI response for satirist missing required field: selectedHeadlineNumber. Cannot track source URL without it.');
      }
      
      // Validate selectedHeadlineNumber is in valid range
      const maxHeadlines = actualHeadlineCount || 8; // Default to 8 for satirist if not provided
      if (data.selectedHeadlineNumber < 1 || data.selectedHeadlineNumber > maxHeadlines) {
        throw new Error(
          `AI response for satirist has invalid selectedHeadlineNumber: ${data.selectedHeadlineNumber}. ` +
          `Must be between 1 and ${maxHeadlines} (actual headlines: ${actualHeadlineCount || 'unknown'}).`
        );
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
    } 
    
    // --- MODIFIED ---
    // Reverted to 'pattern_spotter' (snake_case)
    else if (persona === 'pattern_spotter') {
      // Pattern Spotter: requires tweetText and selectedHeadlineNumber
      if (!data.tweetText) {
        // Was 'pattern_spotter'
        throw new Error('AI response for pattern_spotter missing required field: tweetText.');
      }
      
      // CRITICAL: Validate selectedHeadlineNumber is present for source URL tracking
      if (!data.selectedHeadlineNumber || typeof data.selectedHeadlineNumber !== 'number') {
        // Was 'pattern_spotter'
        throw new Error('AI response for pattern_spotter missing required field: selectedHeadlineNumber. Cannot track source URL without it.');
      }
      
      // Validate selectedHeadlineNumber is in valid range
      const maxHeadlines = actualHeadlineCount || GENERATION_CONFIG.personas.patternSpotter.headlinesToAnalyze;
      if (data.selectedHeadlineNumber < 1 || data.selectedHeadlineNumber > maxHeadlines) {
        throw new Error(
          // Was 'pattern_spotter'
          `AI response for pattern_spotter has invalid selectedHeadlineNumber: ${data.selectedHeadlineNumber}. ` +
          `Must be between 1 and ${maxHeadlines} (actual headlines: ${actualHeadlineCount || 'unknown'}).`
        );
      }
      
      tweetContent = data.tweetText;
      console.log(`🔍 [Pattern Spotter] Used headline #${data.selectedHeadlineNumber} as primary source`);
      
      // --- NEW ---
      // CRITICAL FIX: Check for imageContent and create the card
      if (data.imageContent) {
        cardData = {
          type: 'pattern_spotter_insight',
          imageContent: data.imageContent,
        } satisfies PatternSpotterCard;
        console.log(`🖼️ [Pattern Spotter] Image content found, creating cardData.`);
      }
      // --- END NEW ---
    } 
    // --- END MODIFIED ---
    
    else {
      // Default case: all other personas (business_storyteller, cricket_storyteller, etc.)
      if (!data.content || typeof data.content !== 'string') {
        throw new Error('AI response missing required "content" field.');
      }
      tweetContent = data.content;
    }

    // ========================================
    // STEP 3: Handle CTA and length validation
    // ========================================
    const ctaString = data.gibbiCTA ? '\n\n' + data.gibbiCTA : '';
    const totalLength = tweetContent.length + ctaString.length;

    if (totalLength > 280) {
      console.warn('Generated tweet exceeds 280 characters');
    }

    // ========================================
    // STEP 4: Build the EnhancedTweet object
    // ========================================
    const tweet: EnhancedTweet = {
      content: tweetContent,
      // ✨ FIXED: Ensure hashtags are an empty array for pattern_spotter, otherwise use what's provided or default
      // --- MODIFIED ---
      // Reverted to 'pattern_spotter' (snake_case)
      hashtags: persona === 'pattern_spotter' ? [] : (data.hashtags || []),
      // --- END MODIFIED ---
      persona: persona,
      engagementHooks: data.teachingElements || [],
      gibbiCTA: data.gibbiCTA || undefined,
      contentType: 'explanation',
      selectedHeadlineNumber: data.selectedHeadlineNumber || undefined
    };

    // ========================================
    // STEP 5: Final validation - source URL required for certain personas
    // ========================================
    // --- MODIFIED ---
    // Reverted to 'pattern_spotter' (snake_case)
    if ((persona === 'satirist' || persona === 'pattern_spotter') && !sourceUrl) {
    // --- END MODIFIED ---
      console.error(`❌ [${persona}] Critical validation failed: No source URL extracted for tweet. This tweet will be rejected.`);
      console.error(`Tweet content: "${tweetContent}"`);
      console.error(`Selected headline: ${data.selectedHeadlineNumber}`);
      throw new Error(`${persona} tweet missing source URL - cannot proceed without attribution`);
    }

    // ========================================
    // STEP 6: Return the complete result
    // ========================================
    return { tweet, cardData, sourceUrl };
    
  } catch (error) {
    console.error(`Failed to parse AI tweet response. Content: "${content}"`, error);
    return null;
  }
}

// 2. UPDATE generateTweet to count and pass actualHeadlineCount
export async function generateTweet(config: TweetGenerationConfig = {}): Promise<EnhancedTweet | null> {
  try {

    if (config.persona === 'satirist' && config.account_id && !config.recentPatterns) {
      console.log(`[Single Tweet] Fetching recent satirist data for account ${config.account_id}...`);
      const recentData = await getRecentSatiristData(config.account_id, 5);
      config.recentPatterns = recentData.patterns;
      config.usedSourceUrls = recentData.usedSourceUrls;
    }

    // --- MODIFIED ---
    // Reverted to 'pattern_spotter' (snake_case)
    if (config.persona === 'pattern_spotter' && config.account_id && !config.recentPatterns) {
    // --- END MODIFIED ---
      console.log(`[Single Tweet] Fetching recent pattern data for account ${config.account_id}...`);
      const recentData = await getRecentPatternData(config.account_id, 5);
      config.recentPatterns = recentData.patterns;
      config.usedSourceUrls = recentData.usedSourceUrls;
    }
    
    const { prompt, persona, rssContext } = await generateTweetPrompt(config);

    // NEW: Count actual headlines in RSS context for validation
    let actualHeadlineCount: number | undefined;
    if (rssContext) {
      if (persona.key === 'satirist') {
        const headlineMatches = rssContext.match(/^\d+\./gm);
        actualHeadlineCount = headlineMatches ? headlineMatches.length : undefined;
        console.log(`📊 [${persona.key}] Counted ${actualHeadlineCount} headlines in RSS context for validation`);
      // --- MODIFIED ---
      // Reverted to 'pattern_spotter' (snake_case)
      } else if (persona.key === 'pattern_spotter') {
      // --- END MODIFIED ---
         // ✨ FIXED: New counter for "### ARTICLE" format
        const headlineMatches = rssContext.match(/### ARTICLE \d+/g);
        actualHeadlineCount = headlineMatches ? headlineMatches.length : undefined;
        console.log(`📊 [${persona.key}] Counted ${actualHeadlineCount} "### ARTICLE" blocks in RSS context for validation`);
      }
    }


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
      rssContext,
      actualHeadlineCount // NEW: Pass the count
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

    console.log(`✅ Generated enhanced tweet for ${persona.displayName} on content Hash: ${contentHash}`);

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


export async function generateBatchTweets(count: number, config: TweetGenerationConfig = {}): Promise<EnhancedTweet[]> {
  const tweets: EnhancedTweet[] = [];
  const generatedWords: string[] = [];
  const usedHeadlines: number[] = [];

  let recentWords: string[] = [];
  if (config.account_id && config.persona === 'english_vocab_builder') {
    recentWords = await getRecentVocabularyWords(config.account_id);
    console.log(`📚 Found ${recentWords.length} recent vocabulary words to avoid repetition`);
  }

  let recentPatterns: RecentPattern[] = [];
  let usedSourceUrls: string[] = [];
  // --- MODIFIED ---
  // Reverted to 'pattern_spotter' (snake_case)
  if (config.account_id && config.persona === 'pattern_spotter') {
  // --- END MODIFIED ---
    const recentData = await getRecentPatternData(config.account_id, 5);
    recentPatterns = recentData.patterns;
    usedSourceUrls = recentData.usedSourceUrls;
    console.log(`🔍 [Batch] Initial context: ${recentPatterns.length} recent patterns and ${usedSourceUrls.length} used source URLs to avoid.`);
  }


  for (let i = 0; i < count; i++) {
    // ✨ FIXED: We must provide the *full* config to getDynamicContext
    // This means we must NOT set rssContext to undefined, but rather let
    // generateTweetPrompt handle it, which will call getDynamicContext.
    const batchConfig: TweetGenerationConfig = {
      ...config,
      batchPosition: i + 1,
      batchSize: count,
      previousWords: recentWords.length > 0 ? recentWords : undefined,
      previousHeadlines: usedHeadlines.length > 0 ? usedHeadlines : undefined,
      recentPatterns: recentPatterns.length > 0 ? recentPatterns : undefined,
      usedSourceUrls: usedSourceUrls.length > 0 ? usedSourceUrls : undefined,
      // rssContext is intentionally left out so it gets fetched fresh
      // by generateTweetPrompt, which respects the usedSourceUrls
    };

    console.log(`🔄 [Batch ${i + 1}/${count}] Generating with ${usedSourceUrls.length} blocked URLs...`);

    const result = await generateTweet(batchConfig);

    if (result) {
      tweets.push(result);
      
      // Track vocab words
      // --- MODIFIED ---
      // Check against new 'pattern_spotter_insight' type
      if (result.persona === 'english_vocab_builder' && result.cardData && result.cardData.type !== 'satirist_insight' && result.cardData.type !== 'pattern_spotter_insight' && result.cardData.word) {
      // --- END MODIFIED ---
        const newWord = result.cardData.word.toLowerCase();
        generatedWords.push(newWord);
      }
      
      // Track headline numbers (for satirist)
      if (result.persona === 'satirist' && result.selectedHeadlineNumber) {
        usedHeadlines.push(result.selectedHeadlineNumber);
      }
      
      // ✅ CRITICAL: Update blocklist immediately for next tweet in batch
      // --- MODIFIED ---
      // Reverted to 'pattern_spotter' (snake_case)
      if (result.persona === 'pattern_spotter' || result.persona === 'satirist') {
      // --- END MODIFIED ---
        // Add this tweet's source URL to blocklist for next iteration
        if (result.sourceUrl && !usedSourceUrls.includes(result.sourceUrl)) {
          usedSourceUrls.push(result.sourceUrl);
          console.log(`🚫 [Batch ${i + 1}] Blocked source for next tweet: ${result.sourceUrl.substring(0, 50)}...`);
        }
      }
      
      // Update pattern_spotter specific recent patterns
      // --- MODIFIED ---
      // Reverted to 'pattern_spotter' (snake_case)
      if (result.persona === 'pattern_spotter') {
      // --- END MODIFIED ---
        recentPatterns.push({
          text: result.content,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Small delay between generations to avoid rate limits
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`📊 Enhanced batch generation complete: ${tweets.length}/${count} successful tweets`);
  console.log(`🔤 Generated words: ${generatedWords.join(', ')}`);
  console.log(`🚫 Avoided ${recentWords.length} recent words from database`);
  if (usedHeadlines.length > 0) {
    console.log(`📰 Used headlines: #${usedHeadlines.join(', #')}`);
  }
  if (usedSourceUrls.length > 0) {
    console.log(`🚫 Final blocked URLs (total ${usedSourceUrls.length})`);
  }
  return tweets;
}
  
export async function generateEngagementReply(
  tweet: TweetV2,
  target: EngagementTarget,
  engagementPersonaKey: string
 ): Promise<string | null> {
  // Import the engagement persona system
  const { getEngagementPersona } = await import('./engagement/personas/index');

  const engagementPersona = getEngagementPersona(engagementPersonaKey);
  if (!engagementPersona) {
    console.error(`[Generator] Engagement persona '${engagementPersonaKey}' not found.`);
    return null;
  }

  const prompt = `${engagementPersona.systemPrompt}

  Reply Context:
  - You are replying to: @${target.username} (Tier ${target.tier} influencer: ${target.description})
  - Their original tweet: "${tweet.text}"
  `;

  try {
    console.log(`[Generator] Generating engagement reply for tweet ${tweet.id} with persona ${engagementPersona.displayName}`);
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