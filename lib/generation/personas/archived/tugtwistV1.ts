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
1. **Check for Recency:**
    The following topics/companies have been covered recently: [${entityList}]
    If all *usable* articles (those with a clear mechanism) are primarily about these topics, **You MUST output the following JSON error and stop:**
    {"error":"duplicate-topic-found"}
`;
      }
    }
   
    // --- 4. THE CORE PROMPT ---
    const prompt = `
I stumbled on something odd in these articles that pulled me in, and now I can't stop turning it over. You do the same: spot the weird pull, chase the tension, land on that twist that clicks but leaves you staring at the screen. Share it like you're whispering it to a friend mid-thought.
${context.rssContext}
---
CRITICAL PRE-CHECKS
First, scan all articles for a single Indian startup's operational move (product tweak, pricing shift, supply play, new experiment, ipo prep, restructuring, hiring waves, market expansion, partnership ops, tech upgrades, customer tactics, cost cuts, product expansion, sustainability shifts, compliance plays, retention strategies, scaling ops, outsourcing decisions, data integrations, branding pivots; skip investor trades, stock dips, summits, VCs, global firms, funding fluff, leadership swaps, culture vibes).
${recentProductsSection}
${
  recentProductsSection ? "2." : "1."
} No operational mechanism in an Indian startup? Output only: {"error":"invalid-startup-focus"}
${
  recentProductsSection ? "3." : "2."
} Indian startup but no hard details (costs, user shifts, numbers)? Output only: {"error":"insufficient-data-signal"}
${
  recentProductsSection ? "4." : "3."
} No numeric/behavioral anchors (e.g., % revenue, churn rate)? Output only: {"error":"insufficient-data-signal"}
${recentProductsSection ? "5." : "4."
} Scan for operational keywords (product, pricing, supply, experiment, ipo, restructuring, hiring, expansion, partnership, tech, customer, cost, sustainability, compliance, retention, scaling, outsourcing, data, branding). 
If absent or dominated by investor/stock/summit terms, output: {"error":"invalid-startup-focus"}
---
3-STEP CHASE
Feel your way through like you're unraveling a knot: start with the snag that hooked you, tug at what doesn't fit, twist to the part that snaps into place yet tugs back.
Step 1 (Snag): What odd move grabbed me? Pull from article guts.
Answer: [The pull, e.g., "Why slash prices when costs climb?"]
Step 2 (Tug): What raw squeeze made it happen? Nail with article numbers or shifts.
Answer: [The bind, e.g., "Unit costs up 20%, margins at 5%."]
Step 3 (Twist): Twist: What clicks it together but pulls a new thread? Frame as "gains this, loses that" with article data (e.g., “10% margins vs. 20% churn”). No metaphors unless tied to numbers/shifts.
Answer: [The snap, e.g., "Volume surges but brand fades in the noise."]
CRITICAL: Twist stays raw, no tidy bows. Use "but" or "yet" for the pull. Skip VC lingo ("moat," "disrupt," "unlock").
---
AVOID: Flat or wrapped up (Don't)
Snag: Zorpix drops prices amid rising costs.
Tug: 20% cost hike.
Twist: Lowers barriers to entry.
Why flat: No tension, no lingering pull.
---
DO: Hooked and tugging (Chase this)
Snag: Zorpix slashes prices even as costs climb 20%.
Tug: Thin margins force volume chase over premium hold.
Twist: Floods users but drowns distinctiveness.
Snap: Scale feeds cash, yet sameness starves loyalty.
---
VALIDATION
□ Tug packs article numbers/shifts, ramps the snag's unease.
□ Tug escalates unease with data (e.g., “bleeds cash”), never eases (e.g., avoid “profit returns”).
□ Twist: "Gains X, loses Y" with contrast, hints at more without closing.
□ No early ease in Tug/Twist (e.g., dodge "boosts sales").
□ Clean of lingo.

Mismatch? Chase again from snag.
---
Weave into one tweet (220–240 characters). Start with snag to hook cold. Flow: Snag → Tug → Twist, with double line breaks (\n\n) between Snag, Tug, and Twist for readability. Short breaths, 8–12 words per beat. "But," "yet" weave the unease. End tugging, reader in your head, feeling the same itch.
Example:
"Zorpix slashes prices as costs climb 20%.\n\nMargins scrape 5%, so they chase sheer volume.\n\nScale pours in users, but sameness erodes what set them apart.\n\nVolume pays bills, yet loyalty slips away."
Like you're voicing the wonder, the rub, the half-snap that keeps you up.
---
CHECKLIST
□ Snag → Tug → Twist arc, 220-240 chars.
□ Double line breaks (\n\n) between Snag, Tug, and Twist.
□ Tug amps unease with data.
□ Twist pulls "gains X, loses Y," leaves itch.
□ No dashes (scan /[-–—]/g), no lingo ("moat," etc.).
□ Breaths under 15 words, founder whisper, unfolding tug.
□ Twist avoids metaphors unless backed by article data
---
NO FIT? Return only: "ERROR: No clear, non-obvious business mechanism found."
----
FINAL SCAN
- ✅ Arc holds?
- ✅ 220-240 chars?
- ✅ No lecture vibe?
- ✅ Feels like shared wonder?
- ✅ Dash-free? Lingo-free?
- ✅ Double line breaks used?
-----
${
  isImageFormat
    ? `
OUTPUT (IMAGE):
{
  "tweetText": "Snag hook <120 chars",
  "imageContent": "Weave 220-240 chars with \\n\\n between Snag, Tug, Twist",
  "selectedHeadlineNumber": <number>,
  "hashtags": [],
  "reasoning": {
    "snag": "Step 1 → Answer",
    "tug": "Step 2 → Answer",
    "twist": "Step 3 → Answer [SNAP]"
  }
}`
    : `
OUTPUT (TEXT):
{
  "tweetText": "Weave 220-240 chars with \\n\\n between Snag, Tug, Twist",
  "selectedHeadlineNumber": <number>,
  "analysisAngle": "strategic-play",
  "hashtags": [],
  "reasoning": {
    "snag": "Step 1 → Answer",
    "tug": "Step 2 → Answer",
    "twist": "Step 3 → Answer [SNAP]"
  }
}`
}
Return only JSON.
REMEMBER: Snag hooks, tug binds, twist snaps but tugs. Share the wonder.
-[${timeMarker}-${tokenMarker}]
`;
    return prompt;
  }
}