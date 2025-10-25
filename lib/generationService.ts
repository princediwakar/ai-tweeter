// lib/generationService.ts
import OpenAI from "openai";
// --- MODIFIED ---
// Imports for personas, accountService, context, etc., have been moved
// to generationProcessing.ts
import { EnhancedTweet } from "./types";
// --- END MODIFIED ---
import type {
  TweetGenerationConfig,
  RecentPattern,
} from "./generation/types";
// --- MODIFIED ---
// Import the new helper functions
import {
  generateTweetPrompt,
  parseAndValidateTweetResponse,
} from "./generationProcessing";
// --- END MODIFIED ---
import { generateContentHash } from "./generation/utils";
import { TweetV2 } from "./twitter";
import { EngagementTarget } from "./engagement/targets";
import { GENERATION_CONFIG } from "./generation/config";
import {
  getRecentPatternData,
  getRecentSatiristData,
  getRecentVocabularyWords,
} from "./db";

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// --- MODIFIED ---
// generateTweetPrompt function has been moved to lib/generationProcessing.ts
// --- END MODIFIED ---

// --- MODIFIED ---
// parseAndValidateTweetResponse function has been moved to lib/generationProcessing.ts
// --- END MODIFIED ---

// 2. UPDATE generateTweet to count and pass actualHeadlineCount
export async function generateTweet(
  config: TweetGenerationConfig = {}
): Promise<EnhancedTweet | null> {
  try {
    if (
      config.persona === "satirist" &&
      config.account_id &&
      !config.recentPatterns
    ) {
      console.log(
        `[Single Tweet] Fetching recent satirist data for account ${config.account_id}...`
      );
      const recentData = await getRecentSatiristData(config.account_id, 5);
      config.recentPatterns = recentData.patterns;
      config.usedSourceUrls = recentData.usedSourceUrls;
    }

    if (
      config.persona === "pattern_spotter" &&
      config.account_id &&
      !config.recentPatterns
    ) {
      console.log(
        `[Single Tweet] Fetching recent pattern data for account ${config.account_id}...`
      );
      const recentData = await getRecentPatternData(config.account_id, 5);
      config.recentPatterns = recentData.patterns;
      config.usedSourceUrls = recentData.usedSourceUrls;
    }

    // --- MODIFIED: Call imported function ---
    const { prompt, persona, rssContext } = await generateTweetPrompt(config);

    // NEW: Count actual headlines in RSS context for validation
    let actualHeadlineCount: number | undefined;
    if (rssContext) {
      // ✨ MODIFIED: Both personas now use the same "### ARTICLE" format
      if (persona.key === "satirist" || persona.key === "pattern_spotter") {
        const headlineMatches = rssContext.match(/### ARTICLE \d+/g);
        actualHeadlineCount = headlineMatches
          ? headlineMatches.length
          : undefined;
        console.log(
          `📊 [${persona.key}] Counted ${actualHeadlineCount} "### ARTICLE" blocks in RSS context for validation`
        );
      }
    }

    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: "user", content: prompt }],
      temperature: GENERATION_CONFIG.ai.temperature,
      max_tokens: GENERATION_CONFIG.ai.maxTokens,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("AI returned no content.");
    }

    // --- MODIFIED: Call imported function ---
    const parsedResponse = parseAndValidateTweetResponse(
      content,
      persona.key,
      rssContext,
      actualHeadlineCount // NEW: Pass the count
    );
    if (!parsedResponse) {
      throw new Error("Failed to parse or validate AI response.");
    }

    // MODIFIED: Destructure sourceUrl from the parsed response
    const {
      tweet: tweetData,
      cardData,
      sourceUrl,
      reasoning,
    } = parsedResponse;

    // --- NEW: Log the 5 Whys to the server (console for now; extend to DB) ---
    if (reasoning && config.persona === "pattern_spotter") {
      // Console log (temporary)
      console.log(
        `📝 [Server Log] 5 Whys for tweet on ${sourceUrl || "unknown source"}:`,
        JSON.stringify(reasoning, null, 2)
      );
    }
    const imageUrl: string | undefined = undefined;
    let imageStatus: "none" | "pending" = "none";

    console.log(
      `🔍 Checking image generation for persona ${persona.displayName}: enabled=${persona.image_generation?.enabled}`
    );

    if (persona.image_generation?.enabled && cardData) {
      // If cardData exists, it means we decided to generate an image (format decision already made for satirist)
      console.log(
        `🖼️ Queueing async image generation for ${persona.displayName} with key ${persona.key}`
      );
      imageStatus = "pending";
    } else if (persona.image_generation?.enabled && !cardData) {
      console.log(
        `🔍 Image generation enabled but no card data for persona ${persona.displayName} (text-only format selected)`
      );
    } else {
      console.log(
        `🔍 Image generation disabled for persona ${persona.displayName}`
      );
    }

    const contentHash = generateContentHash(tweetData);

    console.log(
      `✅ Generated enhanced tweet for ${persona.displayName} on content Hash: ${contentHash}`
    );

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

