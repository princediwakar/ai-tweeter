import OpenAI from 'openai';
import { getRandomTopicForPersona, getPersonaByKey, selectPersonaByWeight, getHashtagsForPersona, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
import { EnhancedTweet, TweetGenerationConfig, VariationMarkers } from './types';
import { getAccount } from './db';
import type { Account } from './types';
import { getDynamicContext } from './contentSource';

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

/**
 * Generates unique variation markers for content diversity during generation
 */
function generateVariationMarkers(): VariationMarkers {
  const timestamp = Date.now();
  const timeMarker = `T${timestamp}`;
  const tokenMarker = `TK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  return { 
    time_marker: timeMarker, 
    token_marker: tokenMarker, 
    generation_timestamp: timestamp,
    content_hash: '' // Will be populated after content generation
  };
}

/**
 * Topic-specific guidelines for enhanced content generation
 * Inspired by the YouTube system's comprehensive topic guidelines
 */
const TOPIC_GUIDELINES = {
  // English Learning Categories - Educational Focus
  eng_vocab_word_meaning: {
    focus: 'Essential word definitions with memorable contexts and usage',
    hook: 'Test knowledge of a word that sounds simple but most people misuse',
    scenarios: ['job interviews', 'academic writing', 'professional communication'],
    engagement: 'Challenge viewers to use the word correctly'
  },
  eng_vocab_fill_blanks: {
    focus: 'Context-based vocabulary application and sentence completion',
    hook: 'Present a sentence that stumps even native speakers',
    scenarios: ['writing emails', 'giving presentations', 'casual conversations'],
    engagement: 'Test their sentence completion skills'
  },
  eng_vocab_synonyms: {
    focus: 'Word relationships and precise synonym usage',
    hook: 'Reveal synonym pairs that seem identical but have crucial differences',
    scenarios: ['avoiding repetition', 'upgrading vocabulary', 'expressing nuance'],
    engagement: 'Help them choose the perfect word'
  },
  eng_vocab_antonyms: {
    focus: 'Opposite word relationships and contrasting meanings',
    hook: 'Test antonym knowledge with words that have surprising opposites',
    scenarios: ['debates and arguments', 'creative writing', 'expressing contrast'],
    engagement: 'Challenge their opposite-word knowledge'
  },
  eng_vocab_confusing_words: {
    focus: 'Commonly mixed-up word pairs and how to use them correctly',
    hook: 'Expose the word mistake that makes you sound less intelligent',
    scenarios: ['affect vs effect', 'complement vs compliment', 'principal vs principle'],
    engagement: 'Help them avoid embarrassing mistakes'
  },
  eng_grammar_parts_of_speech: {
    focus: 'Essential grammar foundations with clear examples',
    hook: 'Reveal the grammar rule that 90% of people get wrong',
    scenarios: ['writing professionally', 'academic papers', 'clear communication'],
    engagement: 'Master the grammar that matters most'
  },
  eng_grammar_verb_tenses: {
    focus: 'Tense usage with practical applications',
    hook: 'The tense mistake that changes your entire meaning',
    scenarios: ['telling stories', 'describing experiences', 'making plans'],
    engagement: 'Perfect your tense timing'
  },
  eng_comm_pronunciation: {
    focus: 'Clear pronunciation for confident communication',
    hook: 'The pronunciation mistake that undermines your credibility',
    scenarios: ['presentations', 'job interviews', 'networking events'],
    engagement: 'Sound more professional instantly'
  },
  eng_comm_conversation_starters: {
    focus: 'Natural conversation skills for social confidence',
    hook: 'The conversation starter that never fails',
    scenarios: ['networking events', 'social gatherings', 'professional meetings'],
    engagement: 'Start conversations with confidence'
  },

  product_user_research: {
    focus: 'User research insights and practical application methods',
    hook: 'The user research mistake that kills great products',
    scenarios: ['conducting interviews', 'analyzing feedback', 'making decisions'],
    engagement: 'Understand your users better'
  },
  product_feature_decisions: {
    focus: 'Strategic feature development and prioritization',
    hook: 'Why most feature decisions fail and how to fix them',
    scenarios: ['roadmap planning', 'stakeholder alignment', 'resource allocation'],
    engagement: 'Build features that matter'
  },
  startup_validation: {
    focus: 'Idea validation techniques and market research strategies',
    hook: 'The validation step most founders skip (and regret)',
    scenarios: ['idea testing', 'customer discovery', 'pivot decisions'],
    engagement: 'Validate before you build'
  },
  startup_funding: {
    focus: 'Funding strategies and investor relations insights',
    hook: 'What investors really look for (it\'s not what you think)',
    scenarios: ['pitch preparation', 'due diligence', 'negotiation'],
    engagement: 'Get funded faster'
  },
  tech_ai_trends: {
    focus: 'AI developments and practical implications for developers',
    hook: 'The AI trend that will change everything (not ChatGPT)',
    scenarios: ['tool selection', 'skill development', 'career planning'],
    engagement: 'Stay ahead of AI disruption'
  },
  tech_web_development: {
    focus: 'Modern web development practices and emerging technologies',
    hook: 'The web development practice that separates seniors from juniors',
    scenarios: ['architecture decisions', 'performance optimization', 'best practices'],
    engagement: 'Level up your development skills'
  }
};

/**
 * Generates a content hash for duplicate detection
 */
function generateContentHash(tweet: EnhancedTweet): string {
  const contentString = JSON.stringify({
    content: tweet.content,
    hashtags: tweet.hashtags,
    persona: tweet.persona
  });
  
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `CH${Math.abs(hash).toString(36).toUpperCase()}`;
}


/**
 * Determines if RSS sources should be used based on specific account handles
 */
function shouldUseRSSSources(account: Account | null): boolean {
  if (!account) return false;
  
  // Remove @ symbol and convert to lowercase for comparison
  const handle = account.twitter_handle.replace('@', '').toLowerCase();
  
  // Specific account-based RSS usage (absolute clarity)
  switch (handle) {
    case 'gibbi_ai':
      // English learning account - no RSS sources, focus on educational content
      return false;
    
    case 'princediwakar25':
      // Personal/professional account - use RSS sources for current events and trends
      return true;
    
    default:
      // For any future accounts, default to RSS enabled for professional content
      return true;
  }
}

/**
 * Generates enhanced tweet prompts using topic guidelines and variation markers
 * Inspired by the YouTube system's sophisticated prompt generation
 */
async function generateTweetPrompt(config: TweetGenerationConfig): Promise<{ prompt: string; persona: PersonaConfig; topic: unknown }> {
  const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;
  
  // Get account context if provided
  let account: Account | null = null;
  
  if (config.account_id && config.account_id !== 'fallback') {
    account = await getAccount(config.account_id);
    if (account) {
      console.log(`🎯 Account context: ${account.name} (${account.twitter_handle})`);
    }
  }
  
  // Determine if RSS sources should be used
  const useRSSSources = shouldUseRSSSources(account);
  console.log(`📰 RSS sources ${useRSSSources ? 'enabled' : 'disabled'} for account: ${account?.name || 'unknown'}`);
  
  // Fetch RSS context if RSS sources are enabled
  let rssContext = '';
  if (useRSSSources && config.persona) {
    try {
      // Fetch RSS context for personas that use current events
      if (['product_insights', 'startup_content', 'tech_commentary', 'satirist', 'business_storyteller', 'cricket_storyteller'].includes(config.persona)) {
        const topicForRSS = config.topic || 'technology';
        rssContext = await getDynamicContext(config.persona, topicForRSS);
        console.log(`📰 Fetched RSS context for ${config.persona}: ${rssContext.length > 0 ? 'success' : 'no content'}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch RSS context, continuing without it:', error);
    }
  }
  
  // Select persona with account-aware validation based on Twitter handle
  let persona: PersonaConfig | undefined;
  
  if (config.persona) {
    // Use specifically requested persona but validate it's allowed for this account
    if (config.account_id && config.account_id !== 'fallback' && account) {
      if (!isPersonaAllowedForHandle(config.persona, account.twitter_handle)) {
        console.warn(`⚠️  Persona ${config.persona} not allowed for handle @${account.twitter_handle}, using allowed persona instead`);
        persona = getRandomPersonaForHandle(account.twitter_handle);
        console.log(`🔒 Using handle-allowed persona: ${persona.displayName}`);
      } else {
        persona = getPersonaByKey(config.persona);
        if (persona) {
          console.log(`✅ Using requested and validated persona: ${persona.displayName}`);
        }
      }
    } else {
      // No account ID provided, use requested persona (legacy support)
      persona = getPersonaByKey(config.persona);
      if (persona) {
        console.log(`✅ Using requested persona (no account validation): ${persona.displayName}`);
      }
    }
  }
  
  if (!persona) {
    // No specific persona requested or not found/allowed - use account-specific selection
    if (config.account_id && config.account_id !== 'fallback' && account) {
      try {
        persona = getRandomPersonaForHandle(account.twitter_handle);
        console.log(`🔒 Using handle-allowed random persona: ${persona.displayName} for @${account.twitter_handle}`);
      } catch (error) {
        console.error(`❌ Failed to get persona for handle @${account.twitter_handle}:`, error);
        // Fall back to legacy random selection
        persona = selectPersonaByWeight();
        console.log(`⚠️  Falling back to legacy random persona: ${persona.displayName}`);
      }
    } else {
      // No account ID provided, use legacy random selection
      persona = selectPersonaByWeight();
      console.log(`🎲 Using legacy random persona: ${persona.displayName}`);
    }
  }
    
  if (!persona) {
    throw new Error('Invalid persona specified');
  }

  // Select topic (either specified or random from persona)
  const topic = config.topic 
    ? persona.topics.find(t => t.key === config.topic)
    : getRandomTopicForPersona(persona.key);
    
  if (!topic) {
    throw new Error('No valid topic found for persona');
  }

  const contentType = config.contentType || 'challenge';
  
  let basePrompt = '';
  
  // Get topic guidelines for enhanced prompting
  const topicKey = (topic as { key: string; displayName: string }).key;
  const guidelines = TOPIC_GUIDELINES[topicKey as keyof typeof TOPIC_GUIDELINES];
  
  // Generate prompts based on persona type and account context with enhanced guidelines
  if (persona.key === 'english_vocab_builder') {
    const enhancedGuidelines = guidelines || {
      focus: 'Essential vocabulary building with practical applications',
      hook: 'Present vocabulary that elevates communication skills',
      scenarios: ['professional communication', 'academic writing', 'daily conversations'],
      engagement: 'Help learners use words confidently'
    };

    basePrompt = `You are a viral English education expert creating engaging vocabulary content for Twitter.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}

VIRAL LEARNING STRATEGY:
• HOOK: ${enhancedGuidelines.hook}
• SCENARIOS: Focus on ${enhancedGuidelines.scenarios?.join(', ')}
• ENGAGEMENT: ${enhancedGuidelines.engagement}

Generate Twitter content that targets intermediate English learners (B1-B2 level) who want to sound more fluent and professional:

CONTENT APPROACH:
• Lead with confidence-building ("Master this and sound fluent!")
• Present vocabulary that elevates communication skills
• Include practical, immediate application opportunities
• Create "aha!" moments that boost learning motivation
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound like a helpful teacher who makes learning exciting
${!useRSSSources ? '• Focus on timeless educational content - avoid current events' : ''}

CONTENT TYPE: ${contentType}
EDUCATIONAL FOCUS: Practical vocabulary mastery

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'english_grammar_master') {
    const enhancedGuidelines = guidelines || {
      focus: 'Essential grammar rules with clear, practical explanations',
      hook: 'Reveal the grammar rule that most people get wrong',
      scenarios: ['professional writing', 'academic papers', 'clear communication'],
      engagement: 'Master grammar that makes you sound professional'
    };

    basePrompt = `You are a viral English grammar expert creating engaging educational content for Twitter.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}

