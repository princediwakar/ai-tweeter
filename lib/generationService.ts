// generationService.ts
import OpenAI from 'openai';
import { randomBytes } from 'crypto';
import { getRandomTopicForPersona, getPersonaByKey, selectPersonaByWeight, getHashtagsForPersona, PersonaConfig, getRandomPersonaForHandle, isPersonaAllowedForHandle } from '@/lib/personas';
import { EnhancedTweet, TweetGenerationConfig, VariationMarkers, VocabularyCard } from './types';
import { getAccount } from './db';
import type { Account } from './types';
import { getDynamicContext } from './contentSource';
import { generatePersonaImage } from './imageGenerationService';

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
  const tokenMarker = `TK${randomBytes(4).toString('hex').toUpperCase()}`;
  
  return { 
    time_marker: timeMarker, 
    token_marker: tokenMarker, 
    generation_timestamp: timestamp,
    content_hash: '' // Will be populated after content generation
  };
}

/**
 * Topic-specific guidelines for enhanced content generation
 */
const TOPIC_GUIDELINES = {
  // --- Core Vocabulary & Nuance ---
  eng_vocab_word_meaning: {
    focus: 'Clarifying the precise meaning of a powerful word with a memorable example.',
    hook: 'You might know this word, but are you using it to its full potential?',
    scenarios: ['job interviews', 'academic writing', 'sounding more articulate'],
  },
  eng_vocab_confused_words: {
    focus: 'Clearly differentiating between two words that are often mixed up.',
    hook: 'Stop making this common mistake! Master the difference between these tricky words.',
    scenarios: ['professional emails', 'writing reports', 'avoiding embarrassing mix-ups'],
  },
  eng_vocab_formal_casual: {
    focus: 'Showing the difference between formal and casual ways to express the same idea.',
    hook: 'Sound more professional at work and more natural with friends. Here’s how.',
    scenarios: ['adapting your language for different audiences', 'job interviews vs. texting', 'email etiquette'],
  },
  
  // --- Synonyms & Alternatives ---
  eng_vocab_synonyms_good: {
    focus: 'Moving beyond "good" to use more precise and impactful positive adjectives.',
    hook: 'Why say "good" when you could say "exceptional," "superb," or "marvelous"?',
    scenarios: ['giving feedback', 'writing reviews', 'expressing strong positive feelings'],
  },
  eng_vocab_synonyms_important: {
    focus: 'Replacing "important" with stronger, more specific alternatives.',
    hook: 'Make your point more powerful. Stop saying "important" and start using these words.',
    scenarios: ['making a business case', 'prioritizing tasks', 'academic arguments'],
  },
  eng_vocab_synonyms_said: {
    focus: 'Using descriptive verbs instead of the generic word "said."',
    hook: 'Bring your stories to life! Don’t just say they "said" something.',
    scenarios: ['storytelling', 'creative writing', 'reporting conversations'],
  },

  // --- Practical English ---
  eng_vocab_business: {
    focus: 'Explaining a key term used in corporate environments to boost professional fluency.',
    hook: 'Want to sound like a pro in your next meeting? You need to know this business term.',
    scenarios: ['team meetings', 'client negotiations', 'understanding corporate jargon'],
  },
  eng_vocab_idiom: {
    focus: 'Defining a common English idiom and explaining how to use it naturally.',
    hook: 'Unlock the secrets of native speakers! What does this common idiom *really* mean?',
    scenarios: ['understanding movies and TV shows', 'casual conversations', 'sounding more fluent'],
  },
  eng_vocab_phrasal_verb: {
    focus: 'Breaking down a useful phrasal verb with a clear example.',
    hook: 'This is one phrasal verb you will use all the time. Let\'s master it.',
    scenarios: ['daily conversation', 'making plans', 'understanding context'],
  },
  
  // --- Word Types ---
  eng_vocab_adjective: {
    focus: 'Introducing a descriptive adjective to make your language more vivid.',
    hook: 'Add some color to your English! Here’s a great adjective to do it.',
    scenarios: ['describing people, places, or experiences', 'storytelling', 'making your writing more engaging'],
  },
  eng_vocab_power_verb: {
    focus: 'Showcasing a strong, active verb to make sentences more dynamic.',
    hook: 'Make your sentences move! Replace weak verbs with this powerful alternative.',
    scenarios: ['resume writing', 'professional communication', 'clear and concise writing'],
  },
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
  
  const handle = account.twitter_handle.replace('@', '').toLowerCase();
  
  switch (handle) {
    case 'gibbi_ai':
      return false;
    
    case 'princediwakar25':
      return true;
    
    default:
      return true;
  }
}

