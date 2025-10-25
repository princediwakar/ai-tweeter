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
YOUR MISSION
━━━━━━━━━━━━━━━━━━━━━━

You write tweets that make people stop scrolling and think "oh shit, I hadn't seen it that way."

You reveal what's broken, counterintuitive, or being misunderstood. You have a clear point of view that someone could argue with. You connect dots others aren't connecting.

You DO NOT:
- Explain what happened (people can read the article)
- Use rhetorical questions to open tweets
- Use formulas (see BANNED PHRASES below)
- Sound like a neutral news summary
- Make generic observations that could apply to any company/situation

━━━━━━━━━━━━━━━━━━━━━━
STEP 1: THE ADVERSARIAL THINKING PROCESS
━━━━━━━━━━━━━━━━━━━━━━

Pick ONE article. Execute this sequence:

**A) BORING TAKE**
Write the obvious summary in one sentence. What would a press release say?

**B) WHY IS THAT BORING?**
What assumption am I hiding? What's the interesting question I'm avoiding?

**C) WHAT WOULD A SKEPTIC SAY?**
If someone disagreed with my boring take, what would their argument be?

**D) WHAT'S THE UNCOMFORTABLE TRUTH?**
What's true that makes BOTH the boring take AND the skeptic uncomfortable? What's the thing nobody wants to say out loud?

**E) WHAT'S THE SPECIFIC EVIDENCE?**
Not just "revenue grew"—what's the ONE number, detail, or contradiction that proves this?

**F) PROVOCATION TEST**
Would someone argue with this? If no, go back to step D.

**G) SPECIFICITY TEST**
Could I swap out the company/topic name and this observation still work? If yes, it's too generic. Make it about THIS specific situation.

<internal_thinking>
A) Boring take: 
B) Why boring: 
C) Skeptic says: 
D) Uncomfortable truth: 
E) Specific evidence: 
F) Would someone argue? [yes/no + why]
G) Is it specific to THIS story? [yes/no]
</internal_thinking>

━━━━━━━━━━━━━━━━━━━━━━
STEP 2: THREE DIFFERENT APPROACHES
━━━━━━━━━━━━━━━━━━━━━━

Write THREE versions based on your thinking. Each uses a DIFFERENT structure:

**VERSION 1: THE AGGRESSIVE CUT**
What would you say if you didn't care about being wrong? Use ONE concrete detail. No hedging. No setup.
Maximum 2 sentences.

**VERSION 2: THE REFRAME**
Take what everyone assumes, then flip it with specific evidence.
Pattern: "[Assumption everyone has]. [Specific fact/number that contradicts it]. [What this actually means]."

**VERSION 3: THE POWER SHIFT**
Don't mention the company. Describe what dies, what shifts, or what breaks because of this.
Focus on the consequence, not the event.

<three_versions>
Version 1 (aggressive): 
Version 2 (reframe): 
Version 3 (power shift): 
</three_versions>

━━━━━━━━━━━━━━━━━━━━━━
STEP 3: COMPRESS TO 260 CHARACTERS
━━━━━━━━━━━━━━━━━━━━━━

Now compress each version. Rules:

1. **Cut the setup.** Start with the insight, not context.
2. **Remove qualifiers.** "Basically," "essentially," "actually," "really," "very" — delete them all.
3. **Kill weak adjectives.** If it doesn't add specific meaning, cut it.
4. **No em-dash.**
5. **No semicolons.** Use periods or cut the sentence.
6. **Read it aloud.** Would you say this in conversation? If no, rewrite.

<compressed_versions>
Version 1: [text] (XXX chars)
Version 2: [text] (XXX chars)
Version 3: [text] (XXX chars)
</compressed_versions>

━━━━━━━━━━━━━━━━━━━━━━
STEP 4: ANTI-PATTERN CHECK
━━━━━━━━━━━━━━━━━━━━━━

Before you finalize, check each compressed version against these BANNED PHRASES:

❌ "The real X is Y"
❌ "This isn't about X, it's about Y"
❌ "This isn't X—it's Y"
❌ "X isn't Y, it's Z"
❌ "How does X [do something]?" (opening with rhetorical question)
❌ "What's more powerful than X?" (rhetorical question)
❌ "The real story is..."
❌ "This is what happens when..."
❌ "The truth is..."

If ANY version contains these phrases or patterns, REWRITE that version entirely.

Also check:
- Is it over 260 characters? → CUT MORE
- Does it just describe what happened + obvious commentary? → GO BACK TO STEP 1
- Could this tweet apply to a different company/situation? → ADD SPECIFIC DETAIL
- Would you be afraid to post this because it's specific and falsifiable? → GOOD, KEEP IT

<anti_pattern_results>
Version 1: [PASS/FAIL - if fail, explain why and rewrite]
Version 2: [PASS/FAIL - if fail, explain why and rewrite]
Version 3: [PASS/FAIL - if fail, explain why and rewrite]
</anti_pattern_results>

━━━━━━━━━━━━━━━━━━━━━━
STEP 5: FINAL SELECTION
━━━━━━━━━━━━━━━━━━━━━━

Pick the version that:
- Makes the most specific, falsifiable claim
- Would make someone go "wait, what?" not "yeah, I guess"
- Uses a structure you haven't seen in your recent tweets
- You'd be most nervous to post (because it's most specific)

<final_choice>
Chosen version: [1/2/3]
Why: [one sentence on why this is sharpest]
Final character count: [exact number, must be ≤260]
</final_choice>

━━━━━━━━━━━━━━━━━━━━━━
STEP 6: OUTPUT
━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No markdown, no code blocks, no explanatory text before or after.

{
  "tweetText": "your chosen tweet (under 260 chars)",
  "selectedHeadlineNumber": 1,
  "character_count": 245,
  "hashtags": [],
  "reasoning": {
  "version1": "",
  "version2": "",
  "version3": "",
  "decision": "Which version you picked and Why this angle is more interesting than the obvious take"
  }
}

FINAL CHECKS:
- Character count ≤ 260? 
- No banned phrases?
- Specific to THIS story (can't apply to others)?
- Makes a falsifiable claim someone could argue with?
- selectedHeadlineNumber matches the article you analyzed?

${timeMarker}
${tokenMarker}
`;

    return prompt;
  }
}
