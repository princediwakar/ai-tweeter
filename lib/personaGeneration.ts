// lib/personaGeneration.ts
import { personaDesigner, PersonaDesignResult } from './services/personaDesigner';
import { personaService, CreatePersonaInput } from './personaService';

export interface GenerationRequest {
  prompt: string;
  connectedAccountId: string;
  platform: 'twitter' | 'linkedin';
  regenerationCount?: number;
}

export interface PersonaGenerationResult {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
  config: CreatePersonaInput['config'];
}

const RSS_FEED_DATABASE: Record<string, string[]> = {
  'ai-ml': [
    'https://research.google/blog/rss/',
    'https://openai.com/news/rss.xml',
    'https://bair.berkeley.edu/blog/feed.xml',
    'https://blog.ml.cmu.edu/feed/',
    'https://towardsdatascience.com/feed/',
    'https://www.kdnuggets.com/feed',
    'https://aws.amazon.com/blogs/machine-learning/feed/',
    'https://thegradient.pub/rss/',
    'https://news.mit.edu/rss/topic/artificial-intelligence2',
    'https://lilianweng.github.io/lil-log/feed.xml',
  ],
  'saas': [
    'https://www.saastr.com/feed/',
    'https://tomtunguz.com/index.xml',
    'https://techcrunch.com/tag/saas/feed/',
    'https://chartmogul.com/blog/feed/',
    'https://sparktoro.com/blog/feed/',
    'https://www.crazyegg.com/blog/feed/',
    'https://agile-operator.com/feed/',
    'https://saasmetrics.co/feed/',
  ],
  'startups': [
    'https://steveblank.com/feed/',
    'https://techcrunch.com/startups/feed/',
    'https://bothsidesofthetable.com/feed',
    'https://thestartupmag.com/feed/',
    'https://magazine.startus.cc/feed/',
    'https://eu-startups.com/feed/',
    'https://startupnation.com/feed/',
    'https://andrewchen.co/feed/',
    'https://firstround.com/review/feed.xml',
  ],
  'product': [
    'https://www.producthunt.com/feed',
    'https://www.producttalk.org/feed/',
    'https://www.romanpichler.com/feed/',
    'https://www.productcoalition.com/feed',
    'https://amplitude.com/feed',
    'https://elezea.com/feed/',
    'https://productside.com/blog/feed/',
    'https://mindtheproduct.com/feed/',
  ],
  'tech': [
    'https://techcrunch.com/feed/',
    'https://www.theverge.com/rss/index.xml',
    'https://arstechnica.com/feed/rss/',
    'https://venturebeat.com/feed/',
    'https://www.engadget.com/rss-full.xml',
    'https://feeds.feedburner.com/fastcompany/headlines',
    'https://www.slashgear.com/feed',
  ],
  'finance': [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.wsj.com/rss/news/tech',
    'https://www.ft.com/rss/home',
    'https://www.nasdaq.com/feed/nasdaq-original/rss.xml',
  ],
  'crypto': [
    'https://www.coindesk.com/arc/outboundfeeds/rss',
    'https://cointelegraph.com/rss',
    'https://decrypt.co/feed',
    'https://messari.io/rss',
    'https://thedefiant.io/api/feed',
    'https://insights.glassnode.com/rss',
  ],
  'vc': [
    'https://bothsidesofthetable.com/feed',
    'https://avc.com/feed/',
    'https://tomtunguz.com/index.xml',
    'https://hunterwalk.com/feed/',
    'https://www.thisisgoingtobebig.com/blog?format=rss',
  ],
  'marketing': [
    'https://blog.hubspot.com/marketing/rss.xml',
    'https://www.socialmediaexaminer.com/feed/',
    'https://ahrefs.com/blog/feed/',
    'https://seths.blog/feed/atom/',
    'http://feeds.feedburner.com/seomoz',
    'http://feeds.feedburner.com/cmi-content-marketing',
    'http://www.socialmediaexaminer.com/feed/',
    'http://backlinko.com/feed',
  ],
  'design': [
    'https://www.smashingmagazine.com/feed/',
    'https://uxplanet.org/feed',
    'https://www.nngroup.com/feed/rss/',
    'https://uxdesign.cc/feed',
    'https://airbnb.design/feed/',
    'https://feeds.feedburner.com/CssTricks',
    'https://slack.design/feed/',
  ],
  'leadership': [
    'https://lenny.substack.com/feed',
    'https://bothsidesofthetable.com/feed',
    'https://www.leadershipnow.com/leadingblog/atom.xml',
    'https://characterandleadership.com/feed/',
    'https://eblingroup.com/feed/',
    'https://leadingwithtrust.com/feed/',
    'https://www.thoughtleadersllc.com/feed/',
  ],
  'productivity': [
    'https://nesslabs.com/feed',
    'https://www.lifehack.org/feed',
    'http://www.asianefficiency.com/feed/',
    'https://stevepavlina.com/feed/',
    'https://productivityshift.com/feed/',
    'https://www.atlassian.com/blog/productivity/feed',
    'https://blog.rescuetime.com/category/workplace-productivity/feed/',
    'https://fs.blog/feed/',
  ],
};

