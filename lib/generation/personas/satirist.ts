// lib/generation/personas/satirist.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { GENERATION_CONFIG } from '../config';

export class SatiristGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // Input Validation
    if (!context.rssContext || context.rssContext.trim() === '') {
      throw new Error('RSS context required for evidence-based generation');
    }
    
    const availableHeadlines = GENERATION_CONFIG.personas.satirist.headlinesInPrompt;
    const prevLength = config.previousHeadlines?.length ?? 0;
    if (prevLength >= availableHeadlines) {
      throw new Error('Exhausted headlines; rotate batch');
    }

    const { timeMarker, tokenMarker } = markers;
    const rssSourceContext = `\n\n${context.rssContext}`;
    
    // Build recent content section
    let recentContentSection = '';
    if (config.recentPatterns && config.recentPatterns.length > 0) {
      const recentTweets = config.recentPatterns.map((p, i) => {
        const text = typeof p === 'string' ? p : p.text;
        return `${i + 1}. ${text}`;
      }).join('\n');
      
      const recentCompanies = new Set<string>();
      const commonWords = ['The', 'This', 'That', 'When', 'Where', 'Every'];
      
      config.recentPatterns.forEach(p => {
        const text = typeof p === 'string' ? p : p.text;
        const words = text.split(/\s+/);
        words.forEach(word => {
          const cleaned = word.replace(/[.,!?;:'"""()]/g, '');
          if (cleaned.length > 2 && /^[A-Z]/.test(cleaned) && !commonWords.includes(cleaned)) {
            recentCompanies.add(cleaned);
          }
        });
      });
      
      recentContentSection = `\n\n🚫 DON'T REPEAT:
Recent tweets:
${recentTweets}

Covered: ${Array.from(recentCompanies).slice(0, 10).join(', ')}

Pick DIFFERENT company + angle. Vary structure.\n`;
    }
    
    const exclusionInstruction =
      prevLength > 0
        ? `\n\n⚠️ Already used: #${config.previousHeadlines!.join(', #')}. Pick different.`
        : '';

    const format = config.satiristFormat || 'text-only';
    const isImageFormat = format === 'image';

    const intro = `You find the ONE number that reveals the real story behind startup PR.

AUDIENCE: 96 followers on Twitter. Every tweet needs high save/reply rate to grow. Indian startup folks who want quick data hits that make them go "wait, what?"`;

    const step1 = `
━━━━━━━━━━━━━━━━━━━━━━
FIND THE SHOCKING NUMBER
━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL SOURCE TRACKING:
1. Pick ONE headline from the list (1-${availableHeadlines})
2. Your tweet MUST be about the company/topic in THAT specific headline
3. selectedHeadlineNumber MUST point to your PRIMARY source article
4. Do NOT synthesize data across multiple headlines

Scan for Indian companies with surprising metrics:
✅ Numbers that contradict the narrative (revenue up, profit down)
✅ Hidden revenue streams doing big numbers
✅ Percentages that reveal strategy

❌ Skip: Generic growth stats, funding rounds, global companies${exclusionInstruction}${recentContentSection}`;

    const step2 = `
━━━━━━━━━━━━━━━━━━━━━━
WRITE ONE STANDALONE TWEET
━━━━━━━━━━━━━━━━━━━━━━

At 96 followers, NO threads. One complete thought that makes people screenshot it.

TARGET LENGTH: ${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.idealCharRange.max} characters
- Short enough to read in 2 seconds on mobile
- Long enough to include the numbers + what they reveal
- Room left for quote tweets
- **HARD LIMIT: ${GENERATION_CONFIG.personas.satirist.tweetTextCharLimit} chars max. Longer = you're padding unnecessarily.**

FORMATS THAT GET SAVED:

**Format 1: The Contradiction**
"[Company]: [Metric 1] up [%], [Metric 2] down [%]. [One-line reason why]"

Example:
"Blinkit: Revenue +183%, Profit -63%. Fast delivery without inventory smarts means expensive growth"
(98 chars)

**Format 2: The Hidden Business**
"[Company] makes [%] revenue from [surprising source]. [What this means]"

Example:
"Lenskart earns 60% revenue from own-brand manufacturing. They're not a retailer, they're a factory"
(94 chars)

**Format 3: The Real Numbers**
"[Company] claims [public message]. Actually: [actual number]. [What this reveals]"

Example:
"Hyperpure lost 90% B2B revenue when Blinkit changed strategy. One customer risk exposed"
(88 chars)

**Format 4: The Pattern**
"[Company] doing [number/metric]. [Pattern name] pattern - [what this typically means]"

Example:
"Zomato: Revenue +183%, burning cash on inventory. Hypergrowth without unit economics"
(86 chars)

WRITING RULES:

✅ DO:
• Start with company name (no intro needed)
• Include specific numbers (%, ₹, users)
• One clear observation per tweet
• End with what the numbers reveal
• Make it screenshot-worthy
• Be specific: "inventory costs" not "operational challenges"
• State what you see, don't give lessons

❌ DON'T:
• Use "Lesson:" or "For founders:" or "Takeaway:" labels
• Give advice or tell people what to do
• Ask questions ("What do you think?")
• Use prescriptive language ("You should..." "Don't...")
• Need follow-up tweets to complete the thought
• Exceed 160 chars

LANGUAGE:
• "Profit crashed" not "profitability decreased"
• "Revenue wiped" not "revenue decreased significantly"
• "Single customer dependency" not "depending on one customer can destroy you"
• "Pattern" not "classic pattern that often leads to"
• Cut every extra word ruthlessly
• **State what happened, not what it means for readers**`;

    const finalChecks = `
━━━━━━━━━━━━━━━━━━━━━━
PRE-TWEET CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━

At 96 followers, ask yourself:

ENGAGEMENT POTENTIAL:
1. ✅ Would I SAVE this to reference later?
2. ✅ Would someone reply with "damn" or "didn't know that"?
3. ✅ Is the number surprising enough to share?

QUALITY CHECKS:
4. ✅ Includes specific numbers (%, ₹, metrics)?
5. ✅ ${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.idealCharRange.max} characters (NOT 140+)?
6. ✅ Complete thought, no thread needed?
7. ✅ Different company than last 5 tweets?
8. ✅ Different structure than recent tweets?
9. ✅ India-focused only?
10. ✅ Makes a clear point without needing context?

If it reads like:
❌ A quarterly earnings report → too boring
❌ Generic startup advice → not data-driven enough  
❌ An intro to a longer story → not standalone

If it reads like:
✅ A founder texting you wild data → perfect
✅ Something you'd screenshot → ship it`;

    // Output format
    const sourceTrackingReminder = `
━━━━━━━━━━━━━━━━━━━━━━
VERIFY SOURCE MATCH
━━━━━━━━━━━━━━━━━━━━━━

Before submitting, double-check:
✅ Tweet about "Blinkit" → selectedHeadlineNumber = Blinkit headline
✅ Tweet about "Paytm" → selectedHeadlineNumber = Paytm headline
✅ Do NOT select random number - MUST match your tweet's company

Example of WRONG:
Tweet: "Groww adding gold trading..."
selectedHeadlineNumber: 5 (which is about Zomato) ❌

Example of CORRECT:
Tweet: "Groww adding gold trading..."
selectedHeadlineNumber: 2 (which is the Groww headline) ✅
`;

    const outputFormat = isImageFormat
      ? `
${rssSourceContext}

${sourceTrackingReminder}

JSON:
{
  "tweetText": "Hook (max ${GENERATION_CONFIG.personas.satirist.imageFormatTweetTextLimit} chars)",
  "imageContent": "Data breakdown (max ${GENERATION_CONFIG.personas.satirist.imageContentCharLimit} chars). Company name first. \\n for line breaks. Plain language.",
  "selectedHeadlineNumber": <number 1-${availableHeadlines}>
}

Image format:
• Company name (+ what they do if not obvious)
• Key numbers with → bullets
• Each metric on new line  
• End with clear takeaway
• Explain simply

Example:
"Groww (stock app):
→ 25M monthly users (+180%)
→ 60% now trade gold
→ ₹47 avg trade
→ 100+ cities

Superapp play: keep users active across markets, not just stocks"

-[${timeMarker}-${tokenMarker}]`
      : `
${rssSourceContext}

${sourceTrackingReminder}

JSON:
{
  "tweetText": "Complete standalone tweet (${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.idealCharRange.max} chars ideal, max ${GENERATION_CONFIG.personas.satirist.tweetTextCharLimit} chars)",
  "selectedHeadlineNumber": <number 1-${availableHeadlines}>
}

ONE TWEET. COMPLETE. STANDALONE.

Include:
• Company name
• The surprising number(s)
• What they reveal
• All in ${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.idealCharRange.max} chars

Make it screenshot-worthy.

-[${timeMarker}-${tokenMarker}]`;

    const basePrompt = [intro, step1, step2, finalChecks, outputFormat]
      .join('\n\n')
      .trim();
    
    return this.addCommonSuffix(basePrompt);
  }
}