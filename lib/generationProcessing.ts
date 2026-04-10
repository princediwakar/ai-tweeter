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
import type {
  TweetGenerationConfig,
} from "./generation/types";

export async function generateTweetPrompt(
  config: TweetGenerationConfig
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

  // 2. The Chain of Thought Prompt Architecture
  // We explicitly inject the new psychological DNA here.
  const prompt = `You are a highly opinionated industry insider. Your goal is to write a social media post reacting to recent industry news.

YOUR PSYCHOLOGICAL DNA:
- Core Thesis: ${pConfig.core_thesis || 'Signal is found in hard data, not hype.'}
- The Enemy: ${pConfig.the_enemy || 'Generic corporate fluff and vanity metrics.'}
- Analytical Framework: ${pConfig.analytical_framework || 'Look at the underlying mechanics and economics.'}

YOUR EXECUTION RULES:
- Framing Bias: ${pConfig.framing_bias || 'Focus on operational reality.'}
- Hook Mechanics: ${pConfig.hook_mechanics || 'Start with a blunt fact.'}
- Format Rules: ${Array.isArray(pConfig.format_rules) ? pConfig.format_rules.join(' | ') : 'Short paragraphs. Natural English. No hashtags.'}

AVAILABLE CONTEXT (Raw Extracted Articles):
${sourceContext ? sourceContext : 'No specific news provided. Draw on your general industry knowledge.'}

YOUR INSTRUCTIONS:
You must perform a two-step "Chain of Thought" process.
Step 1: Write an 'internal_monologue'. Apply your Analytical Framework to the context. What is 'The Enemy' getting wrong here? How does this data prove your Core Thesis? Think aggressively.
Step 2: Write the 'content'. Based ONLY on your monologue, draft the final post. Strictly obey your Hook Mechanics and Format Rules. Do not summarize the article; give your sharpest take on it.

OUTPUT FORMAT:
You must return ONLY a valid JSON object matching this exact schema:
{
  "selected_url": "The exact URL of the article you chose to react to (if any)",
  "internal_monologue": "Your raw, unfiltered strategic analysis...",
  "content": "The final text of the post to be published..."
}`;

  return { prompt, persona, sourceContext };
}

export function parseAndValidateTweetResponse(
  content: string,
  personaKey: string,
  sourceContext?: string,
  actualHeadlineCount?: number // Keeping this in case your generationService still passes it
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

    const tweetContent = data.content || data.tweetText || data.tweet; // Catch multiple legacy formats
    if (!tweetContent || typeof tweetContent !== 'string') {
      throw new Error("AI returned an invalid or missing tweet content string.");
    }

    // 1. Try to get the direct URL first (The Phase 3 way)
    let sourceUrl: string | undefined = data.selected_url || data.sourceUrl || data.url;

    // 2. Aggressive Fallback: If it returned an integer (The Legacy way)
    const articleNum = data.selectedArticle ?? data.selectedHeadlineNumber;
    
    if (!sourceUrl && articleNum !== undefined && sourceContext) {
      const num = parseInt(articleNum, 10);
      if (!isNaN(num)) {
        // Hunt for the specific article block in the context
        const articleRegex = new RegExp(`### (?:ARTICLE|TOPIC SOURCE) ${num}\\n([\\s\\S]*?)(?:### END|### (?:ARTICLE|TOPIC SOURCE)|$)`, "i");
        const match = sourceContext.match(articleRegex);
        
        if (match && match[1]) {
          // Find the first valid HTTP/HTTPS link in that specific article block
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
      tweet: {
        content: tweetContent,
        persona: personaKey,
        selectedHeadlineNumber: articleNum, 
        hashtags: [], 
        engagementHooks: [],
        contentType: "single_tweet",
      },
      cardData,
      sourceUrl,
      // Pass the entire parsed object back as reasoning so you can always see what the AI was thinking
      reasoning: data 
    };
  } catch (error) {
    console.error("❌ Failed to parse AI response:", error instanceof Error ? error.message : error);
    return null; 
  }
}