const FALLBACK_TWITTER_PERSONA: PersonaGenerationResult = {
  name: 'The Signal',
  description: 'Distilling complex tech news into one actionable insight per day.',
  tone: 'Sharp, analytical',
  topics: ['tech', 'startups', 'ai-ml'],
  rss_sources: ['https://techcrunch.com/feed/', 'https://www.theverge.com/rss/index.xml'],
  min_length: 100,
  max_length: 280,
  config: {
    identity_context: 'You are a sharp tech analyst who cuts through the noise.',
    source_logic: 'Focus on ONE key story. Reject listicles and generic AI news.',
    voice_dna: 'Lead with the Aha! moment. Keep it under 200 characters.',
    anti_patterns: 'No hashtags, no emojis, no thread hooks.',
    structural_archetypes: [
      { name: 'The Contradiction', description: 'Find the tension between two facts', example: 'AI funding is up 40% but valuations are down. Here is why.' },
      { name: 'The Hidden Lever', description: 'Reveal an overlooked factor', example: 'Everyone talks about compute. The real bottleneck is data infrastructure.' },
    ],
    validation_checklist: ['Is it under 280 chars?', 'Does it have one clear insight?', 'Is it original?'],
    headlines_to_fetch: 10,
    headlines_in_prompt: 3,
    image_probability: 0,
  },
};

const FALLBACK_LINKEDIN_PERSONA: PersonaGenerationResult = {
  name: 'The Builder',
  description: 'Sharing lessons from building products and scaling teams.',
  tone: 'Authoritative, practical',
  topics: ['product', 'leadership', 'startups'],
  rss_sources: ['https://producthabits.substack.com/feed', 'https://lenny.substack.com/feed'],
  min_length: 800,
  max_length: 2500,
  config: {
    identity_context: 'You are a founder and product leader who shares battle-tested insights.',
    source_logic: 'Focus on practical lessons from real products. Reject generic career advice.',
    voice_dna: 'Start with a specific story or number. End with actionable takeaways.',
    anti_patterns: 'No "I hope this helps", no listicles, no motivational quotes.',
    structural_archetypes: [
      { name: 'The Case Study', description: 'Deep dive into a specific product decision', example: 'How we increased retention by 40% by changing one notification timing.' },
      { name: 'The Mistake', description: 'Share what you learned from failure', example: 'We spent 6 months on a feature nobody wanted. Here is how we fixed it.' },
    ],
    validation_checklist: ['Is it 800-2500 chars?', 'Does it have a specific example?', 'Is it actionable?'],
    headlines_to_fetch: 10,
    headlines_in_prompt: 3,
    image_probability: 0.2,
  },
};