VIRAL LEARNING STRATEGY:
• HOOK: ${enhancedGuidelines.hook}
• SCENARIOS: Focus on ${enhancedGuidelines.scenarios?.join(', ')}
• ENGAGEMENT: ${enhancedGuidelines.engagement}

Generate grammar content that helps learners avoid common mistakes and communicate more clearly:

CONTENT APPROACH:
• Start with a common grammar confusion or mistake
• Provide clear explanation with memorable patterns or rules
• Include practical examples that learners can apply immediately
• Explain why this grammar point matters for professional communication
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound like a patient teacher who makes complex grammar simple
${!useRSSSources ? '• Focus on timeless educational content - avoid current events' : ''}

CONTENT TYPE: ${contentType}
EDUCATIONAL FOCUS: Practical grammar mastery

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'english_communication_expert') {
    const enhancedGuidelines = guidelines || {
      focus: 'Practical communication skills for confident interactions',
      hook: 'The communication technique that transforms conversations',
      scenarios: ['presentations', 'job interviews', 'networking events'],
      engagement: 'Communicate with confidence and clarity'
    };

    basePrompt = `You are a viral English communication expert creating engaging content for confident communication.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}

VIRAL LEARNING STRATEGY:
• HOOK: ${enhancedGuidelines.hook}
• SCENARIOS: Focus on ${enhancedGuidelines.scenarios?.join(', ')}
• ENGAGEMENT: ${enhancedGuidelines.engagement}

Generate communication content that builds genuine confidence and practical skills:

CONTENT APPROACH:
• Address a common communication challenge that learners face
• Break it down into simple, actionable steps
• Include relatable scenarios that make the advice memorable
• Connect to professional and personal communication benefits
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound like an encouraging coach who makes complex skills accessible
${!useRSSSources ? '• Focus on timeless educational content - avoid current events' : ''}

CONTENT TYPE: ${contentType}
EDUCATIONAL FOCUS: Practical communication mastery

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'product_insights') {
    const enhancedGuidelines = guidelines || {
      focus: 'Practical product development insights from real experience',
      hook: 'The product insight that changes everything',
      scenarios: ['feature decisions', 'user research', 'roadmap planning'],
      engagement: 'Build better products with proven strategies'
    };

    // Build RSS context for professional personas
    let rssSourceContext = '';
    if (rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT INDUSTRY DEVELOPMENTS (from RSS sources):\n${rssContext}`;
    }

    basePrompt = `You are a seasoned product expert sharing viral product development insights on Twitter.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}

VIRAL STRATEGY:
• HOOK: ${enhancedGuidelines.hook}
• SCENARIOS: Focus on ${enhancedGuidelines.scenarios?.join(', ')}
• ENGAGEMENT: ${enhancedGuidelines.engagement}

Generate product content that provides genuine value to product managers and builders:

CONTENT APPROACH:
• Share a hard-learned insight or counterintuitive lesson about ${topic.displayName}
• Include specific examples or scenarios that illustrate the point
• Explain why this matters for product success and user experience
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound authentic and based on real experience - avoid generic advice
• Focus on actionable insights that product people can apply immediately
${useRSSSources ? '• May reference current industry trends or recent product examples' : ''}${rssSourceContext}

CONTENT TYPE: ${contentType}
PROFESSIONAL FOCUS: Practical product insights

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'startup_content') {
    // Build RSS context for startup personas
    let rssSourceContext = '';
    if (rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT STARTUP DEVELOPMENTS (from RSS sources):\n${rssContext}`;
    }

    basePrompt = `Write valuable startup content about "${topic.displayName}" from the perspective of someone building in the trenches.

ENTREPRENEUR APPROACH:
• Share an honest insight or hard-learned lesson about ${topic.displayName}
• Include the reality behind the challenge - not just the highlight reel
• Explain what you wish you'd known earlier or what surprised you
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound authentic and vulnerable - startup life is messy
• Focus on real experiences that fellow entrepreneurs can relate to
${useRSSSources ? '• You may reference current startup trends, funding news, or market insights if relevant' : ''}${rssSourceContext}

CONTENT TYPE: ${contentType}
STARTUP FOCUS: Honest entrepreneurship insights

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'tech_commentary') {
    // Build RSS context for tech personas
    let rssSourceContext = '';
    if (rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT TECH DEVELOPMENTS (from RSS sources):\n${rssContext}`;
    }

    basePrompt = `Write thoughtful tech commentary about "${topic.displayName}" from a developer/tech professional perspective.

TECH PROFESSIONAL APPROACH:
• Share a nuanced take or observation about ${topic.displayName}
• Include technical insight without being overly complex
• Explain the broader implications or why this matters to the industry
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound knowledgeable but accessible - not gatekeeping
• Focus on insights that tech professionals would find valuable
${useRSSSources ? '• You may reference current tech trends, recent developments, or industry news if it enhances the insight' : ''}${rssSourceContext}

CONTENT TYPE: ${contentType}
TECH FOCUS: Thoughtful industry commentary

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'satirist') {
    // Build RSS context for satirist persona - needs current news for fresh satirical content
    let rssSourceContext = '';
    if (rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT NEWS & DEVELOPMENTS (from RSS sources):\n${rssContext}`;
    }

    basePrompt = `Write witty satirical content about "${topic.displayName}" that makes people laugh while making a sharp point about current events.

SATIRIST APPROACH:
• Create clever, satirical observations about current political news, business developments, and social trends
• Use irony, wit, and humor to highlight absurdities or contradictions in news events
• Reference specific current news, political developments, or trending topics for timely satirical commentary
• Keep under 200 characters (STRICT LIMIT - tweets must be well under 280 total)
• Sound intelligent and observant - satirical but not mean-spirited or offensive
• Focus on making people both laugh and think about the absurdity of current events
• Draw from political news, business headlines, celebrity controversies, and social media trends
• Comment on media coverage patterns, political rhetoric, or societal contradictions
${useRSSSources ? '• Use current political news, business headlines, social controversies, or trending topics as satirical material' : ''}${rssSourceContext}

CONTENT TYPE: ${contentType}
SATIRE FOCUS: Current events, political news, and social trend satirical commentary

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'business_storyteller') {
    // Build RSS context for business storytelling
    let rssSourceContext = '';
    if (rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT BUSINESS DEVELOPMENTS (from RSS sources):\n${rssContext}`;
    }

    basePrompt = `Write compelling Indian business story threads about "${topic.displayName}" that blend iconic business moments with human psychology and strategic insights.

INDIAN BUSINESS STORYTELLER APPROACH:
• Create narrative threads (6-7 tweets) that tell complete stories from Indian business history
• Focus on the human elements behind business decisions - psychology, pressure, family dynamics
• Include specific details, emotions, and the strategic thinking behind major business moves
• Connect traditional Indian business wisdom with modern startup/corporate strategies
• Highlight the cultural and personal contexts that shaped business leaders' decisions
• Use storytelling techniques that make business lessons memorable and relatable
• Structure as thread with clear beginning, development, climax, and lesson/insight
• Sound like someone who understands both business strategy and human nature
• Include specific numbers, dates, and real business outcomes where relevant
• Draw parallels between historical business decisions and current entrepreneurial challenges
${useRSSSources ? '• May reference current Indian business news, startup developments, or market trends' : ''}${rssSourceContext}

THREAD STRUCTURE:
• Tweet 1: Hook with intriguing business scenario or decision
• Tweets 2-5: Story development with context, challenges, human elements
• Tweet 6: Climax/decision/outcome
• Tweet 7: Strategic lesson or insight for modern entrepreneurs

CONTENT TYPE: ${contentType}
BUSINESS STORYTELLING FOCUS: Indian business narratives with emotional depth and strategic insights

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'cricket_storyteller') {
    // Build RSS context for cricket storytelling
    let rssSourceContext = '';
    if (rssContext.length > 0) {
      rssSourceContext = `\n\nRECENT CRICKET DEVELOPMENTS (from RSS sources):\n${rssContext}`;
    }

    basePrompt = `Write compelling cricket story threads about "${topic.displayName}" that use cricket as a backdrop to explore human nature, character, and life lessons.

