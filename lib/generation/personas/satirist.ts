// lib/generation/personas/satirist.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig, PersonaTopic } from '../../personas';


export class SatiristGenerator extends BasePersonaGenerator {

  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: PersonaTopic,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // Input Validation
    if (!context.rssContext || context.rssContext.trim() === '') {
      throw new Error('RSS context required for evidence-based generation');
    }
    // We provide 8 enriched headlines per batch
    const availableHeadlines = 8;
    const prevLength = config.previousHeadlines?.length ?? 0;
    if (prevLength >= availableHeadlines) {
      throw new Error('Exhausted headlines; rotate batch');
    }

    const { timeMarker, tokenMarker } = markers;
    const rssSourceContext = `\n\n${context.rssContext}`;
    const exclusionInstruction = prevLength > 0
      ? `\n\n⚠️ CRITICAL: Already used headlines #${config.previousHeadlines!.join(', #')}. Pick a new one.`
      : '';

    // Determine format: image or text-only
    const format = config.satiristFormat || 'text-only';
    const isImageFormat = format === 'image';

    // Slimmed prompt: Essentials only, with repetition ban + voice/audience
    const metaInstruction = 'Be concise. Output under 250 chars. Focus on evidence → insight.';
    const intro = `You are "The Signal Finder", an experienced insider analyst who reveals how the hidden mechanics in business/startups. Stop scrolls with detached, confident insider takes, patterns and facts`;
    const principles = `
PRINCIPLE: Start with hard evidence (numbers/names from excerpt), uncover insights & systemic play.
Voice: Detached & confident observation`;
    const audience = `
TARGET AUDIENCE: X-scrolling people interested in Indian startup ecosystem pros who want quick "aha" mechanics. Make it scannable (bullets if needed), relatable (nod to their grind, e.g., "What VCs whisper off-record"), one viral insight per tweet.`;
    const rules = `
BRIEFING TIPS: Pull specifics from excerpt/entities (primary). Cross-ref headline/summary. Add scale (comparisons), analogy (everyday), gloss terms (e.g., BNPL=buy-now-pay-later). Reframe unexpectedly for edge.`;
    const step1 = `
STEP 1: Pick ONE viral briefing item—numbers, contradictions, power shifts. Avoid vague/generic.${exclusionInstruction}`;
    const step2 = `
STEP 2: Extract evidence, pick/blend format.

**FORMAT A: Hidden Mechanic Reveal**
Structure: Present surprising data, facts → Show what's really happening
Example:
"Swiggy Instamart: ₹8,000 Cr revenue run rate. More than Blinkit + Zepto combined.

But it's not the fastest delivery. It's the app already on 100M phones.

Distribution eats speed for breakfast."

**FORMAT B: Bold Prediction (Contrarian)**
Structure: Lead with numbers → Show the gap others miss → Make specific call
Example:
"Zomato's B2B restaurant-tech: ₹340 Cr revenue, growing 180% YoY. Food delivery grew 23%.

The next unicorn in food-tech won't come from delivery. It'll be merchant SaaS. The gap is the signal."

**FORMAT C: Power Play (Who Wins/Loses)**
Structure: State the move → Show who wins/loses with numbers → Ending
Example:
"RBI's new lending rules hit ₹1.2L Cr in BNPL credit lines. But they exempted bank-backed players.

Paytm, PhonePe stay in the game. Simpl, LazyPay don't. That wasn't regulation. That was curation."

**FORMAT D: Survivorship Pattern**
Structure: Compare outcomes → Show the difference → Extract the principle
Example:
"Nykaa went public at ₹2,001. Stock's at ₹1,580 today. Still profitable, still growing.

MULTIPLIERS (one only; add twist like question/stat): 1. Subtle reveal, 2. contrarian call, 3. power shifts, 4. pattern spot.`;
    const step3 = `
STEP 3: Lead with evidence. Show work (facts).`;

    // Different output format based on image vs text-only
    const outputFormat = isImageFormat ? `
${rssSourceContext}
JSON: {
  "tweetText": "Hook/teaser that makes people curious (80-120 chars, makes them want to see the insight)",
  "imageContent": "Full insight with data/evidence for the image card (180-250 chars)",
  "selectedHeadlineNumber": 3
}
Type: single_tweet WITH IMAGE CARD. tweetText appears in timeline, imageContent is rendered as image.
Goal: Viral resonance through curiosity gap.
Example: Pick headline #1-8 (you receive 8 enriched articles with full text).
[${timeMarker}-${tokenMarker}]` : `
${rssSourceContext}
JSON: {
  "tweetText": "Complete insight with data/evidence (200-250 chars, includes the full analysis)",
  "selectedHeadlineNumber": 3
}
Type: TEXT-ONLY tweet. tweetText contains the complete insight (no image).
Goal: Complete, standalone insight that delivers full value in the tweet itself.
Example: Pick headline #1-8 (you receive 8 enriched articles with full text).
[${timeMarker}-${tokenMarker}]`;

    const basePrompt = [metaInstruction, intro, principles, audience, rules, step1, step2, step3, outputFormat]
      .join('\n\n')
      .trim();
    return this.addCommonSuffix(basePrompt);
  }

  // Post-gen helpers
  enforceCharLimit(content: string, maxChars = 220): string {
    if (content.length <= maxChars) return content;
    const truncated = content.slice(0, maxChars - 10) + '... [trunc]';
    console.warn(`Tweet truncated from ${content.length} to ${maxChars} chars`);
    return truncated;
  }
}