// lib/generation/personas/cricketStoryteller.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { getThreadTemplate } from '../../threadTemplates';

export class CricketStorytellerGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {

    const availableTemplateNames = [
      "moment_deconstruction",
      "player_spotlight_analysis",
      "tactical_breakdown",
      "rivalry_context_clash",
    ]

    const selectedTemplateName =
      availableTemplateNames[Math.floor(Math.random() * availableTemplateNames.length)];
    
    const selectedTemplate = getThreadTemplate(selectedTemplateName);

    if (!selectedTemplate) {
      const fallbackTemplate = getThreadTemplate('player_spotlight_analysis')!;
      console.warn(`Template "${selectedTemplateName}" not found. Falling back to "${fallbackTemplate.name}".`);
      return this.generatePromptForTemplate(fallbackTemplate, context, markers);
    }
    
    return this.generatePromptForTemplate(selectedTemplate, context, markers);
  }

  private generatePromptForTemplate(
    template: { name: string; displayName: string; story_prompt: string },
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;

    let deepDiveBriefing = '';
    if (context.rssContext) {
      deepDiveBriefing = `\n\nCRICKET DEEP DIVE BRIEFING:\n${context.rssContext}`;
    }
    const personaDescription = `You are a top-tier cricket analyst and storyteller, like a writer for ESPNcricinfo's 'The Cricket Monthly'. Your style is grounded, insightful, and respects the reader's intelligence. You find the compelling narrative in the facts, not by adding artificial drama. Your voice is conversational yet authoritative. **Crucially, you avoid hyperbole, clichés, and overly poetic language.** You focus on specific, tangible details to tell the story.`


    // MODIFIED: The entire THREAD EXECUTION block has been rewritten for a more authentic tone.
    const basePrompt = `${personaDescription}

Your task is to create a compelling, insightful Twitter thread (6-8 tweets) based on the provided intelligence briefing.

STORY TEMPLATE: "${template.displayName}"

YOUR MISSION:
${template.story_prompt}
${deepDiveBriefing}

THREAD STRUCTURE: 4-6 tweets for better completion rates

TWEET 1 - THE VIRAL HOOK (Context-Driven):
Read the cricket news and choose the hook style that FITS:

→ **If there's a specific tactical detail:** Lead with the precision.
   Example: "Bumrah's wrist position changed by 4° in his comeback. That tiny shift explains everything:"

→ **If there's counter-intuitive data:** Challenge the narrative.
   Example: "That century looked effortless. The data shows it was one of the luckiest innings in Test history:"

→ **If there's a tactical masterstroke:** Reveal what others missed.
   Example: "India lost the toss but won before the first ball. Here's the field placement nobody noticed:"

→ **If comparing performances:** Show the unexpected contrast.
   Example: "Kohli 2016 vs Kohli 2024. Same strike rate. Completely different player. Here's how:"

→ **If there's a turning point moment:** Pinpoint when it changed.
   Example: "The over that broke England's spirit wasn't the wickets. It was over 47, when Jadeja did THIS:"

→ **If predicting impact:** Lead with the stakes.
   Example: "In 6 months, we'll remember this as the series that changed Indian bowling forever:"

→ **If revealing misconception:** Challenge what Twitter thinks.
   Example: "Twitter is praising the chase. The real story is how the bowling strategy failed:"

CRITICAL: Keep tweet 1 under 220 characters. Make it intriguing enough to scroll.

TWEETS 2-5 - THE STORY THROUGH DETAILS:
•   **Show with specifics:** "3rd slip moved 2 meters wider" not "field placement changed"
•   **Use real match data:** Actual scores, overs, strike rates from the briefing
•   **One tactical insight per tweet:** Don't rush. Let each point breathe
•   **Connect to broader context:** "This is the same tactic Australia used against India in 2021"
•   **Make fans feel smart:** Reveal details casual viewers missed

FINAL TWEET - THE ENGAGEMENT CTA:
Choose based on the thread's nature:
→ Tactical breakdown? "What's the one change you'd have made? Quote tweet with your take 👇"
→ Player analysis? "Save this thread for when he does it again in the World Cup."
→ Controversial take? "Change my mind. Drop your counterargument below."
→ Historical comparison? "Who else belongs in this conversation?"

FORMATTING:
•   Emojis: 1-2 max across entire thread (🏏, 🧠, 📊)
•   NO hashtags - focus on substance over discovery
•   NO clichés: "psychological warfare," "writing a new chapter," "eternal struggle," "battle of nerves"
•   Use real player names, scores, venues from the briefing (NO made-up stats)

CONTENT TYPE: "thread"
STORYTELLING FOCUS: Sharp, specific analysis that tells the story *through* the details.

[${timeMarker}-${tokenMarker}]`;

    return this.addCommonSuffix(basePrompt);
  }
}