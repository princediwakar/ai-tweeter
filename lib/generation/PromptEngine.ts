// lib/generation/PromptEngine.ts
// Unified prompt building — single tweets, threads, batch generation
// Philosophy: Every post must be something a senior operator would text a peer at 7am.
// Not a summary. Not a hot take. A synthesized, data-grounded, first-person observation
// that delivers full standalone value and makes the reader feel smarter for having read it.

import type { Persona } from "../types";

export interface PromptEngineInput {
  persona: Persona;
  dataContext: string;
  formatRules?: string[];
  options?: {
    isThread?: boolean;
    threadTemplate?: string;
    threadCount?: number;
    topic?: string;
    userTopicContext?: string;
    wantsImage?: boolean;
    previousHeadlines?: number[];
    usedSourceUrls?: string[];
    platform?: "twitter" | "linkedin";
  };
}

export interface PromptEngineOutput {
  prompt: string;
  formatMetadata: {
    isThread: boolean;
    outputSchema: string;
    platform: "twitter" | "linkedin";
  };
}

// ─── Platform Constraints ───────────────────────────────────────────────────

const PLATFORM_RULES = {
  twitter: {
    singleMax: 280,
    threadPostMin: 120,
    threadPostMax: 280,
    formatNote: `Twitter/X formatting:
- One focused insight per post. Not two, not three. One.
- Short punchy sentences. Vary length for rhythm: one long, then one short.
- No em-dashes in the middle of nowhere. No bullet lists. Flowing prose only.
- Line breaks are your friend — use a blank line between the hook and the payoff.
- Numbers go naked: "37%" not "thirty-seven percent".
- Never start with "I" — start with the observation, the number, or the contrast.
- No hashtags. No emojis. They signal "content creator", not "operator".`,
  },
  linkedin: {
    singleMax: 2200,
    threadPostMin: 0,
    threadPostMax: 0,
    formatNote: `LinkedIn formatting:
- Open with a single sentence that would make a peer stop scrolling. No preamble.
- 4–7 short paragraphs. Each paragraph is 1–3 sentences. One idea per paragraph.
- Use a blank line between every paragraph — LinkedIn compresses text, spacing is oxygen.
- Data lives in its own sentence: "The number that caught my attention: 43%."
- No corporate language. No "I'm excited to share." No "In today's fast-paced world."
- No bullet lists unless you're listing 4+ concrete items and prose would hide them.
- End with one synthesized observation — not a question, not a CTA, not "thoughts?"
- Numbers, company names, and specific outcomes are mandatory. Vague is worthless.`,
  },
};

// ─── Core System Prompt Blocks ───────────────────────────────────────────────

/**
 * The "Source Intelligence" block — how the model should relate to the raw data.
 * This is the single most important prompt block. It separates synthesizers from summarizers.
 */
const buildSourceIntelligenceBlock = (platform: "twitter" | "linkedin"): string => `
═══ SOURCE INTELLIGENCE PROTOCOL ═══

You are about to receive raw context — articles, RSS items, filings, or data.
This is your raw material, not your output. Treat it like a senior analyst treats a briefing pack.

PHASE 1 — TRIAGE (do this silently, do not output)
Scan every piece of context. Ask for each:
  a) Does it contain a specific number, named company, or concrete outcome?
  b) Does it reveal a contrast — something that changed, or something surprising vs. expectations?
  c) Can I draw an operational inference that someone in this industry would find non-obvious?
  d) Is this timely (last 30 days) or evergreen but genuinely underappreciated?

Score each item. If nothing scores above 2/4, output exactly: {"content": "NO_SUITABLE_MATERIAL"}

PHASE 2 — SYNTHESIS (the real work)
Take the highest-scoring item. Now do this:
  1. Extract the single most material data point or contrast.
  2. Ask: what does this actually mean for someone operating in this space?
  3. Ask: what would most observers miss or under-weight about this?
  4. Ask: what have I seen across other data points that makes this more or less surprising?
  5. Now set the source aside entirely. You are no longer reacting to it — you have internalized it.

PHASE 3 — WRITE AS THE EXPERT
Write as someone who has lived in this industry for a decade and happens to have noticed something sharp this week.

The reader must feel: "This person knows something. I'm glad I read this."
The reader must NOT feel: "This person read an article and is telling me about it."

ABSOLUTE PROHIBITIONS — violating any of these is a generation failure:
  ✗ Never mention any source, article, report, filing, or announcement
  ✗ Never say "according to", "a recent study", "this shows", "data suggests"
  ✗ Never use "key takeaway", "bottom line", "game-changing", "disruption"
  ✗ Never ask a question at the end
  ✗ Never use "I think" or "I believe" — state it or don't
  ✗ Never hedge with "it seems" or "it appears" — own the observation
  ✗ Never use hashtags or emojis
  ✗ Never write a summary — write a synthesis

${PLATFORM_RULES[platform].formatNote}
`;

