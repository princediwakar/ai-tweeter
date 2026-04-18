// lib/personaGeneration.ts
import {
  personaDesigner,
  PersonaDesignResult,
} from "./services/personaDesigner";
import { personaService, CreatePersonaInput } from "./personaService";
import { sourceDiscoverer } from "./services/sourceDiscoverer";
import { PREDEFINED_PERSONAS } from "./predefinedPersonas";

export interface GenerationRequest {
  prompt: string;
  connectedAccountId: string;
  platform: "twitter" | "linkedin";
  regenerationCount?: number;
  predefinedKey?: string;
  includeRss?: boolean;
}

export interface PersonaGenerationResult {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
  config: CreatePersonaInput["config"];
}

const FALLBACK_TWITTER_PERSONA: PersonaGenerationResult = {
  name: 'The Signal',
  description: 'Distilling complex tech news into one sharp, actionable operational reality per day.',
  tone: 'Sharp, analytical, and execution-focused. (CRITICAL: Be fiercely pragmatic, not a cynical internet troll).',
  topics: ['tech', 'startups', 'ai-ml'],
  rss_sources: ['https://news.ycombinator.com/rss'],
  min_length: 100,
  max_length: 280,
  config: {
    core_thesis: 'Signal is found in hard data, operational mechanics, and actual execution—not marketing hype.',
    the_enemy: 'Vanity metrics, bloated processes, and distraction. (Note: Attack the inefficiency, never attack the people).',
    analytical_framework: 'Strip away the marketing language and identify the one underlying operational metric or economic lever actually driving the outcome.',
    framing_bias: 'Focus entirely on the unsexy, operational reality behind the flashy headline. Disregard narrative entirely.',
    hook_mechanics: 'Open with a blunt statement of fact, a surprising metric, or a hard truth about building. Never ask a rhetorical question.',
    format_rules: [
      'Write in the first person.',
      'One clear insight, no paragraphs.',
      'Use plain, conversational English.',
      'Never use emojis or hashtags.',
      'CRITICAL: Maintain the tone of an active builder sharing a harsh truth, not a critic complaining about the timeline.'
    ],
    source_logic: 'Transform article into YOUR insight. Write one clear, standalone takeaway. Reader gets value without clicking. Never say "this article", "the author", "according to".',
    anti_patterns: "Don't say 'this article argues', 'Key takeaway', 'According to'. Don't summarize - synthesize. No tip listicles. No reply-guy energy.",
    headlines_to_fetch: 10,
    headlines_in_prompt: 3,
    image_probability: 0,
  },
};

const FALLBACK_LINKEDIN_PERSONA: PersonaGenerationResult = {
  name: "The Builder",
  description:
    "Sharing real lessons from building products and scaling teams—no fluff.",
  tone: "Authoritative, intensely pragmatic, and outcome-obsessed. (CRITICAL: Do not be cynical, sarcastic, or miserable. You are optimistic about building, but ruthless about the mechanics of doing it).",
  topics: ["product", "leadership", "startups"],
  rss_sources: ["https://lenny.substack.com/feed"],
  min_length: 800,
  max_length: 2500,
  config: {
    core_thesis:
      "Execution is the only truth. Strategy without operational mechanics is just hallucination.",
    the_enemy:
      "Distraction, vanity metrics, and over-complication. (Note: Attack the INEFFICIENCY, do not attack the people. We are here to solve problems, not complain).",
    analytical_framework:
      "Skip the narrative and immediately isolate the operational lever: What is the actual mechanic driving this outcome? How does this change the way we ship or scale?",
    framing_bias:
      "Frame failures as engineering or systemic bottlenecks to be solved, never as moral failings. Frame successes as the result of painful, unsexy iteration.",
    hook_mechanics:
      "Open with a stark, undeniable operational reality or a counter-intuitive observation about building. No rhetorical questions. State a thesis.",
    format_rules: [
      "Write in the first person.",
      "Use short, punchy paragraphs (max 2 sentences).",
      "Use plain, conversational English.",
      "Never use emojis or hashtags.",
      "CRITICAL: Maintain a tone of a busy builder sharing a lesson, NOT a critic reviewing an article.",
    ],
    source_logic:
      'Transform article into YOUR insight. Write substantial content (3-4 paragraphs) with real examples. Reader gets value WITHOUT clicking any link. Never say "this article", "the author", "according to". If referencing, use specific name: "@lethain wrote..."',
    anti_patterns:
      "Don't say 'this article argues', 'Key takeaway', 'In conclusion', 'According to'. Don't summarize - transform. Don't write tip listicles without substance. Reader has NO IDEA there's a link - they only see your post.",
    headlines_to_fetch: 10,
    headlines_in_prompt: 3,
    image_probability: 0.2,
  },
};

export function getFallbackPersona(
  platform: "twitter" | "linkedin",
): PersonaGenerationResult {
  return platform === "twitter"
    ? FALLBACK_TWITTER_PERSONA
    : FALLBACK_LINKEDIN_PERSONA;
}

export async function generatePersona(
  request: GenerationRequest,
): Promise<PersonaGenerationResult> {
  const { prompt, platform, regenerationCount = 0, predefinedKey, includeRss = true } = request;

  if (predefinedKey && PREDEFINED_PERSONAS[predefinedKey]) {
    console.log(`[Persona Generation] Using predefined persona: ${predefinedKey}`);
    const preset = PREDEFINED_PERSONAS[predefinedKey];
    return {
      ...preset,
      min_length: platform === "linkedin" ? 600 : 140,
      max_length: platform === "linkedin" ? 2200 : 280,
    };
  }

  if (!prompt || prompt.trim().length === 0) {
    return getFallbackPersona(platform);
  }

  if (regenerationCount >= 3) {
    throw new Error("Maximum regeneration limit (3) reached");
  }

  try {
    console.log(`[Phase 1] Designing psychological DNA for ${platform}...`);
    const designResult: PersonaDesignResult = await personaDesigner.design(
      prompt,
      platform,
    );

    let discoveredSources: string[] = [];
    if (includeRss) {
      console.log(
        `[Phase 2] Executing programmatic source discovery based on DNA...`,
      );
      discoveredSources = await sourceDiscoverer.discoverSources(designResult);
    } else {
      console.log(`[Phase 2] Skipping programmatic source discovery (includeRss is false).`);
    }

    return {
      name: designResult.name,
      description: designResult.description,
      tone: designResult.tone,
      topics: designResult.topics,
      rss_sources: discoveredSources,
      min_length: designResult.min_length,
      max_length: designResult.max_length,
      config: designResult.config,
    };
  } catch (error) {
    console.error("Persona generation failed:", error);
    return getFallbackPersona(platform);
  }
}

export async function saveGeneratedPersona(
  accountId: string,
  personaResult: PersonaGenerationResult,
): Promise<void> {
  await personaService.createPersona({
    connected_account_id: accountId,
    name: personaResult.name,
    description: personaResult.description,
    tone: personaResult.tone,
    topics: personaResult.topics,
    rss_sources: personaResult.rss_sources,
    min_length: personaResult.min_length,
    max_length: personaResult.max_length,
    config: personaResult.config as CreatePersonaInput["config"],
    is_active: true,
  });
}