export async function generateBatchTweets(
  count: number,
  config: TweetGenerationConfig = {}
): Promise<EnhancedTweet[]> {
  const tweets: EnhancedTweet[] = [];
  const generatedWords: string[] = [];
  const usedHeadlines: number[] = [];

  let recentWords: string[] = [];
  if (config.account_id && config.persona === "english_vocab_builder") {
    recentWords = await getRecentVocabularyWords(config.account_id);
    console.log(
      `📚 Found ${recentWords.length} recent vocabulary words to avoid repetition`
    );
  }

  let recentPatterns: RecentPattern[] = [];
  let usedSourceUrls: string[] = [];

  // ✨ MODIFIED: Check for both personas
  if (
    config.account_id &&
    (config.persona === "pattern_spotter" || config.persona === "satirist")
  ) {
    let recentData;
    if (config.persona === "pattern_spotter") {
      recentData = await getRecentPatternData(config.account_id, 5);
    } else {
      recentData = await getRecentSatiristData(config.account_id, 5);
    }
    recentPatterns = recentData.patterns;
    usedSourceUrls = recentData.usedSourceUrls;
    console.log(
      `🔍 [Batch: ${config.persona}] Initial context: ${recentPatterns.length} recent patterns and ${usedSourceUrls.length} used source URLs to avoid.`
    );
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

    console.log(
      `🔄 [Batch ${i + 1}/${count}] Generating with ${
        usedSourceUrls.length
      } blocked URLs...`
    );

    const result = await generateTweet(batchConfig);

    if (result) {
      tweets.push(result);

      // Track vocab words
      if (
        result.persona === "english_vocab_builder" &&
        result.cardData &&
        result.cardData.type !== "satirist_insight" &&
        result.cardData.type !== "pattern_spotter_insight" &&
        result.cardData.word
      ) {
        const newWord = result.cardData.word.toLowerCase();
        generatedWords.push(newWord);
      }

      // Track headline numbers (for satirist AND pattern_spotter)
      if (
        (result.persona === "satirist" ||
          result.persona === "pattern_spotter") &&
        result.selectedHeadlineNumber
      ) {
        usedHeadlines.push(result.selectedHeadlineNumber);
      }

      // ✅ CRITICAL: Update blocklist immediately for next tweet in batch
      if (
        result.persona === "pattern_spotter" ||
        result.persona === "satirist"
      ) {
        // Add this tweet's source URL to blocklist for next iteration
        if (result.sourceUrl && !usedSourceUrls.includes(result.sourceUrl)) {
          usedSourceUrls.push(result.sourceUrl);
          console.log(
            `🚫 [Batch ${
              i + 1
            }] Blocked source for next tweet: ${result.sourceUrl.substring(
              0,
              50
            )}...`
          );
        }
      }

      // Update recent patterns
      if (
        result.persona === "pattern_spotter" ||
        result.persona === "satirist"
      ) {
        recentPatterns.push({
          text: result.content,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Small delay between generations to avoid rate limits
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(
    `📊 Enhanced batch generation complete: ${tweets.length}/${count} successful tweets`
  );
  console.log(`🔤 Generated words: ${generatedWords.join(", ")}`);
  console.log(`🚫 Avoided ${recentWords.length} recent words from database`);
  if (usedHeadlines.length > 0) {
    console.log(`📰 Used headlines: #${usedHeadlines.join(", #")}`);
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
  const { getEngagementPersona } = await import("./engagement/personas/index");

  const engagementPersona = getEngagementPersona(engagementPersonaKey);
  if (!engagementPersona) {
    console.error(
      `[Generator] Engagement persona '${engagementPersonaKey}' not found.`
    );
    return null;
  }

  const prompt = `${engagementPersona.systemPrompt}

  Reply Context:
  - You are replying to: @${target.username} (Tier ${target.tier} influencer: ${target.description})
  - Their original tweet: "${tweet.text}"
  `;

  try {
    console.log(
      `[Generator] Generating engagement reply for tweet ${tweet.id} with persona ${engagementPersona.displayName}`
    );
    const response = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });
    const replyText = response.choices[0].message.content;

    if (!replyText) {
      console.error("[Generator] AI returned an empty reply.");
      return null;
    }

    const cleanedReply = replyText.replace(/"/g, "").trim();

    if (cleanedReply.length > 280) {
      console.error(
        `[Generator] ❌ Generated reply exceeds 280 chars (${cleanedReply.length}). Rejecting this reply.`
      );
      console.error(`[Generator] Reply text: "${cleanedReply}"`);
      return null;
    }

    console.log(
      `[Generator] ✅ Generated reply (${cleanedReply.length} chars): "${cleanedReply}"`
    );
    return cleanedReply;
  } catch (error) {
    console.error("[Generator] Error generating AI reply:", error);
    return null;
  }
}