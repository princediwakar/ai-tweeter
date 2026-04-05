// lib/generationProcessing.ts
import {
  getPersonaByKey,
  selectPersonaByWeight,
  getRandomPersonaForHandle,
  isPersonaAllowedForHandle,
  type Persona,
} from "@/lib/personas";
import {
  EnhancedTweet,
  CardData,
} from "./types";
import { accountService, type Account } from "./accountService";
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

export async function generateTweetPrompt(
  config: TweetGenerationConfig
): Promise<{ prompt: string; persona: Persona; rssContext?: string }> {
  const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;

  let account: any = null;

  if (config.connected_account_id && config.connected_account_id !== "fallback") {
    account = await accountService.getAccount(config.connected_account_id);
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

  let rssContext = config.rssContext || "";

  if (!rssContext && useRSSSources && config.persona) {
    try {
      rssContext = await getDynamicContext(
        config.persona,
        config.topic || "",
        config.connected_account_id
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
      if (!isPersonaAllowedForHandle(config.persona, account.twitter_handle)) {
        console.warn(`⚠️ Persona ${config.persona} not allowed, falling back.`);
        persona = await getRandomPersonaForHandle(account.twitter_handle);
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
        persona = await getRandomPersonaForHandle(account.twitter_handle);
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

  // Decision logic for image vs text (Legacy behavior preserved)
  if (persona.key === "satirist" && !config.satiristFormat) {
    const prob = persona.config.image_probability ?? 0.1;
    config.satiristFormat = Math.random() < prob ? "image" : "text-only";
  }
  if (persona.key === "pattern_spotter" && !config.patternSpotterFormat) {
    const prob = persona.config.image_probability ?? 0.1;
    config.patternSpotterFormat = Math.random() < prob ? "image" : "text-only";
  }
  if (persona.key === "english_vocab_builder" && !config.vocabFormat) {
    config.vocabFormat = Math.random() < 0.3 ? "image" : "text-only";
  }

  const personaGenerator = getPersonaGenerator(persona);
  const context: GenerationContext = { account, useRSSSources, rssContext };
  const prompt = personaGenerator.generatePrompt(config, context, { timeMarker, tokenMarker });

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

    // Source extraction for RSS-based personas
    if (rssContext && ["satirist", "pattern_spotter", "linkedin_analyst"].includes(personaKey)) {
      if (data.selectedHeadlineNumber) {
        const num = data.selectedHeadlineNumber;
        const articleRegex = new RegExp(`### ARTICLE ${num}\n({[\\s\\S]*?})\n### END ARTICLE ${num}`, "m");
        const match = rssContext.match(articleRegex);
        if (match?.[1]) {
           try {
             sourceUrl = JSON.parse(match[1]).url;
           } catch { /* ignore */ }
        }
      }
    }

    // Mapping card data for specialized personas
    if (personaKey === "english_vocab_builder" && data.cardData) {
      cardData = { ...data.cardData };
    } else if (["satirist", "pattern_spotter"].includes(personaKey)) {
      cardData = data.cardData || null;
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
    console.error("Failed to parse AI response:", error);
    return null;
  }
}