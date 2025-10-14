import OpenAI from 'openai';
import { createThread, saveTweet, generateTweetId, updateThread } from './db';
import { accountService } from './accountService';
import type { Account, Tweet } from './types';
import { logger } from '@/lib/logger';
import { BusinessStorytellerGenerator } from './generation/personas/businessStoryteller';
import { CricketStorytellerGenerator } from './generation/personas/cricketStoryteller';
import { BasePersonaGenerator } from './generation/personas/base';
import type { GenerationContext, TweetGenerationConfig } from './generation/types';

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// --- TYPE DEFINITIONS ---

export interface ThreadGenerationConfig {
  account_id: string;
  persona: string;
  rssContext?: string;
}

export interface ThreadGenerationResult {
  thread_id: string;
  total_tweets: number;
  tweets: Tweet[];
  story_category: string;
  sourceUrl?: string;
}

// Defines the shape of the data objects parsed from the NDJSON stream
type StreamedData = 
  | { type: 'metadata'; title: string; story_category: string; hashtags: string[] }
  | { type: 'tweet'; sequence: number; content: string }
  | { type: 'end'; total_tweets: number };


// --- HELPER FUNCTIONS ---

function parseSourceUrlFromContext(rssContext?: string): string | undefined {
    if (!rssContext) return undefined;
    const match = rssContext.match(/Source URL \(for context\): (https?:\/\/\S+)/m);
    return match ? match[1].trim() : undefined;
}

/**
 * Main thread generation function with STREAMING PARSING.
 * This version has been refactored to use the specific prompt logic
 * from the persona generator classes, ensuring consistency and quality.
 */
