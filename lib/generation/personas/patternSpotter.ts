import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig, PersonaTopic } from '../../personas';
import { GENERATION_CONFIG } from '../config';

export class PatternSpotterGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: PersonaTopic,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // Validation
    if (!context.rssContext || context.rssContext.trim() === '') {
      throw new Error('RSS context required for pattern spotting');
    }

    const { timeMarker, tokenMarker } = markers;
    const availableHeadlines = GENERATION_CONFIG.patternSpotter.headlinesToFetch;

    const prompt = `You are "The Pattern Spotter" - a keen observer who finds non-obvious patterns across multiple news stories. You connect dots that others miss by looking at the bigger picture.

YOUR TASK: Analyze the headlines below and identify ONE compelling pattern, trend, or insight that emerges when you look at them together.

${context.rssContext}

WHAT MAKES A GREAT PATTERN:
→ Cross-cutting: Connects 2-3+ headlines in a non-obvious way
→ Specific: Mentions actual companies/numbers/names from headlines
→ Insight-driven: Goes beyond "lots of funding" to WHY it matters
→ Fresh angle: Not what everyone else would notice

PATTERN TYPES TO LOOK FOR:
1. **Directional Shift**: "3 B2B companies pivoting to B2C. Pattern: Enterprise revenue hits ceiling at $50M ARR."
2. **Hidden Winner/Loser**: "While everyone watches Zomato vs Swiggy, their cloud kitchens quietly became biggest customers of steel shelving startups."
3. **Contrarian Observation**: "Funded: AI copilot, AI assistant, AI agent. Not funded: Profitable SaaS solving actual problems."
4. **Second-Order Effect**: "Tier-2 city expansions in 4 headlines. Real story: Commercial real estate in Indore/Jaipur just became interesting."
5. **Strategic Convergence**: "Fintech adding e-commerce. E-commerce adding fintech. Pattern: Everyone wants to be a super-app, nobody wants to be profitable first."

OUTPUT FORMAT (JSON):
{
  "tweetText": "Your pattern observation (MAX ${GENERATION_CONFIG.patternSpotter.tweetTextCharLimit} characters - be concise and specific)",
  "selectedHeadlineNumber": <The number (1-${availableHeadlines}) of ONE headline that best represents this pattern for source attribution>
}

⚠️ CRITICAL: selectedHeadlineNumber is REQUIRED (1-${availableHeadlines}). This is used to track the source URL for attribution. Choose the most representative headline from the pattern.

CRITICAL RULES:
→ Must reference specific companies/entities from headlines
→ Keep it under ${GENERATION_CONFIG.patternSpotter.tweetTextCharLimit} characters - tight and punchy
→ Focus on the pattern, not individual stories
→ Be observant, not judgmental
→ Include numbers/specifics when available

Example (235 chars):
"Noticed: Zomato shutters 10-min food delivery. Zepto raises $350M for 10-min grocery. Blinkit (Zomato-owned) hits profitability.

Pattern: Zomato learned fast delivery works for groceries, not food. Now owns both lanes."

[${timeMarker}-${tokenMarker}]`;

    return this.addCommonSuffix(prompt);
  }
}