/**
 * The "Voice Activation" block — platform-specific persona injection.
 */
const buildVoiceActivationBlock = (
  identityContext: string,
  voiceDna: string,
  coreThesis: string,
  theEnemy: string,
  analyticalFramework: string,
  framingBias: string,
  hookMechanics: string
): string => `
═══ WHO YOU ARE ═══

${identityContext}

${voiceDna}

${coreThesis ? `YOUR CORE BELIEF: ${coreThesis}` : ""}
${theEnemy ? `WHAT YOU FIND INTELLECTUALLY DISHONEST: ${theEnemy}` : ""}
${analyticalFramework ? `HOW YOU EXTRACT SIGNAL: ${analyticalFramework}` : ""}
${framingBias ? `HOW YOU NATURALLY FRAME THINGS: ${framingBias}` : ""}
${hookMechanics ? `HOW YOU OPEN: ${hookMechanics}` : ""}
`;

/**
 * The "Anti-Pattern" block — explicit negative examples are more effective than abstract rules.
 * We show what bad looks like so the model has a concrete contrast to avoid.
 */
const buildAntiPatternBlock = (customAntiPatterns: string): string => `
═══ WHAT BAD LOOKS LIKE (do the opposite) ═══

BAD — summarizer voice (never do this):
"A new report shows that AI adoption in enterprise has reached 67%. This is a significant milestone 
that highlights the growing importance of AI in business. Key takeaway: companies need to invest 
in AI to stay competitive. What do you think?"

BAD — vague observation (never do this):
"The market is changing fast. Companies that adapt will win. Those that don't will be left behind. 
Now more than ever, it's important to stay ahead of the curve."

BAD — source-citing (never do this):
"According to a recent McKinsey study, 73% of executives report... This shows that..."

GOOD — what you actually produce:
A specific number. A concrete contrast. A non-obvious operational implication. 
Written in first person as lived insight, not as commentary on external information.
The reader learns something. They don't know where you got it. They assume you know your space.

${customAntiPatterns ? `PERSONA-SPECIFIC PATTERNS TO AVOID:\n${customAntiPatterns}` : ""}
`;

/**
 * The "Structural Archetypes" block — concrete post templates with examples.
 */
