// lib/generation/personas/satirist.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { GENERATION_CONFIG } from '../config';
import { extractEntities } from '../articleEnricher';

export class SatiristGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // Input Validation
    if (!context.rssContext || context.rssContext.trim() === '') {
      throw new Error('RSS context (articlesJson) required for satirist');
    }
    

    const { timeMarker, tokenMarker } = markers;
    const rssSourceContext = context.rssContext;

    const commonWords = new Set([
      "The", "But", "And", "Shows", "This", "That", "Example", "Data", 
      "It's", "They're", "Now", "New", "Key", "Big", "Major", "Their", 
      "Its", "Has", "Had", "VC", "Fund", "Startup", "Company", "Platform", 
      "App", "Tech", "CEO", "Founder"
    ]);

    // Build recent content section with improved entity extraction
    let recentContentSection = '';
    const recentCompanies = new Set<string>();
    if (config.recentPatterns && config.recentPatterns.length > 0) {
      config.recentPatterns.forEach((p) => {
        const text = typeof p === 'string' ? p : p.text;

        // Extract company from "Company:" pattern
        const match = text.match(/^([a-zA-Z0-9\s&'-]+):/);
        if (match && match[1]) {
          recentCompanies.add(match[1].trim().toLowerCase());
        }
        
        // Extract other entities
        const entities = extractEntities(text, {
          ignoreWords: commonWords,
          minLength: 3,
        });
        entities.forEach((entity) => {
          recentCompanies.add(entity.trim().toLowerCase());
        });
      });
      
      if (recentCompanies.size > 0) {
        const companyList = Array.from(recentCompanies).slice(0, 15).join(', ');
        recentContentSection = `
**AVOID REPETITION:**
Recently covered: ${companyList}
Choose a DIFFERENT company and angle.
`;
      }
    }
    
    const exclusionInstruction =
      config.previousHeadlines && config.previousHeadlines.length > 0
        ? `Already used article numbers: ${config.previousHeadlines.join(', ')}. Pick a different article.`
        : '';

    const format = config.satiristFormat || 'text-only';
    const isImageFormat = format === 'image';

    const prompt = `
You're a sharp startup analyst who explains business moves through revealing data points.

Your audience: Founders and operators with 96 Twitter followers who need high-signal insights to grow.

**CRITICAL: Output ONLY valid JSON. If no valid article found, output error JSON.**

━━━━━━━━━━━━━━━━━━━━━━
STEP 1: FIND VALID ARTICLE
━━━━━━━━━━━━━━━━━━━━━━

${rssSourceContext}

**REQUIREMENTS (ALL must pass):**
1. Article focuses on ONE specific Indian startup/tech company
2. Article contains specific numbers OR a key strategic insight
3. Company must be doing something operational (not just fundraising/hiring/talking)

**IMMEDIATE REJECTION (output {"error":"banned-article-type"}):**
❌ Global tech companies (Meta, Google, Amazon, Microsoft, Apple, Netflix, Tesla, etc.)
❌ VC funds or investor-focused pieces ("X Fund raises...", "Investor backs...")
❌ Listicles ("Top 5...", "Four startups...", "Best of...")
❌ Sector trend pieces without specific company focus
❌ Policy/government news without company impact data
❌ Event coverage (conferences, summits, awards)
❌ Leadership changes without operational context

${exclusionInstruction}
${recentContentSection}

━━━━━━━━━━━━━━━━━━━━━━
STEP 2: EXTRACT THE INSIGHT
━━━━━━━━━━━━━━━━━━━━━━

Once you select an article, extract:

**selectedArticle:** <article number>
**company:** <Company Name>
**companyContext:** <2-4 word descriptor if company isn't famous, e.g., "The fintech co" or "The furniture rental co">
**keyData:** <Exact numbers/metrics from article - NO calculations, NO currency conversions>
**insight:** <The "so what?" - what does this data reveal about their strategy?>

**DATA RULES:**
✅ Use numbers EXACTLY as stated in article
✅ If article says "INR 127 Cr", you write "INR 127 Cr" (NOT "$14M")
✅ If article says "40%", you write "40%" (don't calculate other percentages)
❌ Never invent numbers not in the article
❌ Never mix data from different contexts (e.g., funding amount vs. factory cost)

━━━━━━━━━━━━━━━━━━━━━━
STEP 3: WRITE THE TWEET
━━━━━━━━━━━━━━━━━━━━━━

**STRUCTURE:**
[Company]: [Context if needed] [The data point]. [The insight/implication].

**TONE GUIDELINES:**
✅ Sharp and factual (like explaining to a founder friend)
✅ Show the trade-off or tension in the data
✅ Witty but never cute
✅ Conversational but never casual

**BANNED WORDS/PHRASES:**
❌ "quietly" (overused cliche)
❌ "The real story/number is..."
❌ "This isn't X, it's Y" structure
❌ "Like a..." comparisons
❌ "trojan horse", "treadmill", "smokescreen"
❌ No hashtags, no emojis, no advice-giving

**LENGTH:** ${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.idealCharRange.max} chars ideal, max ${GENERATION_CONFIG.personas.satirist.tweetTextCharLimit} chars

━━━━━━━━━━━━━━━━━━━━━━
VARIED FORMATS (ROTATE THROUGH THESE)
━━━━━━━━━━━━━━━━━━━━━━

**Format 1: The Contradiction**
Show conflicting data points that reveal a strategic tension.
Example: "Swiggy: Their Instamart quick-commerce unit grew 70% but still loses INR 8 on every order. Scale is exploding while unit economics stay broken."

**Format 2: The Hidden Lever**
Highlight a small metric that drives outsized results.
Example: "Razorpay: Their no-code payment links feature generates 35% of total transaction volume. A side feature has become their primary growth engine."

**Format 3: The Expensive Bet**
Show a massive investment with unclear near-term returns.
Example: "Ola Electric: Spending INR 7,000 Cr on cell manufacturing before hitting profitability. They're building the supply chain for a market that doesn't exist yet."

**Format 4: The Strategic Sacrifice**
Show what they're giving up to win something else.
Example: "Meesho: Zero platform fees means they make nothing on INR 60,000 Cr in GMV. They've traded all transaction revenue for market share in tier-2 India."

**Format 5: The Pivot Signal**
Show how one metric reveals a strategic shift.
Example: "Nykaa: Their owned-brand products now contribute 42% of beauty revenue, up from 28% last year. They've quietly shifted from marketplace to competing with their own sellers."

**Format 6: The Validation/Invalidation**
Show data that proves or disproves a common assumption.
Example: "Licious: Their gross margins hit 45% in meat delivery, double the industry standard. Turns out D2C fresh food can actually work at scale in India."

**ORIGINALITY REQUIREMENT:**
- These are templates for STRUCTURE, not content
- Your insight must be original to the article data
- Never copy or slightly rephrase these examples
- Vary which format you use (don't always use Format 1)

━━━━━━━━━━━━━━━━━━━━━━
VALIDATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━

Before outputting, verify:
□ Company name comes first (with context if needed)
□ All numbers exactly as in article
□ Shows a tension, trade-off, or revealing insight
□ No banned words/phrases
□ ${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.tweetTextCharLimit} chars
□ Factual tone (not preachy/advice-giving)
□ Original insight (not copied from examples)

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━

${
  isImageFormat
    ? `{
  "reasoning": {
    "selectedArticle": <number>,
    "company": "<Company Name>",
    "companyContext": "<descriptor if needed>",
    "keyData": "<exact data from article>",
    "insight": "<the so-what>",
    "formatUsed": "<Format 1-6>"
  },
  "tweetText": "<Hook for image, max ${GENERATION_CONFIG.personas.satirist.imageFormatTweetTextLimit} chars>",
  "imageContent": "<Full insight with data, max ${GENERATION_CONFIG.personas.satirist.imageContentCharLimit} chars, use \\n for line breaks>",
  "selectedHeadlineNumber": <same as selectedArticle>
}`
    : `{
  "reasoning": {
    "selectedArticle": <number>,
    "company": "<Company Name>",
    "companyContext": "<descriptor if needed>",
    "keyData": "<exact data from article>",
    "insight": "<the so-what>",
    "formatUsed": "<Format 1-6>"
  },
  "tweetText": "<Complete tweet, ${GENERATION_CONFIG.personas.satirist.idealCharRange.min}-${GENERATION_CONFIG.personas.satirist.tweetTextCharLimit} chars>",
  "selectedHeadlineNumber": <same as selectedArticle>
}`
}

Return ONLY valid JSON.
-[${timeMarker}-${tokenMarker}]
`;

    return this.addCommonSuffix(prompt);
  }
}