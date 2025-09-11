import OpenAI from 'openai';
import { getPersonaByKey, PersonaConfig } from '@/lib/personas';
import { getAccount, createThread, saveTweet, generateTweetId } from './db';
import type { Account, Tweet } from './types';
import { getThreadTemplate, ThreadTemplate } from './threadTemplates';

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export interface ThreadGenerationConfig {
  account_id: string;
  persona: string;
  template?: string; // Specific template name
  topic?: string; // Optional topic override
}

export interface ThreadGenerationResult {
  thread_id: string;
  total_tweets: number;
  tweets: Tweet[];
  template_used: string;
  story_category: string;
}

/**
 * Split a long tweet into multiple tweets at natural break points
 */
function splitLongTweet(content: string): string[] {
  const maxLength = 280;
  
  if (content.length <= maxLength) {
    return [content];
  }
  
  const tweets: string[] = [];
  let remaining = content.trim();
  
  while (remaining.length > maxLength) {
    // Find natural break points in order of preference
    let splitIndex = maxLength;
    
    // Try to split at sentence endings (. ! ?)
    let lastSentence = remaining.lastIndexOf('.', maxLength);
    if (lastSentence === -1) lastSentence = remaining.lastIndexOf('!', maxLength);
    if (lastSentence === -1) lastSentence = remaining.lastIndexOf('?', maxLength);
    
    if (lastSentence > maxLength * 0.6) { // Don't split too early
      splitIndex = lastSentence + 1;
    } else {
      // Try to split at comma or semicolon
      let lastPunctuation = remaining.lastIndexOf(',', maxLength);
      if (lastPunctuation === -1) lastPunctuation = remaining.lastIndexOf(';', maxLength);
      
      if (lastPunctuation > maxLength * 0.7) {
        splitIndex = lastPunctuation + 1;
      } else {
        // Split at last space to avoid breaking words
        const lastSpace = remaining.lastIndexOf(' ', maxLength);
        if (lastSpace > maxLength * 0.5) {
          splitIndex = lastSpace;
        }
      }
    }
    
    // Extract the tweet and clean up
    const tweetContent = remaining.substring(0, splitIndex).trim();
    tweets.push(tweetContent);
    
    // Continue with remaining content  
    remaining = remaining.substring(splitIndex).trim();
  }
  
  // Add the final piece
  if (remaining.length > 0) {
    tweets.push(remaining);
  }
  
  console.log(`✂️ Split long tweet into ${tweets.length} parts:`, tweets.map(t => `${t.length} chars`));
  return tweets;
}

/**
 * Select appropriate thread template using persona configuration
 * OPTIMIZED: Uses persona.thread_templates instead of separate persona mapping
 */
function selectThreadTemplate(persona: PersonaConfig, templateOverride?: string): ThreadTemplate {
  if (templateOverride) {
    const template = getThreadTemplate(templateOverride);
    if (template) {
      console.log(`🎯 Using specified template: ${template.displayName}`);
      return template;
    }
    console.warn(`⚠️ Template "${templateOverride}" not found, using random selection`);
  }

  // For threading personas (business_storyteller, cricket_storyteller), select from available templates
  if ((persona.key === 'business_storyteller' || persona.key === 'cricket_storyteller') && persona.thread_templates) {
    const randomIndex = Math.floor(Math.random() * persona.thread_templates.length);
    const templateName = persona.thread_templates[randomIndex];
    const template = getThreadTemplate(templateName);
    
    if (template) {
      console.log(`🎲 Randomly selected template: ${template.displayName}`);
      return template;
    }
  }

  // Fallback to founder struggle template
  const fallbackTemplate = getThreadTemplate('founder_struggle');
  if (!fallbackTemplate) {
    throw new Error('No thread templates available');
  }
  
  console.log(`🔄 Using fallback template: ${fallbackTemplate.displayName}`);
  return fallbackTemplate;
}

/**
 * Generate thread-specific prompt for storytelling (business or cricket)
 * OPTIMIZED: Uses persona config directly instead of duplicating context
 */
