// lib/generationProcessing.ts
import {
    getPersonaByKey,
    selectPersonaByWeight,
    PersonaConfig,
    getRandomPersonaForHandle,
    isPersonaAllowedForHandle,
  } from "@/lib/personas";
  import {
    EnhancedTweet,
    CardData,
    SatiristCard,
    PatternSpotterCard,
    Account,
  } from "./types";
  import { accountService } from "./accountService";
  import { getDynamicContext } from "./contentSource";
  import {
    generateVariationMarkers,
    shouldUseRSSSources,
  } from "./generation/utils";
  import { getPersonaGenerator } from "./generation/personas";
  import type {
    TweetGenerationConfig,
    GenerationContext,
  } from "./generation/types";
  import { GENERATION_CONFIG } from "./generation/config";
  
  export async function generateTweetPrompt(
    config: TweetGenerationConfig
  ): Promise<{ prompt: string; persona: PersonaConfig; rssContext?: string }> {
    const markers = generateVariationMarkers();
    const { time_marker: timeMarker, token_marker: tokenMarker } = markers;
  
    let account: Account | null = null;
  
    if (config.account_id && config.account_id !== "fallback") {
      account = await accountService.getAccount(config.account_id);
      if (account) {
        console.log(
          `🎯 Account context: ${account.name} (${account.twitter_handle})`
        );
      }
    }
  
    const useRSSSources = shouldUseRSSSources(account) || 
      ['satirist', 'pattern_spotter', 'business_storyteller', 'cricket_storyteller', 'linkedin_analyst'].includes(config.persona ?? "");
    console.log(
      `📰 RSS sources ${useRSSSources ? "enabled" : "disabled"} for account: ${
        account?.name || "unknown"
      }`
    );
  
    // --- START: MODIFIED CONTEXT LOGIC ---
    // Prioritize pre-fetched context passed from a batch job.
    let rssContext = config.rssContext || "";
  
    // Only fetch context if it wasn't already provided (e.g., for a single tweet generation).
    if (!rssContext && useRSSSources && config.persona) {
      try {
        // Pass accountId for satirist source filtering
        rssContext = await getDynamicContext(
          config.persona,
          config.topic || "",
          config.account_id
        );
        console.log(
          `📰 (Single Fetch) Fetched RSS context for ${config.persona}: ${
            rssContext.length > 0 ? "success" : "no content"
          }`
        );
      } catch (error) {
        console.warn(
          "⚠️ Failed to fetch RSS context for single tweet, continuing without it:",
          error
        );
      }
    }
    // --- END: MODIFIED CONTEXT LOGIC ---
  
    let persona: PersonaConfig | undefined;
  
    if (config.persona) {
      if (config.account_id && config.account_id !== "fallback" && account) {
        if (!isPersonaAllowedForHandle(config.persona, account.twitter_handle)) {
          console.warn(
            `⚠️  Persona ${config.persona} not allowed for handle @${account.twitter_handle}, using allowed persona instead`
          );
          persona = getRandomPersonaForHandle(account.twitter_handle);
          console.log(`🔒 Using handle-allowed persona: ${persona.displayName}`);
        } else {
          persona = getPersonaByKey(config.persona);
          if (persona) {
            console.log(
              `✅ Using requested and validated persona: ${persona.displayName}`
            );
          }
        }
      } else {
        persona = getPersonaByKey(config.persona);
        if (persona) {
          console.log(
            `✅ Using requested persona (no account validation): ${persona.displayName}`
          );
        }
      }
    }
  
    if (!persona) {
      if (config.account_id && config.account_id !== "fallback" && account) {
        try {
          persona = getRandomPersonaForHandle(account.twitter_handle);
          console.log(
            `🔒 Using handle-allowed random persona: ${persona.displayName} for @${account.twitter_handle}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to get persona for handle @${account.twitter_handle}:`,
            error
          );
          persona = selectPersonaByWeight();
          console.log(
            `⚠️  Falling back to legacy random persona: ${persona.displayName}`
          );
        }
      } else {
        persona = selectPersonaByWeight();
        console.log(`🎲 Using legacy random persona: ${persona.displayName}`);
      }
    }
  
    if (!persona) {
      throw new Error("Invalid persona specified");
    }
  
    // For satirist persona, decide image vs text-only format BEFORE prompt generation
    if (persona.key === "satirist" && !config.satiristFormat) {
      const imageProbability =
        GENERATION_CONFIG.personas.satirist.imageProbability;
      const shouldGenerateImage = Math.random() < imageProbability;
      config.satiristFormat = shouldGenerateImage ? "image" : "text-only";
      console.log(
        `🎲 [Satirist] Format decided: ${config.satiristFormat} (${Math.round(
          imageProbability * 100
        )}% roll: ${shouldGenerateImage ? "success" : "miss"})`
      );
    }
  
    if (persona.key === "pattern_spotter" && !config.patternSpotterFormat) {
      const imageProbability =
        GENERATION_CONFIG.personas.patternSpotter.imageProbability;
      const shouldGenerateImage = Math.random() < imageProbability;
      config.patternSpotterFormat = shouldGenerateImage ? "image" : "text-only";
      console.log(
        `🎲 [PatternSpotter] Format decided: ${
          config.patternSpotterFormat
        } (${Math.round(imageProbability * 100)}% roll: ${
          shouldGenerateImage ? "success" : "miss"
        })`
      );
    }
  
    // For english_vocab_builder persona, decide image vs text-only format
    if (persona.key === "english_vocab_builder" && !config.vocabFormat) {
      const imageProbability =
        GENERATION_CONFIG.personas.englishVocabBuilder.imageProbability;
      const shouldGenerateImage = Math.random() < imageProbability;
      config.vocabFormat = shouldGenerateImage ? "image" : "text-only";
      console.log(
        `🎲 [Vocab Builder] Format decided: ${config.vocabFormat} (${Math.round(
          imageProbability * 100
        )}% roll: ${shouldGenerateImage ? "success" : "miss"})`
      );
    }
  
    const personaGenerator = getPersonaGenerator(persona.key);
    if (!personaGenerator) {
      throw new Error(`No generator found for persona: ${persona.key}`);
    }
  
    const context: GenerationContext = {
      account,
      useRSSSources,
      rssContext,
    };
  
    const prompt = personaGenerator.generatePrompt(config, context, {
      timeMarker,
      tokenMarker,
    });
  
    return {
      prompt,
      persona,
      rssContext,
    };
  }
  
  /**
   * ✨ FIXED: Complete rewrite of parseAndValidateTweetResponse
   * This function is now responsible for parsing the new "sealed envelope" context for BOTH Satirist and PatternSpotter.
   */
  export function parseAndValidateTweetResponse(
    content: string,
    persona: string,
    rssContext?: string,
    actualHeadlineCount?: number
  ): {
    tweet: EnhancedTweet;
    cardData: CardData | null;
    sourceUrl: string | undefined;
    reasoning?: Record<string, string>;
  } | null {
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
  
      // ✨ MODIFIED: Satirist and PatternSpotter now use the *exact same* parsing logic.
      if (
        rssContext &&
        (persona === "satirist" || persona === "pattern_spotter" || persona === "linkedin_analyst")
      ) {
        if (data.selectedHeadlineNumber) {
          const headlineNumber = data.selectedHeadlineNumber;
  
          // New parser for "###ARTICLE <n>" JSON format
          const articleRegex = new RegExp(
            `### ARTICLE ${headlineNumber}\n({[\\s\\S]*?})\n### END ARTICLE ${headlineNumber}`,
            "m"
          );
          const articleMatch = rssContext.match(articleRegex);
  
          if (articleMatch && articleMatch[1]) {
            try {
              const articleJson = JSON.parse(articleMatch[1]);
              if (articleJson.url) {
                sourceUrl = articleJson.url.trim();
                console.log(
                  `📰 [${persona}] Extracted source from ARTICLE ${headlineNumber} JSON: ${sourceUrl}`
                );
              } else {
                console.error(
                  `❌ [${persona}] Found ARTICLE ${headlineNumber} but "url" key was missing inside the JSON.`
                );
              }
            } catch (e) {
              console.error(
                `❌ [${persona}] Failed to parse JSON from ARTICLE ${headlineNumber}.`,
                e
              );
            }
          } else {
            console.error(
              `❌ [${persona}] Failed to find "### ARTICLE ${headlineNumber}" block in RSS context.`
            );
          }
        } else {
          console.error(
            `❌ [${persona}] Missing selectedHeadlineNumber in AI response. Cannot extract source URL.`
          );
        }
      } else if (
        rssContext &&
        ["business_storyteller", "cricket_storyteller"].includes(persona)
      ) {
        // Generic extraction for storyteller personas with a "Primary News Item"
        const sourcePattern = /Source URL \(for context\): (https?:\/\/\S+)/m;
        const match = rssContext.match(sourcePattern);
        if (match && match[1]) {
          sourceUrl = match[1].trim();
          console.log(
            `📰 [${persona}] Extracted Primary News Item source: ${sourceUrl}`
          );
        }
      }
  
      // ========================================
      // STEP 2: Parse persona-specific response format
      // ========================================
  
      if (persona === "english_vocab_builder") {
        // Vocab Builder: requires tweetText, optionally has cardData for image tweets
        if (!data.tweetText) {
          throw new Error(
            "AI response for vocab_builder missing required field: tweetText."
          );
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
            console.warn(
              `[vocab_builder] Received malformed cardData for a text-only tweet. Discarding.`,
              data.cardData
            );
          }
          cardData = null;
        }
      }
  
      // ✨ MODIFIED: Satirist, PatternSpotter and LinkedinAnalyst parsing logic is now combined
      else if (persona === "satirist" || persona === "pattern_spotter" || persona === "linkedin_analyst") {
        if (!data.tweetText) {
          throw new Error(
            `AI response for ${persona} missing required field: tweetText.`
          );
        }
  
        // CRITICAL: Validate selectedHeadlineNumber is present for source URL tracking
        if (
          !data.selectedHeadlineNumber ||
          typeof data.selectedHeadlineNumber !== "number"
        ) {
          throw new Error(
            `AI response for ${persona} missing required field: selectedHeadlineNumber. Cannot track source URL without it.`
          );
        }
  
        // Validate selectedHeadlineNumber is in valid range
        const maxHeadlines =
          actualHeadlineCount ||
          (persona === "satirist"
            ? GENERATION_CONFIG.personas.satirist.headlinesInPrompt
            : persona === "linkedin_analyst"
            ? GENERATION_CONFIG.personas.linkedinAnalyst.headlinesInPrompt
            : GENERATION_CONFIG.personas.patternSpotter.headlinesToAnalyze);
  
        if (
          data.selectedHeadlineNumber < 1 ||
          data.selectedHeadlineNumber > maxHeadlines
        ) {
          throw new Error(
            `AI response for ${persona} has invalid selectedHeadlineNumber: ${data.selectedHeadlineNumber}. ` +
              `Must be between 1 and ${maxHeadlines} (actual headlines: ${
                actualHeadlineCount || "unknown"
              }).`
          );
        }
  
        tweetContent = data.tweetText;
        console.log(
          `🔍 [${persona}] Used headline #${data.selectedHeadlineNumber} as primary source`
        );
  
        // // New: Log the reasoning block if it exists (for debugging)
        // if (data.reasoning) {
        //   console.log(
        //     `🧠 [${persona}] AI Output: ${JSON.stringify(data.reasoning)}`
        //   );
        // }
  
        // CRITICAL: Check for imageContent and create the card
        if (data.imageContent) {
          if (persona === "satirist") {
            cardData = {
              type: "satirist_insight",
              imageContent: data.imageContent,
            } satisfies SatiristCard;
          } else if (persona === "linkedin_analyst") {
            cardData = {
              type: "linkedin_analyst_insight",
              imageContent: data.imageContent,
            };
          } else {
            cardData = {
              type: "pattern_spotter_insight",
              imageContent: data.imageContent,
            } satisfies PatternSpotterCard;
          }
          console.log(`🖼️ [${persona}] Image content found, creating cardData.`);
        }
      } else {
        // Default case: all other personas (business_storyteller, cricket_storyteller, etc.)
        if (!data.content || typeof data.content !== "string") {
          throw new Error('AI response missing required "content" field.');
        }
        tweetContent = data.content;
      }
  
      // ========================================
      // STEP 3: Handle CTA and length validation
      // ========================================
      const ctaString = data.gibbiCTA ? "\n\n" + data.gibbiCTA : "";
      const totalLength = tweetContent.length + ctaString.length;

      if (persona !== "linkedin_analyst" && totalLength > 280) {
        console.error("Generated tweet exceeds 280 characters");
      }
  
      let reasoning: Record<string, string> | undefined;
      // --- MODIFIED: Handle reasoning with optional chaining ---
      if (persona === "pattern_spotter") {
        if (data) {
          // if (typeof data.reasoning !== "object") {
          //   throw new Error(
          //     "AI response for pattern_spotter has invalid reasoning: must be an object."
          //   );
          // }
          // reasoning = data.reasoning;
          // Validate structure of reasoning using optional chaining
  
          console.log(
            `🧠 [PatternSpotter] Extracted data: ${JSON.stringify(
              data,
              null,
              2
            )}`
          );
        } else {
          console.warn(
            `⚠️ [PatternSpotter] reasoning is undefined (optional, proceeding without validation).`
          );
        }
      }
      // ========================================
      // STEP 4: Build the EnhancedTweet object
      // ========================================
      const tweet: EnhancedTweet = {
        content: tweetContent,
        // ✨ FIXED: Ensure hashtags are an empty array for pattern_spotter AND satirist
        hashtags:
          persona === "pattern_spotter" || persona === "satirist" || persona === "linkedin_analyst"
            ? []
            : data.hashtags || [],
        persona: persona,
        engagementHooks: data.teachingElements || [],
        gibbiCTA: data.gibbiCTA || undefined,
        contentType: "explanation",
        selectedHeadlineNumber: data.selectedHeadlineNumber || undefined,
      };
  
      // ========================================
      // STEP 5: Final validation - source URL required for certain personas (softened for light context)
      // ========================================
      if (
        (persona === "satirist" || persona === "pattern_spotter" || persona === "linkedin_analyst") &&
        !sourceUrl
      ) {
        if (!rssContext || rssContext.length < 100) {
          console.warn(
            `⚠️ [${persona}] Light/empty RSS context detected - allowing unattributed tweet (improve sources).`
          );
          // Proceed without sourceUrl (set to undefined; track in DB as 'internal')
        } else {
          console.error(
            `❌ [${persona}] Critical validation failed: No source URL extracted for tweet. This tweet will be rejected.`
          );
          console.error(`Tweet content: "${tweetContent}"`);
          console.error(`Selected headline: ${data.selectedHeadlineNumber}`);
          throw new Error(
            `${persona} tweet missing source URL - cannot proceed without attribution`
          );
        }
      }
  
      // ========================================
      // STEP 6: Return the complete result
      // ========================================
      return { tweet, cardData, sourceUrl, reasoning };
    } catch (error) {
      console.error(
        `Failed to parse AI tweet response. Content: "${content}"`,
        error
      );
      return null;
    }
  }