export async function generateThread(config: ThreadGenerationConfig): Promise<ThreadGenerationResult | null> {
  const startTime = performance.now();
  const callId = Math.random().toString(36).substring(2, 8); 

  try {
    logger.info(`[Thread:${callId}] Starting thread generation for account: ${config.account_id}, persona: ${config.persona}`, 'thread-start');
    
    const account = await accountService.getAccount(config.account_id);
    if (!account) throw new Error(`Account not found: ${config.account_id}`);
    
    // --- DYNAMIC PERSONA PROMPT GENERATION (FIX) ---
    // We instantiate the correct persona generator class to get the right prompt.
    let personaGenerator: BasePersonaGenerator;
    if (config.persona === 'business_storyteller') {
      personaGenerator = new BusinessStorytellerGenerator();
    } else if (config.persona === 'cricket_storyteller') {
      personaGenerator = new CricketStorytellerGenerator();
    } else {
      throw new Error(`Persona "${config.persona}" does not have a thread generator.`);
    }

    const markers = {
        timeMarker: `T${Date.now()}`,
        tokenMarker: `TK${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
    
    // FIX: Add the missing 'account' and 'useRSSSource' properties to satisfy the GenerationContext type.
    const generationContext: GenerationContext = { 
      rssContext: config.rssContext || '',
      account: account,
      useRSSSources: !!config.rssContext
    };
    
    // This now correctly uses the highly-tuned prompt from the persona file.
    const prompt = personaGenerator.generatePrompt({} as TweetGenerationConfig, generationContext, markers);
    
    logger.info(`[Thread:${callId}] Sending thread generation request to DeepSeek (prompt length: ${prompt.length} chars)`, 'thread-llm-call');
    
    const llmCallStart = performance.now();
    const stream = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2500, // Increased to accommodate longer threads reliably
      stream: true,
    });

    let buffer = '';
    let metadata: { title: string; story_category: string; hashtags: string[] } | null = null;
    const savedTweets: Tweet[] = [];
    const dbWritePromises: Promise<void>[] = [];
    let threadId: string | null = null;

    for await (const chunk of stream) {
      buffer += chunk.choices[0]?.delta?.content || '';
      
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.substring(0, newlineIndex).trim();
        buffer = buffer.substring(newlineIndex + 1);

        if (line.length === 0) continue;

        try {
          const data: StreamedData = JSON.parse(line);

          if (data.type === 'metadata' && !threadId) {
            metadata = data;
            logger.info(`[Thread:${callId}] Parsed metadata: "${metadata.title}"`, 'thread-stream-parse');
            
            threadId = await createThread({
              account_id: config.account_id,
              title: metadata.title,
              persona: config.persona,
              total_tweets: 0,
              status: 'generating',
              story_category: metadata.story_category,
            });

          } else if (data.type === 'tweet' && metadata && threadId) {
            const tweet: Tweet = {
              id: generateTweetId(),
              account_id: config.account_id,
              content: data.content,
              hashtags: metadata.hashtags.map(tag => `#${tag.replace(/^#+/, '').trim()}`).filter(Boolean),
              persona: config.persona,
              status: 'ready',
              created_at: new Date().toISOString(),
              thread_id: threadId,
              thread_sequence: data.sequence,
              content_type: 'thread',
              source_url: data.sequence === 1 ? parseSourceUrlFromContext(config.rssContext) : undefined,
            };
            
            savedTweets.push(tweet);
            dbWritePromises.push(saveTweet(tweet));
            logger.info(`[Thread:${callId}] Parsed and queued Tweet #${data.sequence} for saving`, 'thread-stream-parse');

          } else if (data.type === 'end') {
             logger.info(`[Thread:${callId}] Stream end signal received. Total tweets: ${data.total_tweets}`, 'thread-stream-end');
          }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`[Thread:${callId}] Failed to parse a line from stream: "${line}"`, 'thread-stream-error', { error: errorMessage });
        }
      }
    }
    const llmCallDuration = ((performance.now() - llmCallStart) / 1000).toFixed(2);
    logger.info(`[Thread:${callId}] DeepSeek LLM stream finished. Duration: ${llmCallDuration}s`, 'thread-timing');

    if (!threadId || !metadata) {
      throw new Error("Metadata or threadId was not received/created from the stream.");
    }

    const dbWriteStart = performance.now();
    await Promise.all(dbWritePromises);
    const dbWriteDuration = ((performance.now() - dbWriteStart) / 1000).toFixed(2);
    logger.info(`[Thread:${callId}] All concurrent DB writes complete in: ${dbWriteDuration}s`, 'thread-timing');
    
    await updateThread(threadId, { status: 'ready', total_tweets: savedTweets.length });
    logger.info(`[Thread:${callId}] Finalized thread record in DB.`, 'thread-db-update');

    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    logger.info(`[Thread:${callId}] Thread generation complete. Total duration: ${totalDuration}s`, 'thread-complete', {
        total_duration_s: parseFloat(totalDuration),
        llm_duration_s: parseFloat(llmCallDuration),
        total_tweets: savedTweets.length
    });

    return {
      thread_id: threadId,
      total_tweets: savedTweets.length,
      tweets: savedTweets.sort((a, b) => (a.thread_sequence || 0) - (b.thread_sequence || 0)),
      story_category: metadata.story_category, 
      sourceUrl: parseSourceUrlFromContext(config.rssContext),
    };

  } catch (error) {
    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Thread:${callId}] ❌ Thread generation failed after ${totalDuration}s:`, 'thread-failure', { error: errorMessage });
    return null;
  }
}

/**
 * Get thread generation eligibility for account
 */
export function canGenerateThreads(account: Account): boolean {
  const handle = account.twitter_handle.toLowerCase();
  
  const excludedHandles = ['@gibbi_ai', 'gibbi_ai'];
  if (excludedHandles.includes(handle) || excludedHandles.includes(handle.replace('@', ''))) {
    return false;
  }
  
  const allowedHandles = ['@princediwakar25', 'princediwakar25'];
  return allowedHandles.includes(handle) || allowedHandles.includes(handle.replace('@', ''));
}

const threadGenerationService = {
  generateThread,
  canGenerateThreads
};

export default threadGenerationService;

