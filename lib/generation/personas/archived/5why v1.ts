// lib/generation/personas/patternSpotter.ts

import { BasePersonaGenerator } from "../base";
import type { TweetGenerationConfig, GenerationContext } from "../../types";
import { extractEntities } from "../../articleEnricher";
import { GENERATION_CONFIG } from "../../config";

export class PatternSpotterGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // --- 1. VALIDATION ---
    if (!context.rssContext || context.rssContext.trim() === "") {
      throw new Error(
        "Enriched articles (rssContext) are required for the PatternSpotter persona."
      );
    }

    // --- 2. CONFIG & MARKERS ---
    const { timeMarker, tokenMarker } = markers;
    
    const format = config.patternSpotterFormat || "text-only";
    const isImageFormat = format === "image";

    // --- 3. RECENT ENTITY FILTERING ---
    let recentProductsSection = "";
    if (config.recentPatterns && config.recentPatterns.length > 0) {
      const recentEntities = new Set<string>();
      const commonWordsForTweets = new Set([
        "The", "But", "And", "Shows", "This", "That", "Example", "Data", "With", "From",
        "How", "Why", "What", "When", "Is", "Are", "Was", "Were", "It", "They", "He", "She",
        "For", "In", "On", "At", "To", "Of", "A", "An", "VC", "Fund", "Startup",
      ]);

      config.recentPatterns.forEach((p) => {
        const text = typeof p === "string" ? p : p.text;
        const hook = text.split("\n")[0];
        const entities = extractEntities(hook, {
          ignoreWords: commonWordsForTweets,
          minLength: 4,
        });
        entities.forEach((entity) => recentEntities.add(entity.toLowerCase().trim()));
      });

      if (recentEntities.size > 0) {
        recentProductsSection = `
RECENTLY COVERED: ${Array.from(recentEntities).slice(0, 10).join(", ")}
Pick a different article.
`;
      }
    }

    // --- 4. THE CORE PROMPT ---
    const prompt = `
You reveal hidden business mechanisms using the 5 Whys method.

Drill deep. Each "Why" must go ONE LEVEL DEEPER than the previous answer.

${context.rssContext}

${recentProductsSection}

---

THE 5 WHYS METHOD

Each answer becomes the next question. Drill from surface to mechanism.

**The Rule:** Take the ANSWER from the previous Why, and ask "Why is THAT true?"

Why 1: Why did [company] make [decision]?
Answer: [First-level reason]

Why 2: Why is [answer from Why 1] important/necessary/true?
Answer: [Second-level reason - reveals constraint/problem]

Why 3: Why does [answer from Why 2] exist/matter?
Answer: [Third-level reason - reveals economics/structure]

Why 4: Why is [answer from Why 3] the case?
Answer: [Fourth-level reason - reveals market dynamics]

Why 5: Why does [answer from Why 4] work that way?
Answer: [Fifth-level reason - THE MECHANISM]

**CRITICAL:** Each Why must drill into the PREVIOUS ANSWER, not rephrase the original question.

---

WRONG: Circular Questions (Don't Do This)

Why 1: Why did Furlenco focus on profitability?
Why 2: Why does profitability matter?
Why 3: Why is profitability important?
Why 4: Why can't they stay unprofitable?
Why 5: Why do investors prefer profitable companies?

Problem: All asking the same thing. No drilling. Stuck at surface level.

---

RIGHT: Drilling Questions (Do This)

Why 1: Why did Furlenco cut 60% of products?
→ They were losing $130M annually

Why 2: Why were they losing $130M?
→ Rental revenue per transaction was less than operational costs

Why 3: Why were operational costs higher than revenue?
→ Each rental cycle costs $100 (delivery + pickup + refurbishment) but customers pay $80/month

Why 4: Why not just charge customers more than $100/month?
→ Can't compete with IKEA furniture prices; customers would just buy instead of rent

Why 5: Why does premium one-time sales work then?
→ Selling furniture at $3000 (3x market rate) eliminates the logistics loop entirely—40% margin on one transaction vs 0% margin on repeated transactions

THE MECHANISM: Transaction frequency kills rental margins. Premium one-time sales eliminate the logistics death spiral.

---

VALIDATION CHECKS

After writing your 5 Whys, verify:

□ Why 2 asks about the ANSWER from Why 1 (not rephrasing Why 1)
□ Why 3 asks about the ANSWER from Why 2 (not rephrasing Why 1)
□ Why 4 asks about the ANSWER from Why 3 (not rephrasing Why 1)
□ Why 5 asks about the ANSWER from Why 4 (not rephrasing Why 1)
□ Why 5 reveals a mechanism/structure/dynamic (not just "it works" or "it's better")

If Why 3 sounds like Why 1 rephrased → START OVER. You're going in circles.

If Why 5 is vague ("creates value," "builds trust," "matters more") → GO DEEPER.

---

WRITE YOUR TWEET

Use Why 5 as your insight.

Hook (max 60 chars): The problem/tension from Why 2 or Why 3
Move (max 100 chars): What they did + specific outcome
Insight (max 80 chars): Why 5 answer, stated directly

Total: 220-240 characters including \\n\\n

No crutch phrases: No "Turns out," "Pattern:," "Creates new category"

Just state the mechanism.

---

FLOW CHECK

□ Hook sets up a problem that Move solves
□ Insight explains WHY Move works (using Why 5)
□ Can retell as: "Company faced X, did Y, which works because Z"

---

${
  isImageFormat
    ? `
OUTPUT (IMAGE):
{
  "tweetText": "Teaser under 120 chars",
  "imageContent": "Hook \\n\\n Move \\n\\n Insight (220-240 chars)",
  "selectedHeadlineNumber": <number>,
  "hashtags": [],
  "reasoning": {
    "why1": "Why 1 question → Your answer",
    "why2": "Why 2 question (about Why 1 answer) → Your answer",
    "why3": "Why 3 question (about Why 2 answer) → Your answer",
    "why4": "Why 4 question (about Why 3 answer) → Your answer",
    "why5": "Why 5 question (about Why 4 answer) → Your answer [THE MECHANISM]"
  }
}`
    : `
OUTPUT (TEXT):
{
  "tweetText": "Hook \\n\\n Move \\n\\n Insight (220-240 chars)",
  "selectedHeadlineNumber": <number>,
  "analysisAngle": "strategic-play",
  "hashtags": [],
  "reasoning": {
    "why1": "Why 1 question → Your answer",
    "why2": "Why 2 question (about Why 1 answer) → Your answer",
    "why3": "Why 3 question (about Why 2 answer) → Your answer",
    "why4": "Why 4 question (about Why 3 answer) → Your answer",
    "why5": "Why 5 question (about Why 4 answer) → Your answer [THE MECHANISM]"
  }
}`
}

Return only JSON.

REMEMBER: Each Why drills into the PREVIOUS ANSWER. Why 5 reveals the mechanism.

-[${timeMarker}-${tokenMarker}]
`;

    return prompt;
  }
}