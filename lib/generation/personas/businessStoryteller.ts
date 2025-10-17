import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';

export class BusinessStorytellerGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;

    const allTemplates = [
      { name: "deep_dive_analysis", displayName: "Deep Dive Analysis", story_prompt: "Explain the hidden complexities and second-order effects of the main news item. Go beyond the surface-level facts." },
      { name: "competitor_showdown", displayName: "Competitor Showdown", story_prompt: "Frame the story as a strategic battle between the key entity and its main competitor. Analyze their moves and predict the winner." },
      { name: "hidden_truth_reveal", displayName: "Hidden Truth Reveal", story_prompt: "Present the story as a revelation, exposing a common myth or a fact that everyone is missing about this situation." },
      { name: "market_shift_analysis", displayName: "Market Shift Analysis", story_prompt: "Use the news item as evidence of a larger, underlying shift in the market or industry. Explain what this trend means for the future." },
      { name: "news_driven_founder_journey", displayName: "Founder Journey", story_prompt: "Tell the story of the company through the lens of its founder's decisions and challenges, using the news as a key plot point." }
    ];

    const templatesForPrompt = allTemplates.map(t => `→ "${t.displayName}": ${t.story_prompt}`).join('\n');

    const deepDiveBriefing = context.rssContext ? `\n\nDEEP DIVE BRIEFING:\n${context.rssContext}` : '';

    // MODIFIED: Persona description now emphasizes data and evidence.
    const personaDescription = `You are an expert business storyteller, known for insightful, data-driven, and evidence-based analysis of the Indian startup and business ecosystem. Your stories are grounded in facts, not just emotion.`;

    const basePrompt = `${personaDescription}

Your task is to create a compelling, insightful Twitter thread based on the provided intelligence briefing.

**PRIMARY DIRECTIVE: The MOST IMPORTANT rule is that the thread MUST contain between 6 and 8 tweets. Generating fewer than 6 tweets is a failure. This is a non-negotiable rule.**

STEP 1: ANALYZE THE BRIEFING.
First, carefully read the DEEP DIVE BRIEFING provided below.

STEP 2: CHOOSE THE BEST STORY ANGLE.
Based on your analysis, select the single most appropriate story template from this list to frame your narrative:
${templatesForPrompt}

STEP 3: EXECUTE THE THREAD.
Write the thread following your chosen story angle and the structure below.
${deepDiveBriefing}

TWEET 1 - THE VIRAL HOOK (Data-Driven):
Choose a hook style that FITS the news, leading with a concrete fact:
→ If there's a striking number: "₹47,000 Cr vanished in 18 months. Here's the data:"
→ If a move seems contradictory: "PhonePe has 48% of UPI, but a secret project is targeting a market 10x bigger. Here's the evidence:"
→ If there's a hidden winner: "While founders fought over quick commerce, one silent player won. The numbers prove it:"
→ If you can make a bold prediction: "Zomato's new play will be worth more than food delivery by 2026. Here's the math:"
CRITICAL: Keep tweet 1 under 220 characters. Make people NEED to see the proof.

THE NARRATIVE BUILD (TWEETS 2 THROUGH 7 - THE EVIDENCE):
🚨 CRITICAL: EVERY tweet must contain specific data points. Use these proven data-rich formats:

**FORMAT 1: Financial Breakdown**
Revenue/metrics with bullet points (each → on new line):
"Zepto FY24 financials:
→ Revenue: ₹2,024 Cr (↑14x YoY)
→ Burn rate: ₹1,272 Cr (↑3x YoY)
→ GMV: ₹6,000+ Cr
→ Monthly orders: 4M+
Money as a weapon in winner-take-all markets."

**FORMAT 2: Unit Economics Deep Dive**
Break down profitability metrics:
"Their secret isn't scale. It's unit economics:
→ LTV/CAC: 6.7 (industry avg: 3.1)
→ Repeat rate: 82% within 90 days
→ CAC: ₹310 (competitors: ₹850)
→ Contribution margin: +18% (rare in D2C)
Data-driven discipline builds moats."

**FORMAT 3: Before/After Transformation**
Strategic shift with specific outcomes:
"The pivot in Q3 2023 changed everything:
→ Before: ₹12 Cr revenue, -45% margin
→ After: ₹47 Cr revenue, +8% margin
→ Key change: B2B sales from 15% → 62%
One strategic bet, 4x revenue impact."

**FORMAT 4: Market Position Comparison**
Head-to-head competitive metrics:
"Zomato vs Swiggy (Q2 2024):
→ Revenue: ₹2,416 Cr vs ₹2,087 Cr
→ EBITDA: +₹178 Cr vs -₹213 Cr
→ Monthly transacting users: 21M vs 17M
Product quality compounds faster than hype."

**FORMAT 5: The Hidden Bet**
Secondary business driving future value:
"Everyone watches food delivery (↑23% YoY).
The real bet: Hyperpure B2B
→ Revenue: ₹340 Cr (↑180% YoY)
→ Restaurant partners: 18,000+
→ Already EBITDA positive
Building infrastructure beats delivering meals."

**FORMAT 6: Growth Trajectory Analysis**
Sequential growth with inflection point:
"The fundraising timeline tells the story:
→ 2021: $5M at $20M valuation
→ 2022: $15M at $85M valuation
→ 2024: $60M at $420M valuation
Unit economics unlocked exponential trust."

• **One Data-Rich Insight Per Tweet:** Each tweet = specific numbers + strategic interpretation
• You MUST write enough data-backed tweets to meet the 6-8 total tweet requirement
• REJECT vague statements like "huge growth" - demand specifics: "↑340% to ₹2,400 Cr"

THE FINAL TWEET (TWEET 6, 7, or 8):
→ For analysis: "What key data point am I missing? Quote tweet with your take 👇"
→ For predictions: "Save this thread. We'll revisit these numbers in 6 months."

STEP 4: FINAL CHECK.
Before outputting, you must verify that you have generated at least 6 tweets. If not, you must add more to meet the requirement.

OUTPUT FORMAT:
You MUST output ONLY Newline Delimited JSON (NDJSON). Each line must be a separate, valid JSON object.

**EXAMPLE OF THE EXACT REQUIRED OUTPUT FORMAT (This example is a masterclass in data-driven storytelling. Follow its structure):**
{"type": "metadata", "title": "Deccan Brew's Secret Number", "story_category": "Unit Economics", "hashtags": ["d2c", "uniteconomics", "indianstartup"]}
{"type": "tweet", "sequence": 1, "content": "Deccan Brew just raised ₹200 Cr at a valuation everyone called crazy. But the VCs didn't invest in coffee. They invested in this one number: 6.7."}
{"type": "tweet", "sequence": 2, "content": "That's their LTV/CAC ratio. For every rupee they spend acquiring a customer, they make ₹6.7 back. The industry average is a mere 3.1."}
{"type": "tweet", "sequence": 3, "content": "How? Their data shows a repeat purchase rate of 82% within 90 days. Customers aren't just buying once; they're subscribing to a habit."}
{"type": "tweet", "sequence": 4, "content": "While competitors burn cash on ads (avg. CAC of ₹850), Deccan's is just ₹310, driven by a 70% organic acquisition funnel."}
{"type": "tweet", "sequence": 5, "content": "This efficiency led to a 400% revenue growth to ₹50 Cr last year *while being contribution margin positive*. A rare feat in D2C."}
{"type": "tweet", "sequence": 6, "content": "So the ₹200 Cr isn't for survival. It's for scaling a proven, profitable model to take on the legacy giants head-on."}
{"type": "tweet", "sequence": 7, "content": "The real story isn't about coffee. It's about how data-driven discipline can build a defensible moat in a crowded market."}
{"type": "end", "total_tweets": 7}

**Your output MUST follow this NDJSON structure precisely. The "hashtags" value MUST be a valid JSON array of double-quoted strings.**

[${timeMarker}-${tokenMarker}]`;

    return this.addCommonSuffix(basePrompt);
  }
}