const buildArchetypeBlock = (archetypes: any[], platform: "twitter" | "linkedin"): string => {
  if (archetypes.length === 0) {
    // Provide high-quality defaults per platform
    if (platform === "twitter") {
      return `
═══ POST STRUCTURES THAT WORK ═══

Pick ONE of these structures. Do not invent your own unless it's clearly stronger.

STRUCTURE 1 — The Contrast
[Surprising fact or number]
[What people expect vs. what's actually happening]
[One-sentence implication]

STRUCTURE 2 — The Mechanism
[Observable outcome]
[Why this is happening — the non-obvious cause]
[What this means operationally]

STRUCTURE 3 — The Pattern Recognition
[Specific data point from this week]
[Pattern I've seen this connect to]
[The inference most people haven't drawn yet]

STRUCTURE 4 — The Quiet Drop
[State the thing directly. No setup.]
[One supporting data point.]
[One implication, delivered without fanfare.]
`;
    } else {
      return `
═══ POST STRUCTURES THAT WORK ═══

Pick ONE of these. Each section = one short paragraph.

STRUCTURE 1 — The Buried Number
Para 1: The hook — one sentence that frames the space you're operating in.
Para 2: The specific number or fact that caught your attention. Just the fact.
Para 3: What the number actually means — the operational reality behind it.
Para 4: The contrast — what people think vs. what this suggests.
Para 5: The synthesis — one sentence on where this leads.

STRUCTURE 2 — The Pattern Across Time
Para 1: What's happening now, stated directly.
Para 2: What was happening 12–18 months ago in the same space.
Para 3: What changed, and what drove the change.
Para 4: The implication most operators are still missing.
Para 5: What the smart money is positioning for as a result.

STRUCTURE 3 — The Operator's Walk-Through
Para 1: Set the scene — a specific operational scenario.
Para 2: Here's what the numbers look like inside that scenario.
Para 3: Here's the friction point most people gloss over.
Para 4: Here's what changes when you solve it.
Para 5: The one metric that tells you whether you're on track.

STRUCTURE 4 — The Clean Contrast
Para 1: The conventional wisdom, stated fairly.
Para 2: The data point that complicates it.
Para 3: Why the conventional wisdom persists anyway.
Para 4: What operators who've worked past it actually do.
Para 5: The one thing that tends to unlock it.
`;
    }
  }

  const archetypeList = archetypes
    .map((arch: any) => `— ${arch.name}: ${arch.description}\n  Example: ${arch.example}`)
    .join("\n");
  return `═══ POST STRUCTURES ═══\n\n${archetypeList}`;
};

/**
 * Pre-flight validation — falsifiable checks, not vibes-based questions.
 */
const buildValidationBlock = (checklist: any[], platform: "twitter" | "linkedin"): string => {
  const defaultChecks =
    platform === "twitter"
      ? [
          "Sentence 1 contains a number, a named company, or a concrete outcome (not a vague claim)",
          "There is a contrast or change present — something vs. something else",
          "The post makes sense and delivers value with zero additional context",
          "The word 'I' does not appear in sentence 1",
          "There are no questions, hashtags, or emojis anywhere",
          "The post is under 280 characters",
          "Deleting the last sentence leaves the post stronger, not weaker (if yes, delete it)",
          "A senior operator reading this would learn something or see their space differently",
        ]
      : [
          "Sentence 1 would make a peer stop scrolling — it names something specific",
          "At least one paragraph contains a number, named company, or concrete operational detail",
          "There is a contrast or non-obvious inference that isn't obvious from the first sentence",
          "Every paragraph is 1–3 sentences maximum",
          "There is a blank line between every paragraph",
          "No sentences begin with 'I think', 'I believe', or 'It seems'",
          "The post ends with a synthesis — not a question, not a CTA",
          "There are no corporate phrases: 'excited to share', 'in today's world', 'game-changing'",
          "A busy professional reading this would feel they received high-signal material, not content",
        ];

  const checks = checklist.length > 0 ? checklist.map(String) : defaultChecks;
  return `═══ PRE-FLIGHT CHECK ═══\n\nBefore outputting, verify each:\n${checks.map((c) => `☐ ${c}`).join("\n")}`;
};

// ─── Main PromptEngine Class ─────────────────────────────────────────────────

