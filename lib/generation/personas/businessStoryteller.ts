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
      : 'founder_struggle';

    // Get appropriate hashtags from persona config with tech story preference
    const hashtagSets = persona.hashtag_sets || [['#IndianBusiness', '#Entrepreneurship', '#Leadership']];
    const topicContext = this.getTopicContext(topic);
    
    // Use tech-specific hashtags for tech topics
    let selectedHashtags = hashtagSets[Math.floor(Math.random() * hashtagSets.length)];
    if (topicContext && topic.key.includes('tech')) {
      const techHashtagSets = hashtagSets.filter(set => 
        set.some(tag => ['#TechStories', '#IndianTech', '#Unicorns', '#GlobalTech', '#SaaS'].includes(tag))
      );
      if (techHashtagSets.length > 0) {
        selectedHashtags = techHashtagSets[Math.floor(Math.random() * techHashtagSets.length)];
      }
    }
    
    let rssSourceContext = '';
    if (context.rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT BUSINESS DEVELOPMENTS (from RSS sources):\n${context.rssContext}`;
    }

    // Template-specific guidance
    const templateInstructions = this.getTemplateInstructions(selectedTemplate);

    let basePrompt = `${persona.description}

STORY TEMPLATE: "${selectedTemplate}" 
TOPIC FOCUS: "${topic.displayName}"
${templateInstructions}
${topicContext ? `\nTOPIC CONTEXT: ${topicContext}` : ''}

PERSONA-DRIVEN APPROACH:
• Create compelling narrative threads (6-7 tweets) combining business + tech insights
• Follow the "${selectedTemplate}" template structure and emotional arc
• Focus on authentic stories with human elements and strategic insights
• Include specific details, emotions, and universal lessons
• Sound like an expert storyteller with deep cultural and tech knowledge
• CRITICAL: Use only real, verified company names or keep companies generic (avoid fake Twitter handles)
• When mentioning people/companies, use actual names or generic descriptions - NO made-up @handles
• Connect business/tech lessons with universal human themes
• For tech stories: blend technical innovation with business strategy and human impact

AVAILABLE TOPICS (choose relevant angle):
${persona.topics?.map(t => `• ${t.displayName}`).join('\n') || '• Business strategy and leadership'}

SUGGESTED HASHTAGS: ${selectedHashtags.join(' ')}
${context.useRSSSources ? '• May reference current business/tech developments' : ''}${rssSourceContext}

CONTENT TYPE: "thread"
STORYTELLING FOCUS: ${persona.description}

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }

  private getTemplateInstructions(template: string): string {
    const instructions: Record<string, string> = {
      'founder_struggle': 'Tell the story of an entrepreneur overcoming significant personal/business challenges',
      'business_decision': 'Focus on a critical strategic decision and its consequences', 
      'family_business_dynamics': 'Explore traditional vs modern approaches in family businesses',
      'crisis_leadership': 'Showcase how leaders navigate business crises and uncertainty',
      'market_disruption': 'Chronicle how innovation disrupted established markets',
      'succession_story': 'Detail the handover of leadership in established businesses',
      'innovation_breakthrough': 'Follow the journey from idea to market-changing innovation',
      'cultural_adaptation': 'Show how businesses adapted to cultural or market changes'
    };

    return instructions[template] || 'Tell an engaging business story with strategic insights';
  }

  private getTopicContext(topic: { key: string; displayName: string }): string {
    const techTopicContexts: Record<string, string> = {
      'indian_tech_unicorns': 'Focus on Indian unicorns like Flipkart, Paytm, Byju\'s, Ola, Zomato and their scaling journeys',
      'indian_tech_pioneers': 'Cover early internet pioneers like Infosys, TCS, Wipro and their digital transformation',
      'fintech_revolution_india': 'Explore FinTech innovations like UPI, digital wallets, and financial inclusion stories',
      'edtech_transformation': 'Highlight EdTech evolution from coaching classes to online platforms like Unacademy, Vedantu',
      'ecommerce_battles_india': 'Chronicle e-commerce wars between Flipkart, Amazon India, and local players',
      'digital_payments_upi': 'Tell UPI revolution story and digital payment adoption in India',
      'saas_india_global': 'Focus on Indian SaaS companies going global like Zoho, Freshworks, Chargebee',
      'gaming_content_creators': 'Explore gaming industry growth and content creator economy in India',
      'deep_tech_ai_india': 'Cover deep tech startups and AI innovation coming from Indian companies',
      'space_tech_startups': 'Highlight space technology and NewSpace startup ecosystem in India',
      'silicon_valley_legends': 'Tell origin stories of iconic Silicon Valley companies and founders',
      'big_tech_evolution': 'Chronicle the evolution of tech giants like Google, Apple, Microsoft, Facebook',
      'startup_ecosystem_global': 'Explore global startup ecosystem trends and success patterns',
      'tech_disruption_industries': 'Show how technology disrupted traditional industries worldwide',
      'crypto_blockchain_stories': 'Cover cryptocurrency and blockchain revolution stories',
      'ai_ml_breakthrough': 'Highlight breakthrough moments in AI and machine learning',
      'social_media_impact': 'Tell stories of social media platforms and their societal impact',
      'mobile_revolution': 'Chronicle mobile and app revolution changing consumer behavior',
      'cloud_computing_shift': 'Show cloud computing transformation of business infrastructure',
      'cybersecurity_battles': 'Explore cybersecurity challenges and digital warfare stories'
    };

    return techTopicContexts[topic.key] || '';
  }
}