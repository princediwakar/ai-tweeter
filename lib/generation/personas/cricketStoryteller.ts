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

THREAD EXECUTION:
•   **Hook:** Start with a sharp, specific observation about the 'Primary Cricket Event'. Not a grand statement, but something that makes a true fan nod in agreement.
•   **Show, Don't Tell:** Instead of saying a player was 'under pressure,' describe the field setting, the bowler's specific delivery, or the batsman's body language. Ground your analysis in visible evidence.
•   **Connect Dots Subtly:** Link the current event to history or tactics, but do it naturally. For example, "That field placement for the new ball is straight out of the 90s Caribbean playbook."
•   **Authentic Voice:** Your passion should come from your sharp analysis and attention to detail, not from emotional or dramatic language. Write for intelligent cricket fans.
•   **Offer a Fresh Angle:** Present a detail or perspective the casual viewer might have missed. Frame it as a keen observation, not a grand revelation. (e.g., "Notice how the non-striker was backing up? That's the real story here.").
•   **Engagement:** Use cliffhangers between tweets. End the final tweet with a specific, open-ended question that invites expert opinions, not just a simple yes/no. (e.g., "What's the one tactical change you would have made in that over?").
•   **Formatting:** Use emojis sparingly (1-2 per thread) to add flavour, not as punctuation (e.g., 🏏, 🧐, 📈). Use 1-2 relevant hashtags per tweet from this list: ${topicHashtags}.
•   **CRITICAL:** Refer to real players, teams, and scores mentioned in the briefing. NO made-up names.
•   **AVOID:** Steer clear of clichés like 'psychological warfare,' 'shifting power dynamics,' 'writing a new chapter,' or 'the eternal struggle.' Be specific and original.

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