/**
 * Generates enhanced tweet prompts using topic guidelines and variation markers
 */
async function generateTweetPrompt(config: TweetGenerationConfig & { batchPosition?: number; batchSize?: number }): Promise<{ prompt: string; persona: PersonaConfig; topic: unknown }> {
  const markers = generateVariationMarkers();
  const { time_marker: timeMarker, token_marker: tokenMarker } = markers;
  
  let account: Account | null = null;
  
  if (config.account_id && config.account_id !== 'fallback') {
    account = await getAccount(config.account_id);
    if (account) {
      console.log(`🎯 Account context: ${account.name} (${account.twitter_handle})`);
    }
  }
  
  const useRSSSources = shouldUseRSSSources(account);
  console.log(`📰 RSS sources ${useRSSSources ? 'enabled' : 'disabled'} for account: ${account?.name || 'unknown'}`);
  
  let rssContext = '';
  if (useRSSSources && config.persona) {
    try {
      if (['satirist', 'business_storyteller', 'cricket_storyteller'].includes(config.persona)) {
        const topicForRSS = config.topic || 'India';
        rssContext = await getDynamicContext(config.persona, topicForRSS);
        console.log(`📰 Fetched RSS context for ${config.persona}: ${rssContext.length > 0 ? 'success' : 'no content'}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch RSS context, continuing without it:', error);
    }
  }
  
  let persona: PersonaConfig | undefined;
  
  if (config.persona) {
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
      persona = getPersonaByKey(config.persona);
      if (persona) {
        console.log(`✅ Using requested persona (no account validation): ${persona.displayName}`);
      }
    }
  }
  
  if (!persona) {
    if (config.account_id && config.account_id !== 'fallback' && account) {
      try {
        persona = getRandomPersonaForHandle(account.twitter_handle);
        console.log(`🔒 Using handle-allowed random persona: ${persona.displayName} for @${account.twitter_handle}`);
      } catch (error) {
        console.error(`❌ Failed to get persona for handle @${account.twitter_handle}:`, error);
        persona = selectPersonaByWeight();
        console.log(`⚠️  Falling back to legacy random persona: ${persona.displayName}`);
      }
    } else {
      persona = selectPersonaByWeight();
      console.log(`🎲 Using legacy random persona: ${persona.displayName}`);
    }
  }
    
  if (!persona) {
    throw new Error('Invalid persona specified');
  }

  const topic = config.topic 
    ? persona.topics.find(t => t.key === config.topic)
    : getRandomTopicForPersona(persona.key);
    
  if (!topic) {
    throw new Error('No valid topic found for persona');
  }

  let basePrompt = '';
  const topicKey = (topic as { key: string; displayName: string }).key;
  const guidelines = TOPIC_GUIDELINES[topicKey as keyof typeof TOPIC_GUIDELINES];
  
  if (persona.key === 'english_vocab_builder') {
    const enhancedGuidelines = guidelines || {
      focus: 'Essential vocabulary building.',
      hook: 'Level up your English skills!',
      scenarios: ['daily conversation'],
    };

    // Generate random approach variations for stronger uniqueness
    const approaches = [
      'Focus on etymology and word origins',
      'Emphasize practical usage in professional settings', 
      'Highlight common mistakes and how to avoid them',
      'Show formal vs informal usage patterns',
      'Demonstrate usage in different contexts',
      'Focus on pronunciation and spelling patterns'
    ];
    const randomApproach = approaches[Math.floor(Math.random() * approaches.length)];
    
    const batchContext = config.batchPosition && config.batchSize 
      ? `\n\nBATCH CONTEXT: This is generation ${config.batchPosition} of ${config.batchSize}. Generate completely UNIQUE content - avoid repeating words, examples, or concepts from previous generations in this batch.`
      : '';

    basePrompt = `You are a viral English education expert. Your goal is to generate a vocabulary lesson for an image-based tweet.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}
APPROACH: ${randomApproach}

UNIQUENESS REQUIREMENT: Generate COMPLETELY UNIQUE vocabulary content. Even if this topic category was used before, choose a different word/pair/concept. Be creative and avoid repetition.${batchContext}

TASK: Generate a single vocabulary lesson and provide the output in a structured JSON format.

### JSON STRUCTURE:
{
  "tweetText": "A short, engaging hook for the Twitter post (under 180 chars). Use the style: '${enhancedGuidelines.hook}'",
  "cardData": {
    "type": "The type of lesson. MUST be one of: 'single_word', 'confused_pair', 'synonym_list', 'idiom', 'phrasal_verb'.",
    "word": "The main word, phrase, or pair. For confused pairs, format as 'Word1 vs. Word2'.",
    "partOfSpeech": "The part of speech. For confused pairs, provide for the first word.",
    "meaning": "The definition. For confused pairs, define BOTH words, separated by a newline '\\n'. For synonym lists, this should be a brief description.",
    "example": "A practical example sentence. For confused pairs, use the first word in the sentence.",
    "synonyms": ["An", "array", "of", "synonyms", "if the topic is about synonyms."]
  },
  "hashtags": ["An", "array", "of", "4 relevant hashtags"],
  "gibbiCTA": "A CTA string or null"
}

### CRITICAL INSTRUCTIONS:
- Adhere strictly to the "type" options.
- For "confused_pair", the 'word' field MUST contain " vs. " and the 'meaning' field MUST contain a newline '\\n'.
- For "synonym_list", the 'synonyms' array MUST be populated.
- ENSURE COMPLETE UNIQUENESS: Choose different words/concepts even within the same topic category.

[${timeMarker}-${tokenMarker}]`;
  
  } else if (persona.key === 'satirist') {
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

CONTENT TYPE: "single_tweet"
SATIRE FOCUS: Current events, political news, and social trend satirical commentary

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'business_storyteller') {
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

CONTENT TYPE: "thread"
BUSINESS STORYTELLING FOCUS: Indian business narratives with emotional depth and strategic insights

[${timeMarker}-${tokenMarker}]`;

  } else if (persona.key === 'cricket_storyteller') {
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

CONTENT TYPE: "thread"
CRICKET STORYTELLING FOCUS: Human stories through cricket lens with character and life lessons

[${timeMarker}-${tokenMarker}]`;
  }

  if (account) {
    const isGibbiAccount = account.twitter_handle.includes('gibbi') || account.name.toLowerCase().includes('gibbi');
    if (isGibbiAccount && Math.random() < 0.15) {
      basePrompt += `\n\nIMPORTANT: Include a natural Gibbi AI mention like "Practice more English at gibbi.vercel.app" or "Improve your skills at gibbi.vercel.app" - keep it helpful and non-promotional.`;
    }
  }

  return {
    prompt: basePrompt + `\n\nCRITICAL: Keep tweet text content under 200 characters. Format the entire output as a single, valid JSON object. For non-vocabulary personas, use the key "content" for the tweet text. For the vocabulary persona, use the "tweetText" and "cardData" structure as specified. Always include the "hashtags" array.`,
    persona,
    topic
  };
}

/**
 * Parse and validate the AI response for tweet content
 */
function parseAndValidateTweetResponse(
  content: string, 
  persona: string, 
  topic: { key: string; displayName: string }, 
  personaConfig?: PersonaConfig
): { tweet: EnhancedTweet; cardData: VocabularyCard | null } | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedContent);

    let cardData: VocabularyCard | null = null;
    let tweetContent: string;

    if (persona === 'english_vocab_builder') {
      if (!data.tweetText || !data.cardData || !data.cardData.word || !data.cardData.meaning) {
        throw new Error('AI response for vocab_builder missing required fields: tweetText or cardData.');
      }
      tweetContent = data.tweetText;
      cardData = {
        word: data.cardData.word,
        meaning: data.cardData.meaning,
        partOfSpeech: data.cardData.partOfSpeech,
        example: data.cardData.example,
        synonyms: data.cardData.synonyms,
        type: data.cardData.type,
      };
    } else {
      if (!data.content || typeof data.content !== 'string') {
        throw new Error('AI response missing required "content" field.');
      }
      tweetContent = data.content;
    }

    if (!data.hashtags || !Array.isArray(data.hashtags)) {
        throw new Error('AI response missing required hashtags array.');
    }
    
    let hashtags = data.hashtags.slice(0, 4);
    
    if (!hashtags.length && personaConfig && personaConfig.hashtag_sets && personaConfig.hashtag_sets.length > 0) {
      const variation = Math.floor(Math.random() * personaConfig.hashtag_sets.length);
      hashtags = getHashtagsForPersona(personaConfig, variation);
    }
    
    const hashtagString = hashtags.length > 0 ? '\n\n' + hashtags.map((tag: string) => `#${tag}`).join(' ') : '';
    const ctaString = data.gibbiCTA ? '\n\n' + data.gibbiCTA : '';
    const totalLength = tweetContent.length + hashtagString.length + ctaString.length;
    
    if (totalLength > 270) {
      console.warn(`Generated tweet exceeds 270 characters (${totalLength}), truncating content...`);
      const availableLength = 270 - hashtagString.length - ctaString.length;
      if (availableLength > 0) {
        tweetContent = tweetContent.substring(0, availableLength - 3) + '...';
      } else {
        tweetContent = tweetContent.substring(0, 200);
        hashtags = hashtags.slice(0, 2);
      }
    }

    const tweet: EnhancedTweet = {
      content: tweetContent,
      hashtags: hashtags,
      persona: persona,
      category: topic.key.split('_')[1] || 'general',
      topic: topic.key,
      engagementHooks: data.teachingElements || [],
      gibbiCTA: data.gibbiCTA || undefined,
      contentType: 'explanation'
    };

    return { tweet, cardData };
    
  } catch (error) {
    console.error(`Failed to parse AI tweet response. Content: "${content}"`, error);
    return null;
  }
}

/**
 * Main enhanced tweet generation function with multi-account support
 */
export async function generateTweet(config: TweetGenerationConfig & { batchPosition?: number; batchSize?: number } = {}): Promise<EnhancedTweet | null> {
  try {
    const { prompt, persona, topic } = await generateTweetPrompt(config);
    const markers = generateVariationMarkers();
    const { time_marker: timeMarker, token_marker: tokenMarker } = markers;

    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AI returned no content.');
    }

    if (!persona || !topic) {
      throw new Error('Invalid persona or topic configuration');
    }

    const parsedResponse = parseAndValidateTweetResponse(content, persona.key, topic as { key: string; displayName: string }, persona);
    if (!parsedResponse) {
      throw new Error('Failed to parse or validate AI response.');
    }

    const { tweet: tweetData, cardData } = parsedResponse;

    let imageUrl: string | undefined = undefined;
    console.log(`🔍 Checking image generation for persona ${persona.displayName}: enabled=${persona.image_generation?.enabled}`);
    if (persona.image_generation?.enabled && cardData) {
      try {
        console.log(`🖼️ Starting image generation for ${persona.displayName} with key ${persona.key}`);
        const generatedImageUrl = await generatePersonaImage(cardData, persona.key);
        if (generatedImageUrl) {
          imageUrl = generatedImageUrl;
          console.log(`🖼️ Generated and uploaded image for ${persona.displayName} tweet: ${imageUrl}`);
        } else {
          console.log(`⚠️ Image generation returned null for ${persona.displayName}`);
        }
      } catch (error) {
        console.warn(`⚠️ Image generation failed for ${persona.displayName}:`, error);
      }
    } else {
      console.log(`🔍 Image generation disabled or no card data for persona ${persona.displayName}`);
    }

    const contentHash = generateContentHash(tweetData);
    
    console.log(`✅ Generated enhanced tweet for ${persona.displayName} on ${(topic as { key: string; displayName: string }).displayName} [${timeMarker}-${tokenMarker}] Hash: ${contentHash}`);
    
    return {
      ...tweetData,
      imageUrl
    };

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