export class PromptEngine {
  build(input: PromptEngineInput): PromptEngineOutput {
    const { persona, dataContext, formatRules = [], options = {} } = input;
    const pConfig = (persona.config as Record<string, unknown>) || {};
    const platform = options.platform ?? "twitter";
    const isThread = options.isThread ?? false;
    const threadCount = options.threadCount ?? 5;

    // Extract persona DNA
    const identityContext = String(
      pConfig.identity_context || pConfig.core_thesis || "You are a sharp, seasoned industry observer."
    );
    const voiceDna = String(
      pConfig.voice_dna || pConfig.voice || "Write with precise, confident, first-person authority."
    );
    const antiPatterns = String(pConfig.anti_patterns || "");
    const coreThesis = String(pConfig.core_thesis || "");
    const theEnemy = String(pConfig.the_enemy || "");
    const analyticalFramework = String(pConfig.analytical_framework || "");
    const framingBias = String(pConfig.framing_bias || "");
    const hookMechanics = String(pConfig.hook_mechanics || "");
    const structuralArchetypes = Array.isArray(pConfig.structural_archetypes)
      ? pConfig.structural_archetypes
      : [];
    const validationChecklist = Array.isArray(pConfig.validation_checklist)
      ? pConfig.validation_checklist
      : [];

    const sharedBlocks = {
      persona,
      dataContext,
      identityContext,
      voiceDna,
      antiPatterns,
      coreThesis,
      theEnemy,
      analyticalFramework,
      framingBias,
      hookMechanics,
      structuralArchetypes,
      validationChecklist,
      formatRules,
      platform,
    };

    const prompt = isThread
      ? this.buildThreadPrompt({ ...sharedBlocks, threadCount, threadTemplate: options.threadTemplate, usedSourceUrls: options.usedSourceUrls })
      : this.buildSinglePostPrompt({ ...sharedBlocks, wantsImage: options.wantsImage, topic: options.topic, previousHeadlines: options.previousHeadlines, usedSourceUrls: options.usedSourceUrls });

    return {
      prompt,
      formatMetadata: {
        isThread,
        outputSchema: isThread ? "json_array" : "json_object",
        platform,
      },
    };
  }

  // ─── Single Post ─────────────────────────────────────────────────────────

