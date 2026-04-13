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
  EnhancedPost,
  CardData,
} from "./types";
import { connectedAccountsService, type ConnectedAccount as Account } from "./connectedAccounts";
import type {
  PostGenerationConfig,
} from "./types";

export async function generatePostPrompt(
  config: PostGenerationConfig
): Promise<{ prompt: string; persona: Persona; sourceContext?: string }> {
  
  let account: any = null;
  if (config.connected_account_id && config.connected_account_id !== "fallback") {
    account = await connectedAccountsService.getById(config.connected_account_id);
  }

  // 1. Resolve the Persona
  let persona: Persona | undefined;
  if (config.persona) {
    if (account && !isPersonaAllowedForHandle(config.persona, account.account_username)) {
      console.warn(`⚠️ Persona ${config.persona} not allowed, falling back.`);
      persona = await getRandomPersonaForHandle(account.account_username);
    } else {
      persona = await getPersonaByKey(config.persona);
    }
  }

  if (!persona) {
    persona = account 
      ? await getRandomPersonaForHandle(account.account_username).catch(() => selectPersonaByWeight())
      : await selectPersonaByWeight();
  }

  if (!persona) {
    throw new Error("Invalid persona specified or found in database");
  }

  // Use the Jina/Tavily extracted text (passed in via config from the Cron/Trigger)
  const sourceContext = config.sourceContext || "";
  const pConfig = (persona.config as Record<string, any>) || {};

  // 2. The Colleague Test Prompt
  // New authentic prompt: "Would I forward this to a colleague who would judge me?"
  const sourceType = pConfig.source_type || 'general';
  const formatRules = Array.isArray(pConfig.format_rules) 
    ? pConfig.format_rules.join(' | ') 
    : 'Short paragraphs. Natural English. No hashtags.';

  const prompt = `You are a ${pConfig.core_thesis || 'professional'} who reads industry news daily. 
You have limited time and zero patience for fluff.

PLATFORM: Twitter (punchy, 140-280 chars, one clear insight)
ALTERNATIVE: LinkedIn (thoughtful paragraphs, 800-2000 chars)

YOUR TASK - The Colleague Test:
Would you forward this article to a smart coworker who'd judge you for wasting their time?
If yes: Write what you'd post - make it genuinely useful.
If no: Skip it entirely.

CONTEXT - Articles from your domain:
${sourceContext ? sourceContext : 'No articles available. Skip.'}

STRICT RULES:
- Never start with "Here's my take" or "I think"
- Never share personal journey ("I built this")
- Write like you're sending to a Slack channel of professionals
- ${formatRules}

OUTPUT - Return ONLY valid JSON:
{
  "decision": "share" | "skip",
  "selected_url": "The article URL (if sharing)",
  "content": "Your post text (if sharing)",
  "skip_reason": "Why nothing was worth sharing (if skipping)"
}`;

  return { prompt, persona, sourceContext };
}

export function parseAndValidatePostResponse(
  content: string,
  personaKey: string,
  sourceContext?: string,
  actualHeadlineCount?: number
): {
  post: EnhancedPost;
  cardData: CardData | null;
  sourceUrl: string | undefined;
  skipReason?: string;
  reasoning?: Record<string, string>;
} | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const data = JSON.parse(cleanedContent);

    if (data.error) throw new Error(`AI error: ${data.error}`);

    // Handle skip decision
    if (data.decision === "skip") {
      console.log(`[Parser] AI chose to skip: ${data.skip_reason || 'No reason provided'}`);
      return {
        post: {
          content: '',
          persona: personaKey,
          selectedHeadlineNumber: undefined,
          hashtags: [],
          engagementHooks: [],
          contentType: "single_tweet",
        },
        cardData: null,
        sourceUrl: undefined,
        skipReason: data.skip_reason || 'AI chose to skip',
        reasoning: data
      };
    }

    const tweetContent = data.content;
    if (!tweetContent || typeof tweetContent !== 'string') {
      throw new Error("AI returned an invalid or missing tweet content string.");
    }

    // 1. Try to get the direct URL first
    let sourceUrl: string | undefined = data.selected_url || data.sourceUrl || data.url;

    // 2. Aggressive Fallback: If it returned an integer
    const articleNum = data.selectedArticle ?? data.selectedHeadlineNumber;
    
    if (!sourceUrl && articleNum !== undefined && sourceContext) {
      const num = parseInt(articleNum, 10);
      if (!isNaN(num)) {
        const articleRegex = new RegExp(`### (?:ARTICLE|TOPIC SOURCE) ${num}\\n([\\s\\S]*?)(?:### END|### (?:ARTICLE|TOPIC SOURCE)|$)`, "i");
        const match = sourceContext.match(articleRegex);
        
        if (match && match[1]) {
          const urlMatch = match[1].match(/https?:\/\/[^\s"'}\\\]]+/);
          if (urlMatch) {
            sourceUrl = urlMatch[0];
            console.log(`🔍 [Parser] Successfully extracted URL from Article ${num}: ${sourceUrl}`);
          }
        }
      }
    }

    let cardData: CardData | null = null;
    if (data.cardData && typeof data.cardData === 'object') {
      cardData = { ...data.cardData };
    }

    return {
      post: {
        content: tweetContent,
        persona: personaKey,
        selectedHeadlineNumber: articleNum, 
        hashtags: [], 
        engagementHooks: [],
        contentType: "single_tweet",
      },
      cardData,
      sourceUrl,
      reasoning: data 
    };
  } catch (error) {
    console.error("❌ Failed to parse AI response:", error instanceof Error ? error.message : error);
    return null; 
  }
}