function generateThreadPrompt(template: ThreadTemplate, persona?: PersonaConfig): string {
  const timeMarker = `T${Date.now()}`;
  const tokenMarker = `TK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const diversityMarker = `D${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
  
  // Get persona-specific context from persona config instead of hardcoding
  const storyContext = persona?.description || 'Expert storyteller creating compelling narratives';
  
  // Use persona topics for variation instead of hardcoded arrays
  const availableTopics = persona?.topics || [];
  const randomTopic = availableTopics.length > 0 
    ? availableTopics[Math.floor(Math.random() * availableTopics.length)]
    : { displayName: 'General storytelling' };
  
  const selectedVariation = `Focus on ${randomTopic.displayName.toLowerCase()}`;

  // Get persona-specific requirements and context 
  const personaHashtags = persona?.hashtag_sets?.[Math.floor(Math.random() * persona.hashtag_sets.length)] || 
    ['#Stories', '#Leadership', '#Inspiration'];
  
  const isBusinessPersona = persona?.key === 'business_storyteller';
  const isCricketPersona = persona?.key === 'cricket_storyteller';
  
  // Context-specific requirements based on persona
  const specificRequirements = isBusinessPersona 
    ? `• Focus on authentic business stories with strategic insights
• Include specific details, numbers, and concrete outcomes  
• Connect with Indian business culture and context
• Blend business strategy with human elements`
    : isCricketPersona 
    ? `• Focus on authentic cricket stories with psychological depth
• Include match details, scores, and specific moments
• Connect cricket situations to universal human themes
• Highlight character revelations and life lessons`
    : `• Focus on authentic, engaging stories with emotional depth
• Include specific details and memorable moments
• Connect with universal human themes`;

  return `${storyContext}

UNIQUENESS INSTRUCTION: ${selectedVariation}

THREAD TEMPLATE: "${template.displayName}"
STORY BRIEF: ${template.story_prompt}

CREATIVE APPROACH:
• Find compelling, lesser-known stories or fresh angles on known stories
• Focus on emotional depth and meaningful insights
• Use conversational storytelling tone with natural flow
• Include human elements and specific, memorable details
• Each thread should be completely unique and original

PERSONA-SPECIFIC REQUIREMENTS:
${specificRequirements}
• Use Twitter handles (@username) when mentioning people/companies
• Start with an engaging hook and maintain narrative pacing
• Each tweet should be standalone engaging while advancing the story

THREADING FORMAT - NATURAL & HUMAN:
• Mix varied thread indicators: "1/7 🧵", "3/", "6/7"  
• Use conversational transitions: "But here's the twist...", "The real lesson?", "Here's what happened next:"
• Place indicators naturally at start OR end of tweets, NEVER mid-sentence
• Keep language simple, conversational, readable - avoid corporate speak

CHARACTER LIMITS - CRITICAL:
• EACH TWEET MUST BE UNDER 260 CHARACTERS (including thread indicators)
• Thread indicators count toward character limit
• Shorter tweets are better - aim for 180-240 characters per tweet
• If content exceeds limit, BREAK INTO TWO TWEETS

Generate a complete thread. Return ONLY valid JSON:

{
  "title": "Thread title",
  "story_category": "${template.name}",
  "hashtags": ${JSON.stringify(personaHashtags)},
  "tweets": [
    {"sequence": 1, "content": "Tweet 1 content"},
    {"sequence": 2, "content": "Tweet 2 content"}
  ]
}

[${timeMarker}-${tokenMarker}-${diversityMarker}]`;
}


/**
 * Parse and validate thread generation response
 */
function parseThreadResponse(content: string, template: ThreadTemplate): { title: string; story_category: string; hashtags: string[]; tweets: Array<{ sequence: number; content: string; }> } | null {
  try {
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(cleanedContent);
    
    if (!data.title || !data.tweets || !Array.isArray(data.tweets) || !data.hashtags || !Array.isArray(data.hashtags)) {
      throw new Error('AI response missing required fields');
    }
    
    if (data.tweets.length < 3 || data.tweets.length > 10) {
      throw new Error(`Thread length should be reasonable (3-10 tweets), got ${data.tweets.length}`);
    }
    
    // Validate tweet structure and handle character limits
    const processedTweets = [];
    for (let i = 0; i < data.tweets.length; i++) {
      const tweet = data.tweets[i];
      if (!tweet.content || typeof tweet.content !== 'string') {
        throw new Error(`Tweet ${i + 1} missing content`);
      }
      
      // Character validation and overflow handling
      if (tweet.content.length > 280) {
        console.warn(`Tweet ${i + 1} is too long (${tweet.content.length} chars), splitting into multiple tweets...`);
        
        // Split at natural break points (sentences, clauses)
        const splitTweets = splitLongTweet(tweet.content);
        
        // Add split tweets with correct sequencing
        splitTweets.forEach((content) => {
          processedTweets.push({
            sequence: processedTweets.length + 1,
            content: content
          });
        });
      } else {
        processedTweets.push({
          sequence: processedTweets.length + 1,
          content: tweet.content
        });
      }
    }
    
    // Validate final length
    if (processedTweets.length > 15) {
      throw new Error(`Thread too long after splitting: ${processedTweets.length} tweets (max 15)`);
    }
    
    return {
      title: data.title,
      story_category: data.story_category || template.name,
      hashtags: data.hashtags,
      tweets: processedTweets
    };
  } catch (error) {
    console.error(`Failed to parse thread response: ${error}`, { content: content.substring(0, 200) + '...' });
    return null;
  }
}


/**
 * Main thread generation function
 */
export async function generateThread(config: ThreadGenerationConfig): Promise<ThreadGenerationResult | null> {
  try {
    console.log(`🧵 Starting thread generation for account: ${config.account_id}, persona: ${config.persona}`);
    
    // Get account context
    const account = await getAccount(config.account_id);
    if (!account) {
      throw new Error(`Account not found: ${config.account_id}`);
    }
    
    // Get persona configuration
    const persona = getPersonaByKey(config.persona);
    if (!persona) {
      throw new Error(`Persona not found: ${config.persona}`);
    }
    
    // Validate persona supports threading
    if (!persona.content_types?.includes('thread')) {
      throw new Error(`Persona ${config.persona} does not support threading`);
    }
    
    // Select thread template
    const template = selectThreadTemplate(persona, config.template);
    
    // Generate thread content using AI
    const prompt = generateThreadPrompt(template, persona);
    
    console.log(`🤖 Sending thread generation request to DeepSeek (prompt length: ${prompt.length} chars)`);
    
    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8, // Higher creativity for storytelling
      max_tokens: 3000, // Reduced from 4000 for faster generation
      stream: false, // Ensure non-streaming for faster response
    });

    const aiContent = response.choices[0].message.content;
    if (!aiContent) {
      throw new Error('AI returned no content for thread generation');
    }

    // Parse and validate the response
    const threadData = parseThreadResponse(aiContent, template);
    if (!threadData) {
      throw new Error('Failed to parse or validate thread response');
    }

    console.log(`✅ Generated thread: "${threadData.title}" with ${threadData.tweets.length} tweets`);

    // Create thread record in database
    const threadId = await createThread({
      account_id: config.account_id,
      title: threadData.title,
      persona: config.persona,
      story_template: template.name,
      total_tweets: threadData.tweets.length,
      status: 'ready',
      story_category: threadData.story_category
    });

    // Use AI-generated hashtags from the thread response
    const hashtags = threadData.hashtags;

    // Create and save individual tweets (optimized with batch preparation)
    const tweets: Tweet[] = [];
    const tweetsToSave: Tweet[] = [];
    
    for (const tweetData of threadData.tweets) {
      const tweetId = generateTweetId();
      
      // Content without thread numbering (handled by posting service)
      const threadedContent = tweetData.content;
      
      const tweet: Tweet = {
        id: tweetId,
        account_id: config.account_id,
        content: threadedContent,
        hashtags: hashtags,
        persona: config.persona,
        status: 'ready',
        created_at: new Date().toISOString(),
        // Threading fields
        thread_id: threadId,
        thread_sequence: tweetData.sequence,
        content_type: 'thread'
      };

      tweetsToSave.push(tweet);
      tweets.push(tweet);
    }
    
    // Save all tweets sequentially (could be optimized further with bulk insert)
    for (const tweet of tweetsToSave) {
      await saveTweet(tweet);
    }

    console.log(`🎉 Thread generation complete: ${tweets.length} tweets saved for thread ${threadId}`);

    return {
      thread_id: threadId,
      total_tweets: tweets.length,
      tweets: tweets,
      template_used: template.name,
      story_category: threadData.story_category
    };

  } catch (error) {
    console.error(`❌ Thread generation failed:`, error);
    return null;
  }
}

/*

/**
 * Get thread generation eligibility for account
 */
export function canGenerateThreads(account: Account): boolean {
  // Currently only Prince's business account supports threading
  const handle = account.twitter_handle.toLowerCase();
  
  // Specific accounts that should NOT generate threads (Gibbi's educational accounts)
  const excludedHandles = ['@gibbi_ai', 'gibbi_ai'];
  if (excludedHandles.includes(handle) || excludedHandles.includes(handle.replace('@', ''))) {
    return false;
  }
  
  // Specific accounts that CAN generate threads (Prince's business accounts)
  const allowedHandles = ['@princediwakar25', 'princediwakar25'];
  return allowedHandles.includes(handle) || allowedHandles.includes(handle.replace('@', ''));
}

const threadGenerationService = {
  generateThread,
  canGenerateThreads
};

export default threadGenerationService;