CRICKET STORYTELLER APPROACH:
• Create narrative threads (6-7 tweets) that blend iconic cricket moments with human psychology
• Focus on the personalities and characters behind great cricket performances
• Explore how cricket moments revealed character, handled pressure, or demonstrated resilience  
• Include the entertainment value and larger-than-life personalities who transcended cricket
• Connect cricket situations to universal human themes of pressure, character, and personal growth
• Use cricket as a lens to examine rivalry, friendship, leadership, and personal battles
• Structure as thread with clear narrative arc and human insight/lesson
• Sound like someone who understands both cricket and human psychology
• Include specific match details, scores, and outcomes where relevant
• Draw life lessons and philosophical insights from cricket scenarios that anyone can relate to
${useRSSSources ? '• May reference current cricket news, player stories, or ongoing tournaments' : ''}${rssSourceContext}

THREAD STRUCTURE:
• Tweet 1: Hook with intriguing cricket moment or character scenario
• Tweets 2-5: Story development with context, pressure, human psychology elements
• Tweet 6: Climax/moment/outcome of the cricket situation
• Tweet 7: Life lesson or character insight that transcends cricket

CONTENT TYPE: ${contentType}
CRICKET STORYTELLING FOCUS: Human stories through cricket lens with character and life lessons

[${timeMarker}-${tokenMarker}]`;
  }

  // Add account-specific CTAs based on account context
  if (account) {
    // For now, add Gibbi CTA for gibbi-related accounts (15% chance)
    // In the future, this would be configurable per account in database
    const isGibbiAccount = account.twitter_handle.includes('gibbi') || account.name.toLowerCase().includes('gibbi');
    if (isGibbiAccount && Math.random() < 0.15) {
      basePrompt += `\n\nIMPORTANT: Include a natural Gibbi AI mention like "Practice more English at gibbi.vercel.app" or "Improve your skills at gibbi.vercel.app" - keep it helpful and non-promotional.`;
    }
  }

  return {
    prompt: basePrompt + `\n\nCRITICAL: Keep your content under 200 characters. Twitter has a 280 character limit and hashtags will be added separately.

