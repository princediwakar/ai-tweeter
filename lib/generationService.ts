//generationService.ts

import OpenAI from 'openai';
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
  // --- Core Vocabulary Skills ---
  eng_vocab_word_meaning: {
    focus: 'Clarifying the precise meaning of a word with memorable examples',
    hook: 'You might know this word, but are you using it correctly? Let\'s find out!',
    scenarios: ['job interviews', 'academic writing', 'sounding more articulate'],
    engagement: 'Challenge viewers to create their own sentence with the word'
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
async function generateTweetPrompt(config: TweetGenerationConfig): Promise<{ prompt: string; persona: PersonaConfig; topic: unknown }> {
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
      if (['product_insights', 'startup_content', 'tech_commentary', 'satirist', 'business_storyteller', 'cricket_storyteller'].includes(config.persona)) {
        const topicForRSS = config.topic || 'technology';
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

  const contentType = config.contentType || 'challenge';
  
  let basePrompt = '';
  
  const topicKey = (topic as { key: string; displayName: string }).key;
  const guidelines = TOPIC_GUIDELINES[topicKey as keyof typeof TOPIC_GUIDELINES];
  
  if (persona.key === 'english_vocab_builder') {
    const enhancedGuidelines = guidelines || {
      focus: 'Essential vocabulary building with practical applications',
      hook: 'Present vocabulary that elevates communication skills',
      scenarios: ['professional communication', 'academic writing', 'daily conversations'],
      engagement: 'Help learners use words confidently'
    };

    basePrompt = `You are a viral English education expert creating engaging vocabulary content for Twitter. Your goal is to generate content for an image-based tweet.

TOPIC: "${topic.displayName}" - ${enhancedGuidelines.focus}

TASK: Generate a single vocabulary lesson. Provide the output in a structured JSON format containing two main parts:
1.  \`tweetText\`: A short, engaging text for the Twitter post itself (under 180 characters). This text should encourage users to look at the image for the lesson.
2.  \`cardData\`: A detailed object containing the vocabulary information to be displayed on the image.

JSON STRUCTURE:
{
  "tweetText": "A short, catchy tweet. Example: 'Don't just say 'important'! 🤯 Level up your vocabulary with this powerful alternative. Check the image to learn more! ✨'",
  "cardData": {
    "word": "The main vocabulary word (e.g., 'Crucial')",
    "partOfSpeech": "The part of speech (e.g., 'adjective')",
    "meaning": "A clear, concise definition (e.g., 'Extremely important or necessary for a particular situation or outcome.')",
    "example": "A practical example sentence (e.g., 'Clear communication is crucial for the project's success.')"
  },
  "hashtags": ["An", "array", "of", "4 relevant hashtags"],
  "gibbiCTA": "A CTA string or null"
}

GUIDELINES:
- The \`tweetText\` must be engaging and separate from the main lesson.
- The \`cardData\` must be accurate and easy to understand for an intermediate English learner.
- Ensure the \`word\` is impactful and the \`example\` is practical.

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

CONTENT TYPE: ${contentType}
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

CONTENT TYPE: ${contentType}
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

CONTENT TYPE: ${contentType}
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
export async function generateTweet(config: TweetGenerationConfig = {}): Promise<EnhancedTweet | null> {
  try {
    const { prompt, persona, topic } = await generateTweetPrompt(config);
    const markers = generateVariationMarkers();
    const { time_marker: timeMarker, token_marker: tokenMarker } = markers;

    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
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