export function extractKeywordsFromPrompt(prompt: string): string[] {
  const keywordMappings: Record<string, string[]> = {
    'ai': ['ai-ml'], 'ml': ['ai-ml'], 'machine learning': ['ai-ml'], 'artificial intelligence': ['ai-ml'],
    'saas': ['saas'], 'software': ['saas', 'tech'],
    'startup': ['startups', 'vc'], 'founder': ['startups', 'vc'], 'building': ['startups'],
    'product': ['product'], 'pm': ['product'],
    'tech': ['tech'], 'technology': ['tech'],
    'finance': ['finance'], 'investing': ['finance'], 'money': ['finance'],
    'crypto': ['crypto'], 'web3': ['crypto'], 'blockchain': ['crypto'],
    'vc': ['vc'], 'venture': ['vc'], 'funding': ['vc'], 'investor': ['vc'],
    'marketing': ['marketing'], 'growth': ['marketing'],
    'design': ['design'], 'ux': ['design'], 'ui': ['design'],
    'leadership': ['leadership'], 'management': ['leadership'], 'team': ['leadership'],
    'productivity': ['productivity'], 'efficiency': ['productivity'],
  };
  
  const lowerPrompt = prompt.toLowerCase();
  const foundTopics = new Set<string>();
  
  for (const [keyword, topics] of Object.entries(keywordMappings)) {
    if (lowerPrompt.includes(keyword)) {
      topics.forEach(t => foundTopics.add(t));
    }
  }
  
  return Array.from(foundTopics);
}

export function mapKeywordsToRssFeeds(keywords: string[]): string[] {
  const feeds = new Set<string>();
  
  for (const keyword of keywords) {
    const keywordFeeds = RSS_FEED_DATABASE[keyword];
    if (keywordFeeds) {
      keywordFeeds.forEach(f => feeds.add(f));
    }
  }
  
  // Always add TechCrunch as fallback
  if (feeds.size === 0) {
    feeds.add('https://techcrunch.com/feed/');
  }
  
  return Array.from(feeds).slice(0, 5);
}

export function getFallbackPersona(platform: 'twitter' | 'linkedin'): PersonaGenerationResult {
  return platform === 'twitter' ? FALLBACK_TWITTER_PERSONA : FALLBACK_LINKEDIN_PERSONA;
}

export async function generatePersona(request: GenerationRequest): Promise<PersonaGenerationResult> {
  const { prompt, platform, regenerationCount = 0 } = request;
  
  if (!prompt || prompt.trim().length === 0) {
    return getFallbackPersona(platform);
  }
  
  if (regenerationCount >= 3) {
    throw new Error('Maximum regeneration limit (3) reached');
  }
  
  try {
    const designResult: PersonaDesignResult = await personaDesigner.design(prompt, platform);
    
    const keywords = extractKeywordsFromPrompt(prompt);
    const rssFeeds = mapKeywordsToRssFeeds(keywords);
    
    return {
      name: designResult.name,
      description: designResult.description,
      tone: designResult.tone,
      topics: designResult.topics,
      rss_sources: rssFeeds,
      min_length: designResult.min_length,
      max_length: designResult.max_length,
      config: designResult.config,
    };
  } catch (error) {
    console.error('Persona generation failed:', error);
    return getFallbackPersona(platform);
  }
}

export async function saveGeneratedPersona(
  accountId: string,
  personaResult: PersonaGenerationResult
): Promise<void> {
  await personaService.createPersona({
    connected_account_id: accountId,
    name: personaResult.name,
    description: personaResult.description,
    tone: personaResult.tone,
    topics: personaResult.topics,
    rss_sources: personaResult.rss_sources,
    min_length: personaResult.min_length,
    max_length: personaResult.max_length,
    config: personaResult.config as CreatePersonaInput['config'],
    is_active: true,
  });
}
