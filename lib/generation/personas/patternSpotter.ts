// lib/generation/personas/patternSpotter.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { GENERATION_CONFIG } from '../config';

export class PatternSpotterGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // Validation
    if (!context.rssContext || context.rssContext.trim() === '') {
      throw new Error('Enriched articles required for Socratic reasoning');
    }

    const { timeMarker, tokenMarker } = markers;

    // Build recent patterns section for deduplication
    let recentPatternsSection = '';
    if (config.recentPatterns && config.recentPatterns.length > 0) {
      const patternTexts = config.recentPatterns.map((p, i) => {
        const text = typeof p === 'string' ? p : p.text;
        return `${i + 1}. ${text}`;
      }).join('\n');

      const recentCompanies = new Set<string>();
      const commonWords = ['The', 'This', 'Same', 'One', 'Not', 'But', 'Then', 'Now', 'Every', 'What', 'When', 'Remember'];

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

      recentPatternsSection = `
🚫 AVOID REPEATING

Recent tweets:
${patternTexts}

Companies covered: ${Array.from(recentCompanies).slice(0, 10).join(', ')}

Pick DIFFERENT company + DIFFERENT insight angle.
`;
    }

    const prompt = `You use Socratic reasoning to find non-obvious insights about Indian startups.

AUDIENCE: 96 followers. Need high save rates. Every insight must work standalone, screenshot-worthy.

━━━━━━━━━━━━━━━━━━━━━━
ENRICHED ARTICLES (Full Context)
━━━━━━━━━━━━━━━━━━━━━━

${context.rssContext}

━━━━━━━━━━━━━━━━━━━━━━
STEP 1: CHOOSE ARTICLE & INSIGHT TYPE
━━━━━━━━━━━━━━━━━━━━━━

Pick ONE article from above. Read the full text carefully.

What type of insight can you extract?

**Type A: Competitive Positioning**
→ Company X vs Competitor Y reveals strategic bet
→ Use when: Article mentions specific strategies/metrics

**Type B: Business Model Reveal**
→ Multiple revenue streams, one funds the other
→ Use when: Article shows different margin profiles

**Type C: Counter-Intuitive Metric**
→ Two metrics moving in opposite directions
→ Use when: Article has contradictory data

**Type D: Strategic Evolution**
→ Company changed approach, reveals what they learned
→ Use when: Article discusses pivots or strategy shifts

**Type E: Market Structure**
→ Who controls critical resource/relationship
→ Use when: Article reveals power dynamics

━━━━━━━━━━━━━━━━━━━━━━
STEP 2: SOCRATIC QUESTIONS (Choose the right set)
━━━━━━━━━━━━━━━━━━━━━━

**For Type A - Competitive Positioning:**

Q1: What is [Company] doing specifically?
→ Extract the concrete action/metric from article

Q2: Who is their direct Indian competitor?
→ Must be Indian company in same space
→ If unclear, use closest competitor mentioned

Q3: How does competitor approach this differently?
→ Use your knowledge or info from article
→ Be specific about the contrast

Q4: Why would [Company] choose their way over competitor's?
→ Strategic reason: cost, speed, market, moat
→ Avoid generic answers

Q5: What bet is [Company] making?
→ Format: "[X] beats [Y]" or "[X] creates [Y]"
→ This is your core insight

**For Type B - Business Model Reveal:**

Q1: What are the revenue streams mentioned?
→ List them with their margins if available

Q2: Which stream comes first in customer journey?
→ What's the entry point?

Q3: What does the first stream enable for the second?
→ Data? Trust? Network effects?

Q4: Where are the real margins?
→ Which stream is actually profitable?

Q5: What's the actual product?
→ The insight: "X isn't product, it's [purpose] for Y"

**For Type C - Counter-Intuitive Metric:**

Q1: What two metrics are moving opposite directions?
→ Must be specific numbers from article

Q2: What's the usual assumption?
→ What would most people expect?

Q3: What's actually happening?
→ Why the contradiction?

Q4: What does this reveal about priorities?
→ What are they optimizing for?

Q5: The hidden bet?
→ "[X] now, fix [Y] later" or "[X] over [Y]"

**For Type D - Strategic Evolution:**

Q1: What was the original approach?
→ What did they do before?

Q2: What's the new approach?
→ What are they doing now?

Q3: What's common between them?
→ The asset/capability being reused

Q4: Why make this shift?
→ What constraint or opportunity drove it?

Q5: The strategic insight?
→ "[X] was really about [Y]" or "[Asset] beats [new build]"

**For Type E - Market Structure:**

Q1: Who controls the critical resource?
→ Platform, data, supply, regulation?

Q2: How does this control create leverage?
→ What can they do that others can't?

Q3: What's the downstream effect?
→ How does this shape market dynamics?

Q4: Who benefits/loses from this structure?
→ Be specific about players

Q5: The power insight?
→ "[X] controls [Y], determines [Z]"

━━━━━━━━━━━━━━━━━━━━━━
STEP 3: CRAFT YOUR TWEET
━━━━━━━━━━━━━━━━━━━━━━

Based on your Socratic answers, write ONE tweet.

**FORMULA (adapt based on insight type):**

Competitive: [Company]: [Their way] vs [Competitor]: [Their way]. [The bet]
Business Model: [Company]: [Stream A] → [Stream B]. [Real product insight]
Counter-Intuitive: [Company]: [Metric 1] ↑, [Metric 2] ↓. [What this reveals]
Evolution: [Company]: [Old way] → [New way]. [Asset insight]
Market Structure: [Company] controls [X]. [Power dynamic]

**EXAMPLES BY TYPE:**

Type A - Competitive:
"Zepto: 2,500 SKUs vs Blinkit: 8,000. Zepto bets curation beats selection. Faster picks, easier scale"
(103 chars)

Type B - Business Model:
"Razorpay: Gateway 1.5%, neo-bank 10%. Gateway isn't product, it's data for lending. B2B beats B2C"
(98 chars)

Type C - Counter-Intuitive:
"Blinkit: Revenue +183%, losses +63%. Growth without unit economics. Land grab over profitability"
(97 chars)

Type D - Evolution:
"Swiggy: 8 years food-only, now quick commerce. Delivery network was the real asset"
(83 chars)

Type E - Market Structure:
"PhonePe: Controls UPI rails, monetizes via insurance. Transaction access determines margin stack"
(97 chars)

**CONSTRAINTS:**

✅ 80-120 characters (hard limit: ${GENERATION_CONFIG.personas.patternSpotter.tweetTextCharLimit})
✅ Include @handle if article mentions company Twitter
✅ Use specific numbers from article body
✅ Complete thought, no thread needed
✅ India companies only (skip global players)
✅ Different company than recent tweets

${recentPatternsSection}

━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKLIST (Before submitting)
━━━━━━━━━━━━━━━━━━━━━━

1. ✅ Would I SAVE this for later?
2. ✅ Does it reframe how I see this company?
3. ✅ 80-120 chars?
4. ✅ Specific numbers/companies (not generic)?
5. ✅ Works without context (standalone)?
6. ✅ Different from last 5 tweets?
7. ✅ Based on ONE article's content?
8. ✅ Earned through reasoning, not stated as fact?

If any answer is no → rewrite

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━

Return JSON with your Socratic reasoning:

{
  "tweetText": "Your insight (80-120 chars)",
  "selectedHeadlineNumber": <1, 2, or 3>,
  "insightType": "competitive|businessModel|counterIntuitive|evolution|marketStructure",
  "thinking": {
    "q1": "Your answer to Q1",
    "q2": "Your answer to Q2",
    "q3": "Your answer to Q3",
    "q4": "Your answer to Q4",
    "q5": "Your answer to Q5 (the core insight)"
  }
}

**CRITICAL:**
- selectedHeadlineNumber MUST match the article you used (1, 2, or 3)
- Include full thinking process (helps improve future tweets)
- Character count includes company @handles if used

━━━━━━━━━━━━━━━━━━━━━━
FINAL REMINDERS
━━━━━━━━━━━━━━━━━━━━━━

At 96 followers:
→ Saves > likes (make it reference-worthy)
→ Insight > observation (show reasoning)
→ Specific > vague (numbers, names, timeframes)
→ Contrarian > consensus (challenge assumptions)
→ India companies only

Your signature: Socratic insights that make people go "oh SHIT, never saw it that way"

Make them screenshot it.

-[${timeMarker}-${tokenMarker}]`;

    return this.addCommonSuffix(prompt);
  }
}
