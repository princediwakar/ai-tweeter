// lib/generation/personas/businessStoryteller.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class BusinessStorytellerGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    persona: PersonaConfig,
    topic: { key: string; displayName: string },
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;
    
    // Use persona configuration for templates and topics
    const availableTemplates = persona.thread_templates || [];
    const selectedTemplate = availableTemplates.length > 0 
      ? availableTemplates[Math.floor(Math.random() * availableTemplates.length)]
      : 'founder_struggle'; // Fallback if thread_templates is empty

    const topicContext = this.getTopicContext(topic);
    const topicHashtags = this.getTopicHashtags(topic);
    
    let rssSourceContext = '';
    if (context.rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT BUSINESS DEVELOPMENTS (from RSS sources):\n${context.rssContext}`;
    }

    // Template-specific guidance
    const templateInstructions = this.getTemplateInstructions(selectedTemplate);

    // --- OPTIMIZATION: Removed single tweet logic. Always generate thread prompt. ---
    let basePrompt: string;
    
    basePrompt = `${persona.description}

STORY TEMPLATE: "${selectedTemplate}" 
TOPIC FOCUS: "${topic.displayName}"
${templateInstructions}
${topicContext ? `\nTOPIC CONTEXT: ${topicContext}` : ''}

THREAD APPROACH (6-9 tweets):
• Create compelling narrative threads combining business + tech insights
• Follow the "${selectedTemplate}" template structure and emotional arc
• Focus on authentic stories with human elements and strategic insights
• Include specific details, emotions, and universal lessons
• Sound like an expert storyteller with deep cultural and tech knowledge
• CRITICAL: Use only real, verified company names or keep companies generic (avoid fake Twitter handles)
• When mentioning people/companies, use actual names or generic descriptions - NO made-up @handles
• Connect business/tech lessons with universal human themes
• For tech stories: blend technical innovation with business strategy and human impact
• ENGAGEMENT BOOST: Use cliffhangers between tweets, emojis for relatability, and questions to spark replies
• End the final tweet with a CTA like "What's your similar story? Reply below!" to encourage interaction
• HASHTAGS: Incorporate 1-2 natural hashtags per tweet from these suggestions: ${topicHashtags} (e.g., #StartupIndia 😂)`;

    basePrompt += `

AVAILABLE TOPICS (choose relevant angle):
${persona.topics?.map(t => `• ${t.displayName}`).join('\n') || '• Business strategy and leadership'}
${context.useRSSSources ? '• May reference current business/tech developments' : ''}${rssSourceContext}

CONTENT TYPE: "thread"
STORYTELLING FOCUS: ${persona.description}

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }

  private getTemplateInstructions(template: string): string {
    const instructions: Record<string, string> = {
      'founder_struggle': 'Tell the story of an entrepreneur overcoming significant personal/business challenges. Build tension with setbacks, add emotional hooks, and end with inspiring lessons. Include questions like "Ever faced this?" to engage.',
      'business_decision': 'Focus on a critical strategic decision and its consequences. Use cliffhangers like "But then disaster struck..." to keep readers scrolling.', 
      'family_business_dynamics': 'Explore traditional vs modern approaches in family businesses. Highlight relatable family conflicts and resolutions for emotional pull.',
      'crisis_leadership': 'Showcase how leaders navigate business crises and uncertainty. Add urgency with real-time decisions and ask "What would you do?" in mid-thread.',
      'market_disruption': 'Chronicle how innovation disrupted established markets. Emphasize underdog stories and viral moments for shareability.',
      'succession_story': 'Detail the handover of leadership in established businesses. Focus on generational tensions and triumphs to resonate with family business owners.',
      'innovation_breakthrough': 'Follow the journey from idea to market-changing innovation. Use emojis for milestones and end with a poll-like question.',
      'cultural_adaptation': 'Show how businesses adapted to cultural or market changes. Tie to current trends for timeliness and engagement.'
    };

    return instructions[template] || 'Tell an engaging business story with strategic insights';
  }

  private getTopicContext(topic: { key: string; displayName: string }): string {
    const techTopicContexts: Record<string, string> = {
      'indian_tech_unicorns': 'Focus on Indian unicorns like Flipkart, Paytm, Byju\'s, Ola, Zomato and their scaling journeys, emphasizing founder struggles and market wins.',
      'indian_tech_pioneers': 'Cover early internet pioneers like Infosys, TCS, Wipro and their digital transformation, highlighting leadership lessons.',
      'fintech_revolution_india': 'Explore FinTech innovations like UPI, digital wallets, and financial inclusion stories, with human impact angles.',
      'edtech_transformation': 'Highlight EdTech evolution from coaching classes to online platforms like Unacademy, Vedantu, focusing on accessibility breakthroughs.',
      'ecommerce_battles_india': 'Chronicle e-commerce wars between Flipkart, Amazon India, and local players, with strategic decision twists.',
      'saas_india_global': 'Focus on Indian SaaS companies going global like Zoho, Freshworks, Chargebee, emphasizing cross-cultural adaptations.',
      'gaming_content_creators': 'Explore gaming industry growth and content creator economy in India, tying to influencer success stories.',
      'deep_tech_ai_india': 'Cover deep tech startups and AI innovation coming from Indian companies, with ethical dilemmas for depth.',
      'space_tech_startups': 'Highlight space technology and NewSpace startup ecosystem in India, focusing on bold risks and innovations.',
      'silicon_valley_legends': 'Tell origin stories of iconic Silicon Valley companies and founders, drawing parallels to Indian contexts.',
      'big_tech_evolution': 'Chronicle the evolution of tech giants like Google, Apple, Microsoft, Facebook, with disruption narratives.',
      'startup_ecosystem_global': 'Explore global startup ecosystem trends and success patterns, including funding hacks and pivots.',
      'tech_disruption_industries': 'Show how technology disrupted traditional industries worldwide, with relatable before-after stories.',
      'crypto_blockchain_stories': 'Cover cryptocurrency and blockchain revolution stories, highlighting boom-bust cycles for drama.',
      'ai_ml_breakthrough': 'Highlight breakthrough moments in AI and machine learning, asking readers about future impacts.',
      'social_media_impact': 'Tell stories of social media platforms and their societal impact, focusing on viral growth tactics.',
      'mobile_revolution': 'Chronicle mobile and app revolution changing consumer behavior, with app economy underdog tales.',
      'cloud_computing_shift': 'Show cloud computing transformation of business infrastructure, emphasizing scalability wins.',
      'cybersecurity_battles': 'Explore cybersecurity challenges and digital warfare stories, building suspense with hack incidents.',
      // New engaging topics added for 2025 relevance
      'ai_ethics_dilemmas': 'Dive into AI ethics challenges faced by companies, with real-world controversies and moral decisions.',
      'sustainable_business': 'Explore sustainable business models in tech, like green fintech or eco-friendly startups.',
      'remote_work_revolution': 'Chronicle the shift to remote work, highlighting productivity hacks and cultural changes.',
      'influencer_economy': 'Tell stories of the creator economy boom, focusing on influencer-brand collaborations and monetization strategies.'
    };

    return techTopicContexts[topic.key] || '';
  }

  private getTopicHashtags(topic: { key: string; displayName: string }): string {
    const topicHashtags: Record<string, string> = {
      'indian_tech_unicorns': '#StartupIndia #UnicornStories',
      'indian_tech_pioneers': '#TechPioneers #IndianTech',
      'fintech_revolution_india': '#FinTechIndia #DigitalPayments',
      'edtech_transformation': '#EdTech #OnlineLearning',
      'ecommerce_battles_india': '#EcommerceIndia #RetailWars',
      'saas_india_global': '#SaaS #GlobalIndian',
      'gaming_content_creators': '#GamingIndia #CreatorEconomy',
      'deep_tech_ai_india': '#DeepTech #AIIndia',
      'space_tech_startups': '#SpaceTech #NewSpace',
      'silicon_valley_legends': '#SiliconValley #FounderStories',
      'big_tech_evolution': '#BigTech #TechEvolution',
      'startup_ecosystem_global': '#StartupLife #Entrepreneur',
      'tech_disruption_industries': '#TechDisruption #Innovation',
      'crypto_blockchain_stories': '#Crypto #Blockchain',
      'ai_ml_breakthrough': '#AI #MachineLearning',
      'social_media_impact': '#SocialMedia #DigitalImpact',
      'mobile_revolution': '#MobileTech #AppEconomy',
      'cloud_computing_shift': '#CloudComputing #BusinessTech',
      'cybersecurity_battles': '#CyberSecurity #DigitalDefense',
      // New topics' hashtags
      'ai_ethics_dilemmas': '#AIEthics #TechEthics',
      'sustainable_business': '#SustainableBusiness #GreenTech',
      'remote_work_revolution': '#RemoteWork #FutureOfWork',
      'influencer_economy': '#InfluencerMarketing #CreatorEconomy'
    };

    return topicHashtags[topic.key] || '#BusinessStories #Entrepreneurship';
  }
}