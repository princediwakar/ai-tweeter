// lib/generation/personas/businessStoryteller.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';
import { getThreadTemplate } from '../../threadTemplates';

export class BusinessStorytellerGenerator extends BasePersonaGenerator {
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
        : ['deep_dive_analysis'];

    const selectedTemplateName =
      availableTemplateNames[Math.floor(Math.random() * availableTemplateNames.length)];

    const selectedTemplate = getThreadTemplate(selectedTemplateName);

    if (!selectedTemplate) {
      const fallbackTemplate = getThreadTemplate('deep_dive_analysis')!;
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
    deepDiveBriefing = `\n\nDEEP DIVE BRIEFING:\n${context.rssContext}`;
  }

  const personaDescription = persona.prompt_persona;

  // MODIFIED: The THREAD EXECUTION block is rewritten for sharp, evidence-based analysis.
  let basePrompt = `${personaDescription}

Your task is to create a compelling, insightful Twitter thread (6-8 tweets) based on the provided intelligence briefing.

STORY TEMPLATE: "${template.displayName}"
PRIMARY TOPIC: "${topic.displayName}"

YOUR MISSION:
${template.story_prompt}
${deepDiveBriefing}

THREAD EXECUTION:
•   **Hook:** Start with a sharp, counter-intuitive, or data-backed observation from the 'Primary News Item'.
•   **Build a Case:** Don't just state conclusions. Use data, examples, and logic from the briefing to build a compelling argument step-by-step throughout the thread.
•   **Draw Logical Connections:** Illustrate how the primary news connects to broader market trends, competitor strategy, or economic indicators. Use phrases like "This is significant because..." or "The ripple effect of this is..."
•   **Authoritative Tone:** Your authority should stem from the quality of your analysis. Be clear and direct. Frame your points as logical deductions, not just strong opinions.
•   **Second-Order Thinking:** Instead of a "hidden truth," provide a second-order insight. What is the likely *consequence* or *next implication* of this news that most people are overlooking?
•   **Engagement:** End the final tweet with a specific, forward-looking question that invites strategic thinking. (e.g., "Which non-obvious competitor stands to gain the most from this shift?").
•   **Formatting:** Use emojis thoughtfully to signify concepts (e.g., 📈 for growth, 💡 for insight, 🧩 for strategy, 💰 for funding). Use 1-2 relevant hashtags per tweet from this list: ${topicHashtags}.
•   **CRITICAL:** Refer to real companies, figures, and data points mentioned in the briefing. NO made-up names or @handles.
•   **AVOID:** Steer clear of business buzzwords and clichés like 'synergy,' 'disruption,' 'game-changer,' or 'the new normal.' Be precise with your language.

CONTENT TYPE: "thread"
STORYTELLING FOCUS: Clear, logical analysis that explains the 'why' and 'what's next' behind the news.

[${timeMarker}-${tokenMarker}]`;

  basePrompt = this.addGibbiCTA(basePrompt, context.account);
  return this.addCommonSuffix(basePrompt);
}

  private getTopicHashtags(topic: { key: string; displayName: string }): string {
    const topicHashtags: Record<string, string> = {
        indian_tech_unicorns: '#StartupIndia #UnicornStories',
        indian_tech_pioneers: '#TechPioneers #IndianTech',
        fintech_revolution_india: '#FinTechIndia #DigitalPayments',
        edtech_transformation: '#EdTech #OnlineLearning',
        ecommerce_battles_india: '#EcommerceIndia #RetailWars',
        saas_india_global: '#SaaS #GlobalIndian',
        gaming_content_creators: '#GamingIndia #CreatorEconomy',
        deep_tech_ai_india: '#DeepTech #AIIndia',
        space_tech_startups: '#SpaceTech #NewSpace',
        silicon_valley_legends: '#SiliconValley #FounderStories',
        big_tech_evolution: '#BigTech #TechEvolution',
        startup_ecosystem_global: '#StartupLife #Entrepreneur',
        tech_disruption_industries: '#TechDisruption #Innovation',
        crypto_blockchain_stories: '#Crypto #Blockchain',
        ai_ml_breakthrough: '#AI #MachineLearning',
        social_media_impact: '#SocialMedia #DigitalImpact',
        mobile_revolution: '#MobileTech #AppEconomy',
        cloud_computing_shift: '#CloudComputing #BusinessTech',
        cybersecurity_battles: '#CyberSecurity #DigitalDefense',
        ai_ethics_dilemmas: '#AIEthics #TechEthics',
        sustainable_business: '#SustainableBusiness #GreenTech',
        remote_work_revolution: '#RemoteWork #FutureOfWork',
        influencer_economy: '#InfluencerMarketing #CreatorEconomy'
    };
    return topicHashtags[topic.key] || '#BusinessStories #Entrepreneurship';
  }
}