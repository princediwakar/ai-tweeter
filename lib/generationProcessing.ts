// lib/generationProcessing.ts
import {
  getPersonaByKey,
  selectPersonaByWeight,
  getRandomPersonaForHandle,
  isPersonaAllowedForHandle,
  getAllPersonas,
  type Persona,
} from "@/lib/personas";
import {
  EnhancedTweet,
  CardData,
} from "./types";
import { connectedAccountsService, type ConnectedAccount as Account } from "./connectedAccounts";
import { getDynamicContext } from "./contentSource";
import { fetchFromGoogle } from "./contentSource/fetchers/google";
import {
  generateVariationMarkers,
  shouldUseRSSSources,
} from "./generation/utils";
import { getPersonaGenerator } from "./generation/personas";
import type {
  TweetGenerationConfig,
  GenerationContext,
} from "./generation/types";

export async function generateTweetPrompt(
  config: TweetGenerationConfig
): Promise<{ prompt: string; persona: Persona; rssContext?: string }> {
  const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;

  let account: any = null;

  if (config.connected_account_id && config.connected_account_id !== "fallback") {
    account = await connectedAccountsService.getById(config.connected_account_id);
    if (account) {
      console.log(
        `🎯 Account context: ${account.name} (${account.account_username})`
      );
    }
  }

  // CLEANED: Removed unnecessary IIFE, kept it simple and readable
  const allPersonas = await getAllPersonas();
  const rssPersonaKeys = allPersonas
    .filter(p => p.rss_sources && p.rss_sources.length > 0)
    .map(p => p.key);
  
  const isRssPersona = config.persona ? rssPersonaKeys.includes(config.persona) : false;
  let useRSSSources = shouldUseRSSSources(account);
  
  if (!useRSSSources && config.persona) {
    useRSSSources = isRssPersona;
  }

  console.log(
    `📰 RSS sources ${useRSSSources ? "enabled" : "disabled"} for account: ${
      account?.name || "unknown"
    }`
  );

  let rssContext = config.rssContext || "";

  // Fetch Google News context when user provides a topic
  let userTopicContext = "";
  if (config.topic && config.skipRSS) {
    try {
      const googleHeadlines = await fetchFromGoogle(config.topic);
      if (googleHeadlines.length > 0) {
        userTopicContext = googleHeadlines.map(h => 
          `### TOPIC SOURCE ${googleHeadlines.indexOf(h) + 1}\n${h.headline}\n${h.url || ''}\n### END SOURCE`
        ).join('\n\n');
        console.log(`🔍 (Google Fetch) Fetched ${googleHeadlines.length} results for "${config.topic}"`);
      }
    } catch (error) {
      console.warn("⚠️ Failed to fetch from Google, continuing without it:", error);
    }
  }

  if (!rssContext && useRSSSources && config.persona && !config.skipRSS && !config.topic) {
    try {
      rssContext = await getDynamicContext(
        config.persona,
        config.topic || "",
        config.connected_account_id,
        config.persona
      );
      console.log(
        `📰 (Single Fetch) Fetched RSS context for ${config.persona}: ${
          rssContext.length > 0 ? "success" : "no content"
        }`
      );
    } catch (error) {
      console.warn("⚠️ Failed to fetch RSS context, continuing without it:", error);
    }
  }

  let persona: Persona | undefined;

  if (config.persona) {
    if (config.connected_account_id && config.connected_account_id !== "fallback" && account) {
      if (!isPersonaAllowedForHandle(config.persona, account.account_username)) {
        console.warn(`⚠️ Persona ${config.persona} not allowed, falling back.`);
        persona = await getRandomPersonaForHandle(account.account_username);
      } else {
        persona = await getPersonaByKey(config.persona);
      }
    } else {
      persona = await getPersonaByKey(config.persona);
    }
  }

  if (!persona) {
    if (config.connected_account_id && config.connected_account_id !== "fallback" && account) {
      try {
        persona = await getRandomPersonaForHandle(account.account_username);
      } catch (error) {
        persona = await selectPersonaByWeight();
      }
    } else {
      persona = await selectPersonaByWeight();
    }
  }

  if (!persona) {
    throw new Error("Invalid persona specified or found in database");
  }

  // FIXED: Clone config to prevent mutating shared state across batch generations
  const safeConfig = { ...config };

  // Decision logic for image vs text - read from DB config
  const pConfig = (persona.config as Record<string, unknown>) || {};
  const imageProbability = Number(pConfig.image_probability) || 0;
  
  if (!safeConfig.generationFormat && imageProbability > 0) {
    safeConfig.generationFormat = Math.random() < imageProbability ? "image" : "text-only";
  }

  const personaGenerator = getPersonaGenerator(persona);
  const context: GenerationContext = { account, useRSSSources, rssContext, userTopicContext };
  const prompt = personaGenerator.generatePrompt(safeConfig, context, { timeMarker, tokenMarker });

  return { prompt, persona, rssContext };
}

export function parseAndValidateTweetResponse(
  content: string,
  personaKey: string,
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

    if (data.error) throw new Error(`AI error: ${data.error}`);

    let sourceUrl: string | undefined;
    let cardData: CardData | null = null;
    let tweetContent = data.tweetText || data.content;

    if (!tweetContent || typeof tweetContent !== 'string') {
      throw new Error("AI returned an invalid or missing tweet content string.");
    }

    // FIXED: Strict source extraction and hallucination validation
    if (rssContext && data.selectedHeadlineNumber !== undefined) {
      const num = parseInt(data.selectedHeadlineNumber, 10);

      // Validate against hallucinations! Throw error so the retry loop can catch it.
      if (actualHeadlineCount && (isNaN(num) || num < 1 || num > actualHeadlineCount)) {
        throw new Error(`AI hallucinated article number ${data.selectedHeadlineNumber}. Max valid is ${actualHeadlineCount}.`);
      }

      if (!isNaN(num)) {
        const articleRegex = new RegExp(`### ARTICLE ${num}\n({[\\s\\S]*?})\n### END ARTICLE ${num}`, "m");
        const match = rssContext.match(articleRegex);
        
        if (match?.[1]) {
           try {
             sourceUrl = JSON.parse(match[1]).url;
           } catch {
             console.warn(`⚠️ Failed to parse URL from RSS Context for article ${num}`);
           }
        } else {
           throw new Error(`Could not find expected ARTICLE ${num} block in RSS Context despite AI selecting it.`);
        }
      }
    }

    // Mapping card data safely
    if (data.cardData && typeof data.cardData === 'object') {
      cardData = { ...data.cardData };
    }

    return {
      tweet: {
        content: tweetContent,
        persona: personaKey,
        selectedHeadlineNumber: data.selectedHeadlineNumber,
        hashtags: [],
        engagementHooks: [],
        contentType: "single_tweet",
      },
      cardData,
      sourceUrl,
      reasoning: data.reasoning
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error instanceof Error ? error.message : error);
    // Returning null here will trigger the circuit breaker retry in the generationService
    return null; 
  }
}