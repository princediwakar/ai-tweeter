// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const maxDuration = 300; // 5-minute Vercel limit

import { generateTweet } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { saveTweet, generateTweetId, getTweetsByAccount } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { logger } from '@/lib/logger';
import { getGenerationBatchInfo } from '@/lib/schedule';
import { TweetGenerationConfig, ThreadGenerationResult, Tweet } from '@/lib/types';
import { getPersonaByKey, getAllPersonas } from '@/lib/personas';
import { sql } from '@vercel/postgres';

interface GeneratedTweetInfo {
  persona: string;
  contentType: string;
  length: number;
  sourceUrl?: string;
}

type GenerationResultUnion =
  { type: 'tweet'; data: GeneratedTweetInfo; needsImage: boolean } |
  { type: 'thread'; data: ThreadGenerationResult };

type AccountGenerationResult = {
  success: boolean;
  message: string;
  accountId: string;
  accountName: string;
  generated?: {
    single_tweets: number;
    threads: number;
    total_content_units: number;
  };
};

async function saveDebugOutput(data: { content: string | string[]; persona: string; source?: string; created_at: string }) {
  try {
    const debugDir = path.join(process.cwd(), 'debug-tweets');
    await fs.mkdir(debugDir, { recursive: true });

    const filePath = path.join(debugDir, 'debug-output.log'); 

    const contentString = Array.isArray(data.content)
      ? data.content.join('\n  -> ') 
      : data.content;
    
    const sanitizedContent = contentString.replace(/"/g, '\\"');
    const lineToAppend = `"${sanitizedContent}"\n\n`;

    await fs.appendFile(filePath, lineToAppend, 'utf-8');
    logger.info(`[Debug] Appended generation output to ${filePath}`, 'save-debug-output');
  } catch (error) {
    logger.error('[Debug] Failed to save debug output file', 'save-debug-output-error', error as Error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('connected_account_id') || searchParams.get('account_id');
    const twitterHandle = searchParams.get('twitter_handle');
    const debugMode = searchParams.get('debug') === 'true';
    const personaOverride = searchParams.get('persona');

    if (accountId) {
      const result = await generateForAccountEnhanced(accountId, request, debugMode, personaOverride);
      return result;
    }

    if (twitterHandle) {
      const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
      if (!account) {
        return NextResponse.json({ error: `Account not found for handle: ${twitterHandle}` }, { status: 404 });
      }
      const result = await generateForAccountEnhanced(account.id, request, debugMode, personaOverride);
      return result;
    }

    const result = await generateForAllAccountsEnhanced(request, debugMode);
    return result;

  } catch (error) {
    logger.error('Enhanced generation failed', 'generate', error as Error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start enhanced generation',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function generateForAccountEnhanced(accountId: string, request: NextRequest, debugMode = false, personaOverride?: string | null) {
  const startTime = performance.now(); 
  const callId = Math.random().toString(36).substring(2, 8);

  logger.info(`[Enhanced:${callId}] Starting generation for account ${accountId}`, 'generate-enhanced', { timestamp: new Date().toISOString() });

  const account = await connectedAccountsService.getById(accountId) as any;
  if (!account) {
    return NextResponse.json({ success: false, error: `Account ${accountId} not found` }, { status: 404 });
  }

  const batchInfo = await getGenerationBatchInfo(account.account_username || account.twitter_handle, debugMode);

  if (debugMode && personaOverride) {
    batchInfo.generation_personas = [personaOverride];
  }

  if (!batchInfo.should_generate && !debugMode) {
    logger.info(`[Enhanced:${callId}] Skipped: ${batchInfo.reason}`, 'generate-skip');
    return NextResponse.json({
      success: true, message: `⏳ No generation scheduled.`, accountId, batchInfo
    });
  }

  if (account.status !== 'active') {
    return NextResponse.json({ success: false, error: `Account inactive` }, { status: 404 });
  }

  const accountTweets = await getTweetsByAccount(accountId);
  const pendingTweets = accountTweets.filter(t => t.status !== 'posted' && t.status !== 'failed');

  const maxPipelineSize = account.branding?.max_pipeline_size || 30;
  const canThreads = await canGenerateThreads(account);
  const supportsThreading = account.branding?.supports_threads ?? canThreads;

  if (pendingTweets.length >= maxPipelineSize) {
    return NextResponse.json({
      success: true, message: `✅ Pipeline healthy.`, generated: 0
    });
  }

  let targetBatchSize = Math.min(batchInfo.batch_size || 1, maxPipelineSize - pendingTweets.length);
  const selectedPersonaKey = batchInfo.generation_personas[0];
  
  if (!selectedPersonaKey) {
    return NextResponse.json({ success: false, error: 'No persona available.' }, { status: 400 });
  }

  const persona = await getPersonaByKey(selectedPersonaKey);
  const personaDbId = persona?.id; 
  const scheduleId = batchInfo.schedule_ids?.[0]; 
  const allPersonas = await getAllPersonas();
  const threadPersonas = allPersonas.filter(p => (p.config as any)?.supports_threads).map(p => p.key);
  
  // Boolean just checks if the persona *is capable* of threads
  const personaSupportsThreads = supportsThreading && threadPersonas.includes(selectedPersonaKey);

  const generatedTweets: GeneratedTweetInfo[] = [];
  const generatedThreads: ThreadGenerationResult[] = [];
  const errors: string[] = [];
  let imageIsNeeded = false;

  const contentTypes = ['single_tweet', 'thread'];
  
  const generationPromises = Array.from({ length: targetBatchSize }, async (_, i): Promise<GenerationResultUnion> => {
    if (!persona) throw new Error(`Persona ${selectedPersonaKey} not found`);

    // FIX #2 IMPLEMENTED: Randomize the content type BEFORE deciding to run thread generation
    let selectedContentType = 'single_tweet';
    
    if (personaSupportsThreads) {
        // 80% chance for a single tweet, 20% chance for a thread
        const threadProbability = 0.20; 
        selectedContentType = Math.random() < threadProbability ? 'thread' : 'single_tweet';
    }

    if (selectedContentType === 'thread') {
      const { getDynamicContext } = await import('@/lib/contentSource');
      const sourceContext = await getDynamicContext(selectedPersonaKey, '', accountId, selectedPersonaKey);

      const threadResult = await generateThread({
        connected_account_id: accountId,
        persona: selectedPersonaKey,
        sourceContext
      });

      if (threadResult) {
        if (debugMode) {
          await saveDebugOutput({ content: threadResult.tweets.map(t => t.content), persona: selectedPersonaKey, source: threadResult.sourceUrl, created_at: new Date().toISOString() });
        }
        return { type: 'thread', data: threadResult };
      } else {
         // Fallback if thread generation silently fails
         selectedContentType = 'single_tweet';
      }
    }

    // Generate Single Tweet
    const { getDynamicContext } = await import('@/lib/contentSource');
    const sourceContext = await getDynamicContext(selectedPersonaKey, selectedContentType, accountId, selectedPersonaKey);

    const config: TweetGenerationConfig = {
      persona: selectedPersonaKey,
      connected_account_id: accountId,
      topic: selectedContentType,
      sourceContext: sourceContext 
    };

    const enhancedTweet = await generateTweet(config);
    if (!enhancedTweet) throw new Error(`Tweet generation returned null`);

    const tweetId = generateTweetId();
    const tweetToSave: Tweet = {
      id: tweetId,
      connected_account_id: accountId,
      persona_id: personaDbId,
      persona: selectedPersonaKey,
      schedule_id: scheduleId,
      content: enhancedTweet.content,
      status: 'ready', 
      content_type: 'single_tweet', 
      hashtags: enhancedTweet.hashtags || [],
      image_url: enhancedTweet.imageUrl,
      image_status: enhancedTweet.imageStatus || 'none',
      card_data: enhancedTweet.cardData ? JSON.stringify(enhancedTweet.cardData) : undefined,
      source_url: enhancedTweet.sourceUrl, 
      created_at: new Date().toISOString()
    };
    
    await saveTweet(tweetToSave);

    if (debugMode) {
      await saveDebugOutput({ content: enhancedTweet.content, persona: selectedPersonaKey, source: enhancedTweet.sourceUrl, created_at: new Date().toISOString() });
    }

    return {
      type: 'tweet',
      data: { persona: selectedPersonaKey, contentType: enhancedTweet.contentType, length: enhancedTweet.content.length, sourceUrl: enhancedTweet.sourceUrl },
      needsImage: enhancedTweet.imageStatus === 'pending'
    };
  });

  const results = await Promise.allSettled(generationPromises);

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value.type === 'tweet') {
        generatedTweets.push(result.value.data);
        if (result.value.needsImage) imageIsNeeded = true;
      } else if (result.value.type === 'thread') {
        generatedThreads.push(result.value.data);
      }
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  });

  return NextResponse.json({
    success: errors.length < targetBatchSize,
    message: `Complete. ${generatedTweets.length} tweets, ${generatedThreads.length} threads.`,
    accountId,
    batchInfo,
    generated: { single_tweets: generatedTweets.length, threads: generatedThreads.length, total_content_units: generatedTweets.length + generatedThreads.length },
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString()
  }, { status: 200 });
} 

async function generateForAllAccountsEnhanced(request: NextRequest, debugMode = false) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  
  const accountsWithSchedules = await sql`
    WITH current_local AS (
      SELECT 
        a.id, a.name, a.account_username as twitter_handle, a.platform, a.personas, a.branding,
        s.start_time, s.days_of_week,
        (EXTRACT(HOUR FROM timezone(COALESCE(s.timezone, 'UTC'), NOW())) * 60 + EXTRACT(MINUTE FROM timezone(COALESCE(s.timezone, 'UTC'), NOW()))) as local_minutes,
        EXTRACT(ISODOW FROM timezone(COALESCE(s.timezone, 'UTC'), NOW())) as local_dow
      FROM connected_accounts a
      JOIN account_schedules s ON s.connected_account_id = a.id
      WHERE a.is_active = true AND s.is_active = true
    )
    SELECT id, name, twitter_handle, platform, personas, branding
    FROM current_local
    WHERE local_dow = ANY(days_of_week)
      AND (
        (start_time - local_minutes + 1440) % 1440 <= 60 
        OR 
        (local_minutes - start_time + 1440) % 1440 <= 60  
      )
    GROUP BY id, name, twitter_handle, platform, personas, branding
    LIMIT 100
  `;

  if (accountsWithSchedules.rows.length === 0) {
    return NextResponse.json({ success: true, message: 'No accounts due.' });
  }

  // Force awaiting for Vercel limits
  const results = [];
  for (const account of accountsWithSchedules.rows) {
      try {
          const res = await generateForAccountEnhanced(account.id, request, debugMode);
          results.push(await res.json());
      } catch (error) {
          results.push({ accountId: account.id, success: false, message: error instanceof Error ? error.message : String(error) });
      }
  }

  const totalGenerated = results.reduce((sum, r) => sum + (r.generated?.total_content_units || 0), 0);
  
  return NextResponse.json({
    success: true,
    message: `Multi-account complete: ${totalGenerated} units generated.`,
    sessionId,
    totalAccounts: accountsWithSchedules.rows.length,
    totalGenerated,
    results,
    timestamp: new Date().toISOString()
  }, { status: 200 });
}