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
 * Select appropriate thread template for business storyteller persona
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
 */
function generateThreadPrompt(template: ThreadTemplate, persona?: PersonaConfig): string {
  const timeMarker = `T${Date.now()}`;
  const tokenMarker = `TK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const diversityMarker = `D${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
  
  // Add variation instructions based on persona type
  let variationPrompts: string[];
  let storyContext: string;
  let storyRequirements: string;
  let contextualElements: string;
  
  if (persona?.key === 'cricket_storyteller') {
    variationPrompts = [
      "Focus on a lesser-known cricket moment that revealed character",
      "Tell a story about pressure and how a cricketer handled it",
      "Share a comeback story from cricket history",
      "Explore a rivalry that went beyond the game",
      "Highlight a career-defining moment with life lessons",
      "Discuss a cricket personality who transcended the sport"
    ];
    
    storyContext = `You are an expert cricket storyteller creating compelling Twitter threads that use cricket as a backdrop to explore human nature, character, and life lessons.`;
    
    storyRequirements = `STORY REQUIREMENTS:
• Focus on authentic cricket stories (international, domestic, historical moments)
• Include emotional elements - human struggles, pressure moments, character revelations
• Provide psychological insights and universal life lessons
• Use specific match details, scores, and outcomes when possible
• Connect cricket situations to broader human themes of resilience, pressure, and growth
• Each tweet should be engaging standalone while advancing the narrative
• IMPORTANT: Use Twitter handles (@username) instead of names when mentioning players, teams, or cricket personalities`;

    contextualElements = `CRICKET STORYTELLING CONTEXT:
• Draw from rich cricket history - from legendary matches to personal battles
• Include human elements - how cricket moments revealed true character
• Reference iconic cricket personalities and their psychological journeys
• Highlight cricket as a mirror for human nature - pressure, rivalry, friendship, leadership
• Connect with universal themes that non-cricket fans can relate to
• Focus on entertainment value and larger-than-life personalities who transcended cricket`;

  } else {
    // Default to business storytelling
    variationPrompts = [
      "Focus on a lesser-known regional business story",
      "Tell a story from the startup ecosystem (2010-2024)",
      "Share a family business transition story", 
      "Explore a crisis management story",
      "Highlight an unexpected business pivot",
      "Discuss a cultural adaptation success"
    ];
    
    storyContext = `You are an expert Indian business storyteller creating compelling Twitter threads about authentic business stories with emotional depth and strategic insights.`;
    
    storyRequirements = `STORY REQUIREMENTS:
• Focus on authentic Indian business stories (newer startups, older companies, enterprises, NGOs, family businesses, etc.)
• Provide strategic business insights and universal lessons
• Use specific numbers, dates, and concrete details when possible
• Connect historical context with modern business principles
• Each tweet should be engaging standalone while advancing the narrative
• Include simile/metaphor/alliteration/personification or nine emotions (navras) 
• IMPORTANT: Use Twitter handles (@username) instead of names when mentioning people, companies, or organizations`;

    contextualElements = `INDIAN BUSINESS CONTEXT:
• Draw from rich Indian business history - from independence era to modern startups
• Include cultural elements - family business dynamics, traditional vs modern approaches
• Reference iconic Indian business leaders and their decision-making patterns
• Highlight uniquely Indian business concepts like 'Jugaad', family succession, regulatory challenges
• Connect with current Indian startup ecosystem and unicorn stories`;
  }
  
  const selectedVariation = variationPrompts[Math.floor(Math.random() * variationPrompts.length)];

  return `${storyContext}

UNIQUENESS INSTRUCTION: ${selectedVariation}

THREAD TEMPLATE: "${template.displayName}"

STORY BRIEF: ${template.story_prompt}

CREATIVE FREEDOM:
• Find and weave a compelling, authentic story
• Use your knowledge to discover interesting, lesser-known stories or fresh angles
• Focus on emotional depth and meaningful insights
• Each thread should be completely unique and original

${storyRequirements}

${contextualElements}

CONTENT APPROACH:
• Start with an engaging hook
• Tell the story with natural flow and pacing
• Include human elements and emotional depth
• Use conversational storytelling tone
• Include specific, memorable details

THREADING FORMAT - BE NATURALLY HUMAN:
• Mix varied thread indicators: "1/7 🧵",  "3/", "6/7", or NO indicators on obvious continuations
• Use conversational transitions instead: "But here's the twist...", "The real lesson?", "Here's what happened next:", "The problem?"
• Place indicators naturally - either at start OR end of tweets, NEVER mid-sentence
• Keep language simple, conversational, readable - avoid perfect embellishment or corporate speak
• Sound like a real person telling a story, not an AI generating content

CHARACTER LIMITS - CRITICAL:
• EACH TWEET MUST BE STRICTLY UNDER 260 CHARACTERS (including thread indicators)
• This leaves 20 characters buffer for hashtags
• Thread indicators are included in your content - count them in character limit
• If content exceeds 280 characters, BREAK IT INTO TWO TWEETS instead
• Count characters carefully - Twitter rejects tweets over 280 characters
• Shorter tweets are better for engagement - aim for 180-240 characters per tweet

FORBIDDEN:
• Generic business advice without specific story
• Western business examples (focus on Indian context)
• Overly promotional tone
• Facts without emotional connection
• Stories that are too well-known (find lesser-known angles)

Generate a complete thread with optimal length for your story. Return ONLY valid JSON with this exact format:

{
  "title": "Thread title",
  "story_category": "${template.name}",
  "hashtags": ["Relevant hashtags for your specific story"],
  "tweets": [
    {
      "sequence": 1,
      "content": "Tweet 1 content"
    },
    {
      "sequence": 2,
      "content": "Tweet 2 content"
    }
    // ... continue for all tweets in your thread
  ]
}

Create hashtags that are authentic and specific to your story content. Avoid generic business hashtags.

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