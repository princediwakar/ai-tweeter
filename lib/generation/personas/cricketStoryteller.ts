// lib/generation/personas/cricketStoryteller.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';
import { getThreadTemplate } from '../../threadTemplates';

export class CricketStorytellerGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string {

    const availableTemplateNames =
      persona.thread_templates && persona.thread_templates.length > 0
        ? persona.thread_templates
        : ['player_spotlight_analysis'];

    const selectedTemplateName =
      availableTemplateNames[Math.floor(Math.random() * availableTemplateNames.length)];
    
    const selectedTemplate = getThreadTemplate(selectedTemplateName);

    if (!selectedTemplate) {
      const fallbackTemplate = getThreadTemplate('player_spotlight_analysis')!;
      console.warn(`Template "${selectedTemplateName}" not found. Falling back to "${fallbackTemplate.name}".`);
      return this.generatePromptForTemplate(fallbackTemplate, config, context, persona, topic, markers);
    }
    
    return this.generatePromptForTemplate(selectedTemplate, config, context, persona, topic, markers);
  }

  private generatePromptForTemplate(
    template: { name: string; displayName: string; story_prompt: string },
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;
    const topicHashtags = this.getTopicHashtags(topic);

    let deepDiveBriefing = '';
    if (context.rssContext) {
      deepDiveBriefing = `\n\nCRICKET DEEP DIVE BRIEFING:\n${context.rssContext}`;
    }
    const personaDescription = persona.prompt_persona;


    // MODIFIED: The entire THREAD EXECUTION block has been rewritten for a more authentic tone.
    let basePrompt = `${personaDescription}

Your task is to create a compelling, insightful Twitter thread (6-8 tweets) based on the provided intelligence briefing.

STORY TEMPLATE: "${template.displayName}"
PRIMARY TOPIC: "${topic.displayName}"

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
•   1-2 hashtags from: ${topicHashtags}
•   NO clichés: "psychological warfare," "writing a new chapter," "eternal struggle," "battle of nerves"
•   Use real player names, scores, venues from the briefing (NO made-up stats)

CONTENT TYPE: "thread"
STORYTELLING FOCUS: Sharp, specific analysis that tells the story *through* the details.

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }

  private getTopicHashtags(topic: { key: string; displayName: string }): string {
    const topicHashtags: Record<string, string> = {
        'iconic_indian_victories': '#TeamIndia #CricketHistory',
        'ipl_drama': '#IPL #CricketDrama',
        'women_cricket_rise': '#WomensCricket #SheInspires',
        'test_cricket_epics': '#TestCricket #RedBall',
        't20_explosions': '#T20Cricket #BigHits',
        'cricket_legends': '#CricketLegends #GOAT',
        'international_rivalries': '#IndvsPak #Ashes',
        'youth_emergence': '#NextGenCricket #RisingStars',
        'coaching_masterclass': '#CricketCoaching #Mentorship',
        'fan_culture': '#CricketFans #12thMan',
        'mental_health_stories': '#MentalHealthInSports #CricketWellness',
        'global_leagues': '#GlobalCricket #NewLeagues'
    };
    return topicHashtags[topic.key] || '#CricketStories #PassionForCricket';
  }
}