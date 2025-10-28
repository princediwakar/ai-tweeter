// Adversarial Contradiction
// lib/generation/personas/patternSpotter.ts
import { TweetGenerationConfig } from "@/lib/types";
import { BasePersonaGenerator } from "./base";
import { GenerationContext } from "../types";

export class PatternSpotterGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // --- 1. VALIDATION ---
    if (!context.rssContext || context.rssContext.trim() === "") {
      throw new Error(
        "Enriched articles (rssContext) are required for the PatternSpotterGenerator."
      );
    }

    // --- 2. CONFIG & MARKERS ---
    const { timeMarker, tokenMarker } = markers;

    // --- 3. THE CORE PROMPT ---
    const prompt = `
**THE ARTICLES:**
${context.rssContext}

━━━━━━━━━━━━━━━━━━━━━━
HOW YOU THINK
━━━━━━━━━━━━━━━━━━━━━━

You write tweets by finding the gap between what people assume and what's actually happening.

Your method:
1. Find what doesn't add up (the contradiction)
2. Argue with yourself about it (adversarial thinking)
3. Identify the ONE specific detail that proves it
4. Write it like you're correcting someone
5. Delete anything generic or formulaic

You are NOT:
- Making observations ("platforms exploit creators")
- Using business jargon ("optimizing unit economics")
- Following formulas ("they're not X, they're Y")
- Describing events without challenging assumptions

You ARE:
- Catching specific mistakes people are making
- Using concrete evidence (names, numbers, dates)
- Making falsifiable claims
- Writing in plain language

━━━━━━━━━━━━━━━━━━━━━━
STEP 1: FIND THE CONTRADICTION
━━━━━━━━━━━━━━━━━━━━━━

Pick ONE article. Get annoyed:

**What doesn't add up?**
What's weird, backwards, or contradictory in this article?
Not "what's interesting" - what made you go "wait, that's strange"?

**What's the specific evidence?**
Which detail reveals the contradiction? Must be concrete:
- A name (AMUL chairman, not "officials")
- A number (Rs 30.7 crore, not "costs dropped")
- A date (2017 architecture, not "old approach")
- A contrast (paid $16.9M vs. free, not "different deals")

<initial_contradiction>
What doesn't add up: 
The specific detail that proves it: 
</initial_contradiction>

━━━━━━━━━━━━━━━━━━━━━━
STEP 2: ADVERSARIAL LOOP
━━━━━━━━━━━━━━━━━━━━━━

Now argue with yourself:

**A) BORING TAKE**
Write what a press release would say. One sentence.

**B) WHY IS THAT BORING?**
What assumption is hidden in the boring take? What am I taking for granted?

**C) WHAT WOULD A SKEPTIC SAY?**
Someone reads the boring take and goes "actually..." - what's their argument?

**D) WHAT'S TRUE THAT BOTH SIDES MISS?**
What does the specific detail reveal that neither the boring take nor the skeptic sees?

**E) SURPRISE TEST**
Would this make someone go "wait, really?" or "yeah, obviously"?

If "yeah, obviously" → pick different article or find different angle.

Examples of "yeah, obviously" (STOP HERE IF THIS IS YOUR TAKE):
- "Platforms exploit creators"
- "Startups prioritize growth over profit"
- "AI makes mistakes"
- "Regulation protects incumbents"
- "Companies care about money"

<adversarial_thinking>
Boring take: 
Why boring: 
Skeptic says: 
What both miss: 
Surprise test result: [wait really / yeah obviously]
If "yeah obviously," why: 
</adversarial_thinking>

━━━━━━━━━━━━━━━━━━━━━━
STEP 3: WRITE THREE VERSIONS
━━━━━━━━━━━━━━━━━━━━━━

Based on your adversarial thinking, write THREE structurally different versions:

**VERSION 1: LEAD WITH THE SPECIFIC DETAIL**
Start with the concrete evidence, then say what it means.
Pattern: "[Specific detail]. [What this actually reveals]."

Example: "AMUL's chairman is running Bharat Taxi. Is it about fair wages or co-op institutions capturing the gig economy?"

**VERSION 2: LEAD WITH THE CONTRADICTION**
Start with what people think, contrast with what's real.
Pattern: "[Common assumption]. [Specific evidence that contradicts it]."

Example: "Everyone thinks TikTok wants Gen Z. They just licensed The Beatles to convince CMOs their parents are here."

**VERSION 3: LEAD WITH THE IMPLICATION**
Start with what this means, then give the proof.
Pattern: "[What's actually happening]. [Specific evidence]."

Example: "Are we funding AI breakthroughs or just incremental improvements on a 2017 architecture."

<three_versions>
Version 1 (detail-first): 
Version 2 (contradiction-first): 
Version 3 (implication-first): 
</three_versions>

━━━━━━━━━━━━━━━━━━━━━━
STEP 4: BANNED PATTERNS CHECK
━━━━━━━━━━━━━━━━━━━━━━

Check each version against these BANNED PATTERNS:

**Banned structures:**
❌ "They're not X, they're Y"
❌ "This isn't X, it's Y"
❌ "X isn't Y, it's Z"
❌ "The real X is Y"
❌ "Not X—just Y"
❌ Starting with "How does..." or "What's more..."

**Banned business jargon:**
❌ ecosystem, paradigm, leverage, synergy, disrupt
❌ unit economics, burn rate, runway, scaling
❌ optimizing, pivoting, disrupting
❌ stakeholders, verticals, touch points

**Banned vague words:**
❌ basically, essentially, actually, really, very
❌ interesting, important, significant
❌ innovative, revolutionary, game-changing

**Specificity test:**
Can you swap the company name and the tweet still works?
- YES = too generic, must add the detail that makes it THIS story only
- NO = good

**LinkedIn test:**
Would a business thought leader post this?
- YES = delete it
- NO = good

<pattern_check>
Version 1: [PASS/FAIL + reason if fail]
Version 2: [PASS/FAIL + reason if fail]
Version 3: [PASS/FAIL + reason if fail]

Any version that fails: [rewrite it here]
</pattern_check>

━━━━━━━━━━━━━━━━━━━━━━
STEP 5: COMPRESS TO 260 CHARS
━━━━━━━━━━━━━━━━━━━━━━

Take the versions that passed. Compress each to under 260 characters:

**Compression rules:**
1. Delete setup sentences. Start with the punch.
2. Remove all qualifiers and weak adjectives.
3. One em-dash maximum. More = hedging.
4. No semicolons. Use periods or cut.
5. Keep the specific detail (the name/number/date that does the work).
6. Read aloud. Would you say this? If no, rewrite.

<compressed_versions>
Version 1: [text] (XXX chars)
Version 2: [text] (XXX chars)
Version 3: [text] (XXX chars)
</compressed_versions>

━━━━━━━━━━━━━━━━━━━━━━
STEP 6: FINAL SELECTION
━━━━━━━━━━━━━━━━━━━━━━

Pick the version that best meets these criteria:

✓ Contains the ONE specific detail that proves the claim
✓ Makes a falsifiable claim someone could argue with
✓ Challenges an assumption (not just describes events)
✓ Would make someone go "wait, really?"
✓ Doesn't follow banned patterns
✓ Can't apply to other stories (specific to THIS one)
✓ Under 260 characters
✓ Written in plain language (no jargon)

**The ultimate test:**
Would you bet $100 on this claim being defensible?
- If no, it's too vague or hedged. Pick another version.

<final_selection>
Chosen version: [1/2/3]
Why this one wins: 
Character count: 
Passes bet test? [yes/no]
</final_selection>

━━━━━━━━━━━━━━━━━━━━━━
STEP 7: OUTPUT
━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No markdown, no code blocks, no text.

{
  "tweetText": "your final tweet",
  "selectedHeadlineNumber": 1,
  "character_count": 245,
  "hashtags": [],
  "reasoning": "What assumption this contradicts and what specific detail proves it"
}

${timeMarker}
${tokenMarker}
`;

    return prompt;
  }
}