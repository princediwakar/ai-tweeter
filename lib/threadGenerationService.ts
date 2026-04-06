import OpenAI from 'openai';
import { createThread, saveTweet, generateTweetId, updateThread } from './db';
import { accountService } from './accountService';
import type { Account, Tweet } from './types';
import { logger } from '@/lib/logger';
import { getPersonaByKey, getAllPersonas } from '@/lib/personas';
import { getPersonaGenerator, BasePersonaGenerator } from './generation/personas';
import type { GenerationContext, TweetGenerationConfig } from './generation/types';
import { GENERATION_CONFIG } from './generation/config';


// Lazy initialization of the client with thread-safe pattern
let deepseekClientInstance: OpenAI | null = null;
let clientInitPromise: Promise<OpenAI> | null = null;

async function getDeepseekClientAsync(): Promise<OpenAI> {
  if (deepseekClientInstance) {
    return deepseekClientInstance;
  }
  
  // Prevent multiple initialization attempts
  if (!clientInitPromise) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY is not defined in environment variables");
    }
    clientInitPromise = (async () => {
      deepseekClientInstance = new OpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com",
      });
      return deepseekClientInstance;
    })();
  }
  
  return clientInitPromise;
}

// --- TYPE DEFINITIONS ---

export interface ThreadGenerationConfig {
  connected_account_id: string;
  account_id?: string; // Deprecated - use connected_account_id
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
    const accountId = config.connected_account_id || config.account_id;
    logger.info(`[Thread:${callId}] Starting thread generation for account: ${accountId}, persona: ${config.persona}`, 'thread-start');
    
    const account = await accountService.getAccount(accountId!) as any;
    if (!account) throw new Error(`Account not found: ${accountId}`);
    
    // --- DYNAMIC PERSONA PROMPT GENERATION (FIXED) ---
    // We fetch the full persona from DB and use the dynamic generator.
    const persona = await getPersonaByKey(config.persona);
    if (!persona) {
      throw new Error(`Persona "${config.persona}" not found in database.`);
    }

    const personaGenerator = getPersonaGenerator(persona);

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
    const client = await getDeepseekClientAsync();
    const stream = await client.chat.completions.create({
      model: GENERATION_CONFIG.ai.model,
      messages: [{ role: "user", content: prompt }],
      temperature: GENERATION_CONFIG.ai.temperature,
      max_tokens: GENERATION_CONFIG.ai.maxTokens,
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
              connected_account_id: config.connected_account_id || config.account_id!,
              title: metadata.title,
              persona: config.persona,
              total_tweets: 0,
              status: 'generating',
              story_category: metadata.story_category,
            });

          } else if (data.type === 'tweet' && metadata && threadId) {
            const tweet: Tweet = {
              id: generateTweetId(),
              connected_account_id: config.connected_account_id || config.account_id!,
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
export async function canGenerateThreads(account: Account): Promise<boolean> {
  const branding = account.branding as Record<string, unknown> | undefined;
  const supportsThreads = branding?.supports_threads;
  
  if (supportsThreads !== undefined && supportsThreads !== null) {
    return Boolean(supportsThreads);
  }
  
  const allPersonas = await getAllPersonas();
  const pConfig = allPersonas.map(p => p.config as Record<string, unknown> || {});
  const threadPersonas = pConfig.filter(c => c.supports_threads).map((_, i) => allPersonas[i].key);
  
  if (threadPersonas.length === 0) {
    return false;
  }
  
  const hasThreadPersona = account.personas?.some(p => threadPersonas.includes(p));
  return hasThreadPersona || false;
}

const threadGenerationService = {
  generateThread,
  canGenerateThreads
};

export default threadGenerationService;