  private buildSinglePostPrompt(params: {
    persona: Persona;
    dataContext: string;
    identityContext: string;
    voiceDna: string;
    antiPatterns: string;
    coreThesis: string;
    theEnemy: string;
    analyticalFramework: string;
    framingBias: string;
    hookMechanics: string;
    structuralArchetypes: any[];
    validationChecklist: any[];
    formatRules: string[];
    wantsImage?: boolean;
    topic?: string;
    previousHeadlines?: number[];
    usedSourceUrls?: string[];
    platform: "twitter" | "linkedin";
  }): string {
    const {
      persona,
      dataContext,
      identityContext,
      voiceDna,
      antiPatterns,
      coreThesis,
      theEnemy,
      analyticalFramework,
      framingBias,
      hookMechanics,
      structuralArchetypes,
      validationChecklist,
      formatRules,
      wantsImage,
      topic,
      previousHeadlines,
      usedSourceUrls,
      platform,
    } = params;

    const maxLength = platform === "linkedin" ? (persona.max_length ?? 2200) : (persona.max_length ?? 280);

    let prompt = `You are ${persona.name}.\n`;
    prompt += `${persona.description ? persona.description + "\n\n" : ""}`;

    // Identity & Voice
    prompt += buildVoiceActivationBlock(identityContext, voiceDna, coreThesis, theEnemy, analyticalFramework, framingBias, hookMechanics);
    prompt += "\n";

    // Source Intelligence Protocol
    if (!topic) {
      prompt += buildSourceIntelligenceBlock(platform);
      prompt += "\n";

      if (dataContext) {
        prompt += `═══ YOUR CONTEXT ═══\n\n${dataContext}\n\n`;
      } else {
        prompt += `No external context provided. Draw on your accumulated industry knowledge — but still apply specificity standards: real numbers, real companies, real patterns. No fabrication.\n\n`;
      }

      if (previousHeadlines && previousHeadlines.length > 0) {
        prompt += `You have already used these article indices: ${previousHeadlines.join(", ")}. Choose something new.\n`;
      }

      if (usedSourceUrls && usedSourceUrls.length > 0) {
        prompt += `Do not draw from these articles — already used:\n${usedSourceUrls.map((u) => `  - ${u}`).join("\n")}\n`;
      }
      prompt += "\n";
    } else {
      // Topic-driven: no source context, pure expertise mode
      prompt += `═══ USER REQUEST ═══\n\nWrite a post about: "${topic}"\n\n`;
      if (params.topic) {
        prompt += `Apply the same standard as always: specific numbers, concrete examples, non-obvious observations. Do not write generically about this topic.\n`;
      }
      prompt += `${PLATFORM_RULES[platform].formatNote}\n\n`;
    }

    // Anti-patterns
    prompt += buildAntiPatternBlock(antiPatterns);
    prompt += "\n";

    // Structure
    prompt += buildArchetypeBlock(structuralArchetypes, platform);
    prompt += "\n";

    // Validation
    prompt += buildValidationBlock(validationChecklist, platform);
    prompt += "\n\n";

    // Format rules
    if (formatRules.length > 0) {
      prompt += `ADDITIONAL FORMAT RULES: ${formatRules.join(" | ")}\n\n`;
    }

    // Output schema
    prompt += `═══ OUTPUT FORMAT ═══\n\n`;
    prompt += `Output ONLY valid JSON. No preamble. No explanation. No markdown fences.\n\n`;
    prompt += `{\n`;
    if (coreThesis || theEnemy) {
      prompt += `  "internal_monologue": "Your raw diagnostic — which piece of context you chose, why it scored highest, what the non-obvious angle is, and how you're framing it. 2–3 sentences.",\n`;
    }
    prompt += `  "content": "The final post text, ready to publish as-is.",\n`;
    prompt += `  "selected_url": "Exact URL of the article you synthesized from, or null if topic-driven or knowledge-only."`;
    if (wantsImage) {
      prompt += `,\n  "cardData": {\n    "imagePrompt": "A concise, vivid image description — max 150 characters. Visual only, no text in the image."\n  }`;
    }
    prompt += `\n}`;
    prompt += `\n\nContent must be under ${maxLength} characters. If it's over, cut the weakest sentence, not the data.`;

    return prompt;
  }

  // ─── Thread ───────────────────────────────────────────────────────────────

