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
        const entityList = Array.from(recentEntities).slice(0, 10).join(", ");
        recentProductsSection = `
1.  **Check for Recency:**
    The following topics/companies have been covered recently: [${entityList}]
    If all the *usable* articles (those with a clear mechanism) are primarily about these topics, **You MUST output the following JSON error and stop:**
    {"error":"duplicate-topic-found"}
`;
      }
    }
    
    // --- 4. THE CORE PROMPT ---
    const prompt = `
You reveal hidden business mechanisms using the 5 Whys method.

Drill deep. Each "Why" must go ONE LEVEL DEEPER than the previous answer.

${context.rssContext}

---

CRITICAL PRE-CHECKS

First, analyze all articles in the provided ${context.rssContext}.

${recentProductsSection}

${
  recentProductsSection ? "2." : "1."
}  If the articles are not about a specific **Indian startup** (e.g., they are primarily about VCs, legacy companies, global tech, or are just funding announcements without details):
    **You MUST output the following JSON error and stop:**
    {"error":"no-startup-article-found"}

${
  recentProductsSection ? "3." : "2."
}  If the articles *are* about an Indian startup but contain **no concrete, non-obvious business mechanism** (e.g., they are *only* news reports about stock performance, leadership changes, or are vague articles about "culture" or "values"):
    **You MUST output the following JSON error and stop:**
    {"error":"insufficient-mechanism-signal"}

---

THE 5 WHYS METHOD

Each answer becomes the next question. Drill from surface to mechanism.

**The Rule:** Take the ANSWER from the previous Why, and ask "Why is THAT true?"

Why 1: Why did [company] make [decision]?
Answer: [First-level reason]

Why 2: Why is [answer from Why 1] important/necessary/true?
Answer: [Second-level reason. Reveals constraint/problem]

Why 3: Why does [answer from Why 2] exist/matter?
Answer: [Third-level reason. Reveals economics/structure]

Why 4: Why is [answer from Why 3] the case?
Answer: [Fourth-level reason. Reveals market dynamics]

Why 5: Why does [answer from Why 4] work that way?
Answer: [Fifth-level reason. THE MECHANISM]

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
→ Selling furniture at $3000 (3x market rate) kills the logistics loop. This gives a 40% margin on one transaction. The old way had 0% margin on repeated transactions.

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

If Why 5 is vague ("creates value," "builds trust," "matters more," "cultural continuity," "structured planning," "legacy," "values") → GO DEEPER.
---

Combine your 5 Whys findings into one short tweet (STRICT LIMIT: 220–240 characters).

Follow this **Problem → Move → Mechanism** rhythm:

1. **Problem:** What constraint or tension was the startup facing? (from Why 2/3)
2. **Move:** What action or decision did they take? (from Why 1)
3. **Mechanism:** What hidden dynamic makes that move work? (from Why 5)

Each clause should be crisp. 8–12 words max.  
Each part must *flow into the next* — the third clause (Mechanism) should feel like the *inevitable truth* revealed by the first two.

Use *logical bridges* that imply causality or contrast:
- "so", "which meant", "forcing", "that’s why", "until", "even though", "because"
- Or implied contrast: "but", "yet", "still"

Avoid listing three facts. Make it read like an *unfolding chain of cause → effect → hidden law*.

**Example:**
❌ “AI noise drowns startups. Cluely uses rage-bait. Controversy brings attention.”
✅ “AI noise drowns startups. Cluely used rage-bait to cut through. Outrage repels users but magnetizes the algorithm.”



Tone = **founder spotting a pattern**, not a journalist explaining.

---

STYLE CHECK
□ Strictly no dashes or em-dashes
□ Is the language simple and direct?
□ Avoid buzzwords and jargon (e.g., "synergy," "leveraging," "rich valuations," "operational fundamentals").
□ Use short, punchy sentences. If a sentence is over 15 words, try to split it.
□ The tone should be insightful, not academic.
□ The tweet should *unfold*, not list. Each sentence must logically cause the next.
□ The mechanism must *resolve* the tension raised in the first line.

---

FLOW CHECK

□ Does the tweet tell a "Problem -> Solution -> Why" story?
□ Is the final insight (Why 5) stated clearly as the reason?
□ **Is the total length 220-240 characters?**

---

CRITICAL FAILURE CHECK

If you read the article and none contain a clear, non-obvious business mechanism (e.g., they are just news reports, funding announcements, or vague cultural pieces):

**Do not return JSON.**
**Return only the following text and nothing else:**
ERROR: No clear, non-obvious business mechanism found in the provided article.

----

FINAL VALIDATION CHECK

Before producing JSON:
- ✅ Does the tweet follow Problem → Move → Mechanism?
- ✅ Is it under 240 characters?
- ✅ Does it avoid “this works because” and other academic phrasing?
- ✅ Does it sound like a founder insight (not news summary)?

-----

${
  isImageFormat
    ? `
OUTPUT (IMAGE):
{
  "tweetText": "Teaser under 120 chars (e.g., the 'Problem' part of the story)",
  "imageContent": "Your single, cohesive narrative. **MUST be 220-240 characters.**",
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
"tweetText": "Your single, cohesive narrative. **MUST be 220-240 characters.**",
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
