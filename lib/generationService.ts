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
import { getAllPersonas } from "./personas";
import {
  getRecentPatternData,
} from "./db";

// Lazy initialization of the client with thread-safe pattern
let deepseekClientInstance: OpenAI | null = null;
let clientInitPromise: Promise<OpenAI> | null = null;

function getDeepseekClient(): OpenAI {
  if (deepseekClientInstance) {
    return deepseekClientInstance;
  }
  
  // If already initializing, wait for that promise
  if (clientInitPromise) {
    throw new Error('Client initialization in progress');
  }
  
  clientInitPromise = (async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      clientInitPromise = null;
      throw new Error("DEEPSEEK_API_KEY is not defined in environment variables");
    }
    deepseekClientInstance = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
    clientInitPromise = null;
    return deepseekClientInstance;
  })();
  
  throw new Error('Client initialization in progress');
}

// Async version that properly waits for initialization
export async function getDeepseekClientAsync(): Promise<OpenAI> {
  if (deepseekClientInstance) {
    return deepseekClientInstance;
  }
  
  // Prevent multiple initialization attempts
  if (!clientInitPromise) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not defined in environment variables");
    }
    clientInitPromise = (async () => {
      deepseekClientInstance = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com",
      });
      return deepseekClientInstance;
    })();
  }
  
  return clientInitPromise;
}

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
    // --- MODIFIED: Dynamic RSS-based persona check for recent data ---
    const allPersonas = await getAllPersonas();
    const rssPersonaKeys = allPersonas.filter(p => p.rss_sources && p.rss_sources.length > 0).map(p => p.key);
    
    if (
      config.connected_account_id &&
      config.persona &&
      rssPersonaKeys.includes(config.persona) &&
      !config.recentPatterns
    ) {
      console.log(
        `[Single Tweet] Fetching recent data for account ${config.connected_account_id}...`
      );
      // Get recent patterns for any persona with RSS sources
      const allPersonas = await getAllPersonas();
      const rssPersonaKeys = allPersonas.filter(p => p.rss_sources && p.rss_sources.length > 0).map(p => p.key);
      
      if (config.persona && rssPersonaKeys.includes(config.persona)) {
        const recentData = await getRecentPatternData(config.connected_account_id, 5);
        config.recentPatterns = recentData.patterns;
        config.usedSourceUrls = recentData.usedSourceUrls;
      }
    }

    // --- MODIFIED: Call imported function ---
    const { prompt, persona, rssContext } = await generateTweetPrompt(config);

    // --- MODIFIED: Dynamic RSS-based persona check ---
    let actualHeadlineCount: number | undefined;
    if (rssContext && persona.key) {
      const allPersonas = await getAllPersonas();
      const rssPersonaKeys = allPersonas.filter(p => p.rss_sources && p.rss_sources.length > 0).map(p => p.key);
      if (rssPersonaKeys.includes(persona.key)) {
        const headlineMatches = rssContext.match(/### ARTICLE \d+/g);
        actualHeadlineCount = headlineMatches
          ? headlineMatches.length
          : undefined;
        console.log(
          `📊 [${persona.key}] Counted ${actualHeadlineCount} "### ARTICLE" blocks in RSS context for validation`
        );
      }
    }

    const client = await getDeepseekClientAsync();
    const response = await client.chat.completions.create({
      model: GENERATION_CONFIG.ai.model,
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

    // Log reasoning if available (could be stored in DB later)
    if (reasoning) {
      console.log(`📝 [Server Log] Reasoning for tweet on ${sourceUrl || "unknown source"}:`, JSON.stringify(reasoning, null, 2));
    }
    
    const imageUrl: string | undefined = undefined;
    let imageStatus: "none" | "pending" = "none";
    const personaConfig = (persona.config as Record<string, unknown>) || {};
    const imageProbability = Number(personaConfig.image_probability) || 0;

    console.log(
      `🔍 Checking image generation for persona ${persona.name}: probability=${imageProbability}`
    );

    if (imageProbability > 0 && cardData) {
      // If cardData exists and probability is > 0, we can generate an image
      console.log(
        `🖼️ Queueing async image generation for ${persona.name} with key ${persona.key}`
      );
      imageStatus = "pending";
    } else if (imageProbability > 0 && !cardData) {
      console.log(
        `🔍 Image generation enabled but no card data for persona ${persona.name} (text-only format selected)`
      );
    } else {
      console.log(
        `🔍 Image generation disabled for persona ${persona.name}`
      );
    }

    const contentHash = generateContentHash(tweetData);

    console.log(
      `✅ Generated enhanced tweet for ${persona.name} on content Hash: ${contentHash}`
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
  const usedHeadlines: number[] = [];

  // RSS-based personas get recent content for deduplication
  const allPersonas = await getAllPersonas();
  const rssPersonaKeys = allPersonas.filter(p => p.rss_sources && p.rss_sources.length > 0).map(p => p.key);
  
  if (
    config.connected_account_id &&
    config.persona &&
    rssPersonaKeys.includes(config.persona)
  ) {
    const recentData = await getRecentPatternData(config.connected_account_id, 5);
    config.recentPatterns = recentData.patterns;
    config.usedSourceUrls = recentData.usedSourceUrls;
    console.log(
      `🔍 [Batch: ${config.persona}] Initial context: ${recentData.patterns.length} recent patterns and ${recentData.usedSourceUrls.length} used source URLs to avoid.`
    );
  }

  for (let i = 0; i < count; i++) {
    // Use config.usedSourceUrls which is set above
    const batchConfig: TweetGenerationConfig = {
      ...config,
      batchPosition: i + 1,
      batchSize: count,
      previousWords: undefined,
      previousHeadlines: usedHeadlines.length > 0 ? usedHeadlines : undefined,
      recentPatterns: config.recentPatterns ? config.recentPatterns : undefined,
      usedSourceUrls: config.usedSourceUrls ? config.usedSourceUrls : undefined,
    };

    console.log(
      `🔄 [Batch ${i + 1}/${count}] Generating with ${
        config.usedSourceUrls?.length || 0
      } blocked URLs...`
    );

    const result = await generateTweet(batchConfig);

      if (result) {
        tweets.push(result);

        // Track headline numbers (for RSS-based personas)
        if (
          config.persona &&
          rssPersonaKeys.includes(config.persona) &&
          result.selectedHeadlineNumber
        ) {
          usedHeadlines.push(result.selectedHeadlineNumber);
        }

        // Track used source URLs (in config for next iteration)
        if (result.sourceUrl && config.usedSourceUrls && !config.usedSourceUrls.includes(result.sourceUrl)) {
          config.usedSourceUrls.push(result.sourceUrl);
        }
      }
  }

  if (config.usedSourceUrls && config.usedSourceUrls.length > 0) {
    console.log(`🚫 Final blocked URLs (total ${config.usedSourceUrls.length})`);
  }
  return tweets;
}

export async function generateEngagementReply(
  tweet: TweetV2,
  target: EngagementTarget,
  engagementPersonaKey: string
): Promise<string | null> {
  // Get persona from DB - personas table should have engagement prompts in config
  const { getPersona } = await import('@/lib/db');
  const persona = await getPersona(engagementPersonaKey);
  const pConfig = (persona?.config as Record<string, unknown>) || {};
  
  if (!persona || !pConfig.systemPrompt) {
    console.error(
      `[Generator] Engagement persona '${engagementPersonaKey}' not found in DB.`
    );
    return null;
  }

  const prompt = `${pConfig.systemPrompt}

  Reply Context:
  - You are replying to: @${target.username} (Tier ${target.tier} influencer: ${target.description})
  - Their original tweet: "${tweet.text}"
  `;

  try {
    console.log(
      `[Generator] Generating engagement reply for tweet ${tweet.id} with persona ${persona.name}`
    );
    const client = await getDeepseekClientAsync();
    const response = await client.chat.completions.create({
      model: GENERATION_CONFIG.ai.model,
      messages: [{ role: "user", content: prompt }],
      temperature: GENERATION_CONFIG.ai.temperature,
      max_tokens: GENERATION_CONFIG.ai.maxTokens,
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