  private buildThreadPrompt(params: {
    persona: Persona;
    dataContext: string;
    identityContext: string;
    voiceDna: string;
    antiPatterns: string;
    coreThesis: string;
    theEnemy: string;
    analyticalFramework: string;
    framingBias: string;
    hookMechanics: string;
    structuralArchetypes: any[];
    validationChecklist: any[];
    threadCount: number;
    threadTemplate?: string;
    formatRules: string[];
    usedSourceUrls?: string[];
    platform: "twitter" | "linkedin";
  }): string {
    const {
      persona,
      dataContext,
      identityContext,
      voiceDna,
      antiPatterns,
      coreThesis,
      theEnemy,
      analyticalFramework,
      framingBias,
      hookMechanics,
      structuralArchetypes,
      validationChecklist,
      threadCount,
      threadTemplate,
      formatRules,
      usedSourceUrls,
      platform,
    } = params;

    // Thread arc templates — each produces a different narrative shape
    const threadArcs: Record<string, string> = {
      "insight-build": `
THREAD ARC — "Insight Build" (default):
Post 1 (HOOK): One number or fact that earns the reader's attention. No setup. Just the signal.
Post 2 (CONTEXT): The operational reality behind that number. What's actually happening.
Post 3 (MECHANISM): Why this is happening. The non-obvious cause.
Post 4 (IMPLICATION): What this means for people operating in this space. The thing most miss.
Post 5 (SYNTHESIS): One sentence. What you'd say to a smart peer over coffee. No fanfare.`,

      "myth-bust": `
THREAD ARC — "Myth Bust":
Post 1 (HOOK): State the conventional wisdom. Be fair to it.
Post 2 (DATA): The number or case that complicates it.
Post 3 (MECHANISM): Why the conventional wisdom formed and why it persists.
Post 4 (REALITY): What actually happens when you dig into the execution.
Post 5 (REFRAME): The better mental model. Concrete, not abstract.`,

      "pattern-recognition": `
THREAD ARC — "Pattern Recognition":
Post 1 (HOOK): The specific observation from this week.
Post 2 (PRECEDENT): Where you've seen this pattern before. Named examples.
Post 3 (DRIVER): What structural force is producing the pattern.
Post 4 (LEADING INDICATOR): What you'd watch to know if the pattern is accelerating or reversing.
Post 5 (POSITION): What the people who've figured this out are actually doing.`,

      "operator-breakdown": `
THREAD ARC — "Operator Breakdown":
Post 1 (HOOK): Name the operational challenge. Make it specific.
Post 2 (ANATOMY): What the numbers look like inside this challenge.
Post 3 (FAILURE MODE): How most teams approach it and where they break.
Post 4 (UNLOCK): The specific thing that separates the ones who crack it.
Post 5 (METRIC): The one number that tells you whether you're winning.`,
    };

    const selectedArc = threadTemplate && threadArcs[threadTemplate]
      ? threadArcs[threadTemplate]
      : threadArcs["insight-build"];

    let prompt = `You are ${persona.name}.\n`;
    prompt += `${persona.description ? persona.description + "\n\n" : ""}`;

    prompt += buildVoiceActivationBlock(identityContext, voiceDna, coreThesis, theEnemy, analyticalFramework, framingBias, hookMechanics);
    prompt += "\n";

    prompt += buildSourceIntelligenceBlock(platform);
    prompt += "\n";

    if (dataContext) {
      prompt += `═══ YOUR CONTEXT ═══\n\n${dataContext}\n\n`;
    }

    if (usedSourceUrls && usedSourceUrls.length > 0) {
      prompt += `Do not draw from these articles:\n${usedSourceUrls.map((u) => `  - ${u}`).join("\n")}\n\n`;
    }

    prompt += `═══ THREAD STRUCTURE ═══\n`;
    prompt += selectedArc;
    prompt += `\n\nTHREAD RULES:
- Each post must deliver standalone value. Someone reading only post 3 should still learn something.
- No post should start with "Also," "Additionally," or "And." Each opens fresh.
- Each post has one idea. Not two. If you have two ideas, they belong in separate posts.
- Data is distributed across the thread — don't front-load all numbers in post 1.
- The thread should accelerate: each post more specific and more valuable than the last.
- Post ${threadCount} is the sharpest thing in the thread. It earns the read-through.
- ${PLATFORM_RULES[platform === "linkedin" ? "twitter" : platform].formatNote.split("\n")[0]}
`;

    prompt += "\n";
    prompt += buildAntiPatternBlock(antiPatterns);
    prompt += "\n";
    prompt += buildValidationBlock(validationChecklist, platform);

    if (formatRules.length > 0) {
      prompt += `\nADDITIONAL FORMAT RULES: ${formatRules.join(" | ")}\n`;
    }

    const minChars = PLATFORM_RULES[platform === "linkedin" ? "twitter" : "twitter"].threadPostMin;
    const maxChars = PLATFORM_RULES[platform === "linkedin" ? "twitter" : "twitter"].threadPostMax;

    prompt += `\n\n═══ OUTPUT FORMAT ═══\n\n`;
    prompt += `Output ONLY a valid JSON array of exactly ${threadCount} objects. No preamble. No markdown fences.\n\n`;
    prompt += `[\n  { "sequence": 1, "content": "...", "arc_role": "HOOK" },\n  { "sequence": 2, "content": "...", "arc_role": "CONTEXT" },\n  ...\n]`;
    prompt += `\n\nEach "content" must be ${minChars}–${maxChars} characters. "arc_role" is the thread arc stage label from the structure above.`;

    return prompt;
  }
}

export const promptEngine = new PromptEngine();
export default promptEngine;