Format as JSON with: "content", "teachingElements" (array of educational approaches used like "analogy", "common mistake", "practical tip"), "hashtags" (array of 3-4 specific, relevant hashtags that authentically relate to your content), "gibbiCTA" (string or null).

HASHTAG INSTRUCTIONS:
• Generate hashtags that are SPECIFIC to your content
• If teaching "affect vs effect", use #AffectVsEffect not #Grammar
• If explaining pronunciation, use the specific sound/word, not #Pronunciation
• If it's a satirical take on a specific news event, reference that event
• Be authentic and avoid generic hashtags like #Learning #Tips #English
• Focus on what makes THIS specific content unique and discoverable
• Maximum 4 hashtags for optimal engagement

Write like a helpful teacher, not a marketer!`,
    persona,
    topic
  };
}

/**
 * Parse and validate the AI response for tweet content with AI-generated hashtags
 */
function parseAndValidateTweetResponse(content: string, persona: string, topic: { key: string; displayName: string }, personaConfig?: PersonaConfig): EnhancedTweet | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedContent);
    
    if (!data.content || typeof data.content !== 'string' ||
        !data.teachingElements || !Array.isArray(data.teachingElements) ||
        !data.hashtags || !Array.isArray(data.hashtags)) {
      throw new Error('AI response missing required fields or has invalid structure.');
    }
    
    // Use AI-generated hashtags, fallback to persona hashtags if needed
    let hashtags = data.hashtags.slice(0, 4); // Limit to 4 hashtags
    
    // Fallback to persona hashtags only if AI didn't generate any valid hashtags
    if (!hashtags.length && personaConfig && personaConfig.hashtag_sets && personaConfig.hashtag_sets.length > 0) {
      const variation = Math.floor(Math.random() * personaConfig.hashtag_sets.length);
      hashtags = getHashtagsForPersona(personaConfig, variation);
    }
    
    // STRICT character limit enforcement - much stricter to avoid any issues
    const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.map((tag: string) => `#${tag}`).join(' ') : '';
    const ctaString = data.gibbiCTA ? '\n\n' + data.gibbiCTA : '';
    const totalLength = data.content.length + hashtagString.length + ctaString.length;
    
    // Enforce strict 270 character limit (10 char buffer from Twitter's 280)
    if (totalLength > 270) {
      console.warn(`Generated tweet exceeds 270 characters (${totalLength}), truncating content...`);
      const availableLength = 270 - hashtagString.length - ctaString.length;
      if (availableLength > 0) {
        data.content = data.content.substring(0, availableLength - 3) + '...';
      } else {
        // If hashtags and CTA take too much space, prioritize content
        data.content = data.content.substring(0, 200);
        hashtags = hashtags.slice(0, 2); // Reduce hashtags
      }
    }

    return {
      content: data.content,
      hashtags: hashtags,
      persona: persona,
      category: topic.key.split('_')[1] || 'general', // Extract category from topic key
      topic: topic.key,
      engagementHooks: data.teachingElements, // Map teachingElements to engagementHooks for backward compatibility
      gibbiCTA: data.gibbiCTA || undefined,
      contentType: 'explanation' // Default content type for teacher approach
    };
    
  } catch (error) {
    console.error(`Failed to parse AI tweet response. Content: "${content}"`, error);
    return null;
  }
}

