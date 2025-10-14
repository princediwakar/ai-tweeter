// lib/generation/personas/businessStoryteller.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { getThreadTemplate } from '../../threadTemplates';

export class BusinessStorytellerGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {

    const availableTemplateNames = [
      "deep_dive_analysis",
      "competitor_showdown",
      "hidden_truth_reveal",
      "market_shift_analysis",
      "news_driven_founder_journey"
    ]

    const selectedTemplateName =
      availableTemplateNames[Math.floor(Math.random() * availableTemplateNames.length)];

    const selectedTemplate = getThreadTemplate(selectedTemplateName);

    if (!selectedTemplate) {
      const fallbackTemplate = getThreadTemplate('deep_dive_analysis')!;
      console.warn(`Template "${selectedTemplateName}" not found. Falling back to "${fallbackTemplate.name}".`);
      return this.generatePromptForTemplate(fallbackTemplate, config, context, markers);
    }
    
    return this.generatePromptForTemplate(selectedTemplate, config, context, markers);
  }


private generatePromptForTemplate(
  template: { name: string; displayName: string; story_prompt: string },
  config: TweetGenerationConfig,
  context: GenerationContext,
  markers: { timeMarker: string; tokenMarker: string }
): string {
  const { timeMarker, tokenMarker } = markers;
  
  let deepDiveBriefing = '';
  if (context.rssContext) {
    deepDiveBriefing = `\n\nDEEP DIVE BRIEFING:\n${context.rssContext}`;
  }

  const personaDescription = `You are a business storyteller who tells insightful stories through data, evidence and ultimate humour. You choose language that is fun, interesting and valuable. `

  // MODIFIED: The THREAD EXECUTION block is rewritten for sharp, evidence-based analysis.
  const basePrompt = `${personaDescription}

Your task is to create a compelling, insightful Twitter thread (6-8 tweets) based on the provided intelligence briefing.

STORY TEMPLATE: "${template.displayName}"

YOUR MISSION:
${template.story_prompt}
${deepDiveBriefing}

THREAD STRUCTURE: 4-6 tweets for better completion rates

TWEET 1 - THE VIRAL HOOK (Context-Driven):
Read the news and choose the hook style that FITS:

→ **If there's a striking number/financial data:** Lead with it.
   Example: "₹47,000 Cr vanished in 18 months. Here's the real reason:"

→ **If it's a strategic move that seems contradictory:** Highlight the contradiction.
   Example: "PhonePe is celebrating UPI dominance while quietly building the opposite:"

→ **If there's a hidden winner/loser:** Name them upfront.
   Example: "While founders fought over quick commerce, one silent player won:"

→ **If you can make a bold prediction:** Lead with the stakes.
   Example: "Zomato's restaurant-tech play will be worth more than food delivery by 2026:"

→ **If there's a specific moment/turning point:** Pinpoint it.
   Example: "The exact moment Byju's strategy broke. March 2022. Here's what happened:"

→ **If conventional wisdom is wrong:** Challenge it directly.
   Example: "Everyone thinks X is winning. The data shows they're already behind:"

→ **If it raises a counterintuitive question:** Lead with the question.
   Example: "Why is Tata betting ₹90,000 Cr on losing money for 5 years?"

CRITICAL: Keep tweet 1 under 220 characters. Make people NEED to read tweet 2.

TWEETS 2-5 - THE NARRATIVE BUILD:
•   **Use Real Evidence:** Cite specific numbers, quotes, or moves from the briefing
•   **One idea per tweet:** Don't cram. Build tension across tweets
•   **Show second-order effects:** "This means X will have to Y" not "This is interesting"
•   **Connect competitors:** "While A does X, B is quietly doing Y"
•   **Conversational but sharp:** Like explaining to a smart friend, not writing a report

FINAL TWEET - THE ENGAGEMENT CTA:
Choose based on the thread's nature:
→ Bold prediction thread? "Save this. We'll revisit in 6 months."
→ Strategic analysis? "What's your contrarian take? Quote tweet this 👇"
→ Winner/loser reveal? "Who else saw this coming? Drop your prediction below."

FORMATTING:
•   Use emojis sparingly (2-3 across entire thread, not every tweet)
•   Do not tag any user or company
•   NO hashtags - focus on substance over discovery
•   NO business jargon: "synergy," "disruption," "game-changer," "paradigm shift"
•   Name real companies/people from the briefing (NO made-up names)

CONTENT TYPE: "thread"
STORYTELLING FOCUS: Clear, logical analysis that explains the 'why' and 'what's next' behind the news.

[${timeMarker}-${tokenMarker}]`;

  return this.addCommonSuffix(basePrompt);
}
}