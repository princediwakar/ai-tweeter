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

  // Determine platform - default to twitter
  const platform = (account?.platform || 'twitter') as 'twitter' | 'linkedin';
  
  // Use the Jina/Tavily extracted text (passed in via config from the Cron/Trigger)
  const sourceContext = config.sourceContext || "";
  const pConfig = (persona.config as Record<string, any>) || {};

  // Build Persona Context - include full description and key config fields
  const formatRules = Array.isArray(pConfig.format_rules) 
    ? pConfig.format_rules.join(' | ') 
    : 'Write in first person. Short paragraphs. Plain English. No emojis or hashtags.';

  const hookMechanics = pConfig.hook_mechanics || 'Open with a bold statement or counterintuitive insight. No rhetorical questions.';
  const framingBias = pConfig.framing_bias || '';
  const theEnemy = pConfig.the_enemy || '';
  const analyticalFramework = pConfig.analytical_framework || '';
  const sourceLogic = pConfig.source_logic || '';
  const antiPatterns = pConfig.anti_patterns || '';

  // Platform-specific constraints
  const platformConstraints = platform === 'twitter' 
    ? `Twitter: MAX 240 characters. One clear, standalone take. No threads. No paragraphs.`
    : `LinkedIn: 800-1200 characters. Professional but authentic. 2-3 paragraphs with specific examples.`;

  // Voice refinement from persona description
  const voiceDirectives = persona.description ? `
VOICE REFERRALS FROM YOUR PROFILE:
- You sound like a battle-tested operator who's been in the trenches
- Use words like: execution, signal, leverage, system, outcome, operator, build, ship, metric, founder
- Avoid: game-changer, revolutionary, disrupt, hustle, grind, thought leader, viral, hype
- Never sound like an advice thread or thought leader
- Be direct, pragmatic, outcome-driven` : '';

  // Build comprehensive persona context
  const personaContext = persona.description 
    ? `PERSONA: ${persona.name}

${persona.description}

KEY DIRECTIVES:
- Hook style: ${hookMechanics}
- Framing bias: ${framingBias}
- What to fight: ${theEnemy}
- How to analyze: ${analyticalFramework}
- Source transformation: ${sourceLogic}
- What to avoid: ${antiPatterns}
- Format rules: ${formatRules}${voiceDirectives}`
    : `PERSONA: ${persona.name || 'Professional'}
Core thesis: ${pConfig.core_thesis || 'Share useful insights'}
Enemy: ${pConfig.the_enemy || 'Vanity metrics'}
Hook: ${hookMechanics}
Format: ${formatRules}${voiceDirectives}`;

  const memoryContext = config.recentPatterns && config.recentPatterns.length > 0
    ? `\nYOUR RECENT PAST POSTS (DO NOT REPEAT THESE TOPICS/IDEAS):\n${config.recentPatterns.map((p, i) => `${i+1}. ${p.text.substring(0, 150)}...`).join('\n')}`
    : '\nYOUR RECENT PAST POSTS: None yet.';

  const prompt = `${personaContext}

PLATFORM: ${platformConstraints}
${memoryContext}

CRITICAL INSTRUCTIONS:
1. Write as YOUR personal take, not a summary or advice
2. Sound like ONE specific person, not a generic advisor
3. Include a concrete observation or specific example
4. Make it feel fresh, not recycled content
5. DO NOT repeat topics, themes, or specific wording from YOUR RECENT PAST POSTS.

YOUR TASK - The Colleague Test:
Would you forward this to a smart colleague who'd judge you for wasting their time?
If yes: Write what YOU would post - make it genuinely useful and in YOUR voice.
If no: Skip it entirely.

CONTEXT - Content to potentially share:
${sourceContext ? sourceContext : 'No external content provided. Generate a standalone, completely original thought based on your persona, beliefs, and topics. Pick an unaddressed angle from your expertise.'}

STRICT RULES:
- Write in YOUR voice, not as a summary
- Never say "this article", "this post", "according to"
- Never start with "Here's my take" or "I think"
- Never share personal journey ("I built this")
- No generic advice language ("most people", "the real", "focus on")
- Content must be ORIGINAL take, not rehash
- ${formatRules}

SKIP CRITERIA - Reject if ANY of these apply (UNLESS generating a standalone thought due to no external content):
- TOO SHORT: Content < 500 characters (not enough substance to be useful)
- PERSONAL PROJECT: Author is writing about their own product, service, or launch
  Red flags: "I built", "we launched", "announcing my", "introducing our", "check out", "try my"
- GENERIC ADVICE: Fluff without specifics
- NO ORIGINAL INSIGHT: Just a summary or rehash of known information
- REPEATING PAST POSTS: The core idea is too similar to one of YOUR RECENT PAST POSTS.

OUTPUT - Return ONLY valid JSON:
{
  "decision": "share" | "skip",
  "selected_url": "The source URL (if sharing external content, empty string if standalone)",
  "content": "Your original take (if sharing or standalone)",
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