/**
 * Main enhanced tweet generation function with multi-account support
 */
export async function generateTweet(config: TweetGenerationConfig = {}): Promise<EnhancedTweet | null> {
  try {
    

    const { prompt, persona, topic } = await generateTweetPrompt(config);
    const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;

    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AI returned no content.');
    }

    if (!persona || !topic) {
      throw new Error('Invalid persona or topic configuration');
    }

    const tweetData = parseAndValidateTweetResponse(content, persona.key, topic as { key: string; displayName: string }, persona);
    if (!tweetData) {
      throw new Error('Failed to parse or validate AI response.');
    }

    // Add content hash for duplicate detection (not stored in DB)
    const contentHash = generateContentHash(tweetData);
    
    console.log(`✅ Generated enhanced tweet for ${persona.displayName} on ${(topic as { key: string; displayName: string }).displayName} [${timeMarker}-${tokenMarker}] Hash: ${contentHash}`);
    return tweetData;

  } catch (error) {
    console.error(`❌ Failed to generate enhanced tweet:`, error);
    return null;
  }
}

/**
 * Generate multiple enhanced tweets in batch
 */
export async function generateBatchTweets(count: number, config: TweetGenerationConfig = {}): Promise<EnhancedTweet[]> {
  const tweets: EnhancedTweet[] = [];
  const promises: Promise<EnhancedTweet | null>[] = [];

  for (let i = 0; i < count; i++) {
    promises.push(generateTweet(config));
  }

  const results = await Promise.all(promises);
  
  for (const result of results) {
    if (result) {
      tweets.push(result);
    }
  }

  console.log(`📊 Enhanced batch generation complete: ${tweets.length}/${count} successful tweets`);
  return tweets;
}