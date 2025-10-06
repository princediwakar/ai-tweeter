// lib/generation/personas/cricketStoryteller.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { PersonaConfig } from '../../personas';

export class CricketStorytellerGenerator extends BasePersonaGenerator {
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
      : 'epic_comeback'; // Fallback if thread_templates is empty

    const topicContext = this.getTopicContext(topic);
    const topicHashtags = this.getTopicHashtags(topic);
    
    let rssSourceContext = '';
    if (context.rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT CRICKET DEVELOPMENTS (from RSS sources):\n${context.rssContext}`;
    }

    // Template-specific guidance
    const templateInstructions = this.getTemplateInstructions(selectedTemplate);

    let basePrompt = `${persona.description || 'Cricket Storyteller: Weaving tales of triumph, heartbreak, and human spirit through the lens of cricket.'}

STORY TEMPLATE: "${selectedTemplate}" 
TOPIC FOCUS: "${topic.displayName}"
${templateInstructions}
${topicContext ? `\nTOPIC CONTEXT: ${topicContext}` : ''}

THREAD APPROACH (8-11 tweets):
• Create narrative threads that blend iconic cricket moments with human psychology and life lessons
• Follow the "${selectedTemplate}" template structure with a clear emotional arc
• Focus on personalities, character revelations, pressure handling, and resilience
• Include entertainment value, larger-than-life figures, and transcendent stories
• Connect cricket scenarios to universal themes like rivalry, friendship, leadership, and growth
• Use cliffhangers between tweets to keep readers hooked (e.g., "But then, disaster struck...")
• Incorporate emojis for vividness and questions to spark replies (e.g., "Ever felt that pressure?")
• Sound like a passionate cricket aficionado with deep insights into the game and human nature
• Include specific match details, scores, player stats, and dramatic outcomes
• Draw relatable life lessons and philosophical insights anyone can apply
• ENGAGEMENT BOOST: End the thread with a CTA like "Follow for more cricket tales! What's your favorite moment? Reply below!" to attract followers
• HASHTAGS: Weave in 1-2 natural hashtags per tweet from these suggestions: ${topicHashtags} (e.g., #CricketLegends 😂)
${context.useRSSSources ? '• Reference current cricket news, player stories, or tournaments for timeliness' : ''}${rssSourceContext}

AVAILABLE TOPICS (choose relevant angle):
${persona.topics?.map(t => `• ${t.displayName}`).join('\n') || '• Iconic matches and player journeys'}
CONTENT TYPE: "thread"
CRICKET STORYTELLING FOCUS: Human stories through cricket with character, drama, and universal lessons

[${timeMarker}-${tokenMarker}]`;

    basePrompt = this.addGibbiCTA(basePrompt, context.account);
    return this.addCommonSuffix(basePrompt);
  }

  private getTemplateInstructions(template: string): string {
    const instructions: Record<string, string> = {
      'epic_comeback': 'Narrate a thrilling comeback story, building suspense with early setbacks and triumphant turns.',
      'rivalry_clash': 'Dive into intense rivalries, highlighting personal battles and mind games. Use cliffhangers for key confrontations.',
      'underdog_triumph': 'Focus on underdog victories, emphasizing grit and unexpected heroes for inspirational appeal.',
      'leadership_moment': 'Showcase captaincy decisions under pressure, tying to leadership lessons with relatable analogies.',
      'heartbreak_defeat': 'Explore near-misses and defeats, drawing lessons on resilience and growth from failure.',
      'team_unity': 'Chronicle stories of team bonding and synergy, highlighting friendships that won games.',
      'personal_milestone': 'Tell individual achievement journeys, focusing on sacrifices and breakthroughs.',
      'controversy_drama': 'Unpack scandals or disputes, balancing drama with insights on ethics and redemption.',
      'fan_perspective': 'Weave in fan emotions and cultural impact, encouraging replies with "Share your fan story!"'
    };

    return instructions[template] || 'Tell an engaging cricket story with dramatic insights';
  }

  private getTopicContext(topic: { key: string; displayName: string }): string {
    const cricketTopicContexts: Record<string, string> = {
      'iconic_indian_victories': 'Focus on historic Indian wins like 1983 World Cup or 2007 T20, emphasizing team spirit.',
      'ipl_drama': 'Cover IPL rivalries, auctions, and star performances, with high-energy narratives.',
      'women_cricket_rise': 'Highlight the growth of women\'s cricket, featuring stars like Mithali Raj or Harmanpreet Kaur.',
      'test_cricket_epics': 'Chronicle long-format battles, focusing on endurance and strategic depth.',
      't20_explosions': 'Explore fast-paced T20 innovations, big hits, and game-changers.',
      'cricket_legends': 'Tell stories of icons like Sachin, Kohli, or Dhoni, with personal anecdotes.',
      'international_rivalries': 'Dive into India-Pak or Ashes clashes, building on historical tensions.',
      'youth_emergence': 'Spotlight rising stars and their breakthrough moments in domestic/international cricket.',
      'coaching_masterclass': 'Examine coaching philosophies and their impact on players\' careers.',
      'fan_culture': 'Explore global cricket fandom, memes, and cultural phenomena.',
      // New engaging topics for 2025 relevance
      'esports_cricket': 'Blend cricket with esports trends, like virtual leagues and gaming crossovers.',
      'sustainable_cricket': 'Discuss eco-friendly initiatives in cricket, tying to global sustainability.',
      'mental_health_stories': 'Address players\' mental health journeys, promoting awareness and resilience.',
      'global_leagues': 'Cover emerging leagues beyond IPL, like The Hundred or MLC, with expansion tales.'
    };

    return cricketTopicContexts[topic.key] || '';
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
      // New topics' hashtags
      'mental_health_stories': '#MentalHealthInSports #CricketWellness',
      'global_leagues': '#GlobalCricket #NewLeagues'
    };

    return topicHashtags[topic.key] || '#CricketStories #PassionForCricket';
  }
}