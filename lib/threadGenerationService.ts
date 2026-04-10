// lib/threadGenerationService.ts
import OpenAI from 'openai';
import { createThread, savePost, generatePostId, updateThread, sqlWithRetry } from './db';
import { connectedAccountsService } from './connectedAccounts';
import { logger } from '@/lib/logger';
import { GENERATION_CONFIG } from './generation/config';

import { getPersonaByKey, getAllPersonas } from '@/lib/personas'; 
import type { ConnectedAccount, Post } from './types';
import type { GenerationContext } from './generation/types';
import { buildGenerationContext } from './generation/ContextBuilder';
import { promptEngine } from './generation/PromptEngine';

// ... (Client Init Logic)
let deepseekClientInstance: OpenAI | null = null;
let clientInitPromise: Promise<OpenAI> | null = null;

async function getDeepseekClientAsync(): Promise<OpenAI> {
  if (deepseekClientInstance) return deepseekClientInstance;
  if (!clientInitPromise) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY environment variable missing");
    clientInitPromise = (async () => {
      deepseekClientInstance = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
      return deepseekClientInstance;
    })();
  }
  return clientInitPromise;
}

export interface ThreadGenerationConfig {
  connected_account_id: string;
  persona: string;
  sourceContext?: string;
}

export interface ThreadGenerationResult {
  thread_id: string;
  total_tweets: number;
  posts: Post[];
  story_category: string;
  sourceUrl?: string;
}

type StreamedData = 
  | { type: 'metadata'; title: string; story_category: string; hashtags: string[] }
  | { type: 'tweet'; sequence: number; content: string }
  | { type: 'end'; total_tweets: number };

function parseSourceUrlFromContext(sourceContext?: string): string | undefined {
    if (!sourceContext) return undefined;
    const match = sourceContext.match(/Source URL \(for context\): (https?:\/\/\S+)/m);
    return match ? match[1].trim() : undefined;
}

/**
 * Main thread generation function
 */
export async function generateThread(config: ThreadGenerationConfig): Promise<ThreadGenerationResult | null> {
  const callId = Math.random().toString(36).substring(2, 8); 

  try {
    const accountId = config.connected_account_id;
    
    // Use ContextBuilder to resolve persona and account
    const context = await buildGenerationContext({
      connected_account_id: accountId,
      persona: config.persona,
      sourceContext: config.sourceContext,
    });
    
    if (!context.account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    // Use PromptEngine to build thread prompt
    const promptResult = promptEngine.build({
      persona: context.persona,
      dataContext: context.dataContext,
      formatRules: context.formatRules,
      options: {
        isThread: true,
        threadCount: 5,
        usedSourceUrls: undefined,
      },
    });
    
    const client = await getDeepseekClientAsync();
    const stream = await client.chat.completions.create({
      model: GENERATION_CONFIG.ai.model,
      messages: [{ role: "user", content: promptResult.prompt }],
      temperature: GENERATION_CONFIG.ai.temperature,
      stream: true,
    });

    let buffer = '';
    let metadata: { title: string; story_category: string; hashtags: string[] } | null = null;
    const savedPosts: Post[] = [];
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
            threadId = await createThread({
              connected_account_id: accountId,
              title: metadata.title,
              persona: config.persona,
              total_tweets: 0,
              status: 'generating',
              story_category: metadata.story_category,
            });
          } else if (data.type === 'tweet' && metadata && threadId) {
            const post: Post = {
              id: generatePostId(),
              connected_account_id: accountId,
              content: data.content,
              hashtags: metadata.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`),
              persona: config.persona,
              status: 'ready',
              created_at: new Date(),
              thread_id: threadId,
              thread_sequence: data.sequence,
              content_type: 'thread',
              source_url: data.sequence === 1 ? parseSourceUrlFromContext(config.sourceContext) : undefined,
            };
            savedPosts.push(post);
            dbWritePromises.push(savePost(post));
          }
        } catch (e) { /* partial line handling */ }
      }
    }

    if (!threadId || !metadata) throw new Error("Thread generation failed.");

    await Promise.all(dbWritePromises);
    await updateThread(threadId, { status: 'ready', total_tweets: savedPosts.length });

    return {
      thread_id: threadId,
      total_tweets: savedPosts.length,
      posts: savedPosts.sort((a, b) => (a.thread_sequence || 0) - (b.thread_sequence || 0)),
      story_category: metadata.story_category, 
      sourceUrl: parseSourceUrlFromContext(config.sourceContext),
    };

  } catch (error) {
    logger.error(`[Thread:${callId}] Generation Error`, 'thread-failure', error as Error);
    return null;
  }
}

/**
 * Check thread eligibility
 */
export async function canGenerateThreads(accountId: string): Promise<boolean> {
  const allPersonas = await getAllPersonas();
  const threadPersonas = allPersonas
    .filter(p => (p.config as any)?.supports_threads)
    .map(p => p.key);
  
  if (threadPersonas.length === 0) return false;
  
  const accountPersonas = await getPersonasForAccount(accountId);
  return accountPersonas.some(p => threadPersonas.includes(p.key));
}

async function getPersonasForAccount(accountId: string): Promise<{ key: string }[]> {
  const { rows } = await sqlWithRetry`
    SELECT key FROM personas
    WHERE connected_account_id = ${accountId} AND is_active = true
  `;
  return rows as { key: string }[];
}