// app/api/generate/route.ts
import { NextRequest, NextResponse, after } from 'next/server';
import { promises as fs } from 'fs';

export const maxDuration = 300; // Extend Vercel limit for background execution
import path from 'path';

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
      if (debugMode) {
        return await generateForAccountEnhanced(accountId, request, debugMode, personaOverride);
      }
      after(async () => {
        await generateForAccountEnhanced(accountId, request, debugMode, personaOverride);
      });
      return NextResponse.json({ success: true, message: `Async generation started for account ${accountId}` }, { status: 202 });
    }

    if (twitterHandle) {
      const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
      if (!account) {
        return NextResponse.json({
          error: `Account not found for Twitter handle: ${twitterHandle}`
        }, { status: 404 });
      }
      if (debugMode) {
        return await generateForAccountEnhanced(account.id, request, debugMode, personaOverride);
      }
      after(async () => {
        await generateForAccountEnhanced(account.id, request, debugMode, personaOverride);
      });
      return NextResponse.json({ success: true, message: `Async generation started for handle ${twitterHandle}` }, { status: 202 });
    }

    if (debugMode) {
      return await generateForAllAccountsEnhanced(request, debugMode);
    }
    
    after(async () => {
      await generateForAllAccountsEnhanced(request, debugMode);
    });
    return NextResponse.json({ success: true, message: "Async multi-account generation started" }, { status: 202 });

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
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} not found`
    }, { status: 404 });
  }

  const batchInfo = await getGenerationBatchInfo(account.account_username || account.twitter_handle, debugMode);

  if (debugMode && personaOverride) {
    batchInfo.generation_personas = [personaOverride];
    logger.info(`[Enhanced:${callId}] Debug mode: overriding persona to ${personaOverride}`, 'generate-debug');
  }

  if (!batchInfo.should_generate && !debugMode) {
    logger.info(`[Enhanced:${callId}] Generation skipped by schedule. Time elapsed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`, 'generate-skip');
    return NextResponse.json({
      success: true,
      message: `⏳ No generation scheduled for account ${accountId} at this time.`,
      accountId,
      batchInfo,
      timestamp: new Date().toISOString()
    });
  }

  if (account.status !== 'active') {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} is inactive`
    }, { status: 404 });
  }

  const dbReadStart = performance.now();
  const accountTweets = await getTweetsByAccount(accountId);
  const pendingTweets = accountTweets.filter(t => t.status !== 'posted' && t.status !== 'failed');
  logger.info(`[Enhanced:${callId}] DB read time: ${((performance.now() - dbReadStart) / 1000).toFixed(2)}s. Pending tweets: ${pendingTweets.length}`, 'generate-timing');

  const maxPipelineSize = account.branding?.max_pipeline_size || 30;
  const canThreads = await canGenerateThreads(account);
  const supportsThreading = account.branding?.supports_threads ?? canThreads;

  if (pendingTweets.length >= maxPipelineSize) {
    return NextResponse.json({
      success: true,
      message: `✅ Account pipeline is healthy with ${pendingTweets.length} tweets. No generation needed.`,
      accountId,
      currentPipeline: pendingTweets.length,
      maxPipeline: maxPipelineSize,
      batchInfo,
      generated: 0,
      timestamp: new Date().toISOString()
    });
  }

  let targetBatchSize = Math.min(batchInfo.batch_size || 5, maxPipelineSize - pendingTweets.length);
  const selectedPersonaKey = batchInfo.generation_personas[0];
  
  if (!selectedPersonaKey) {
    return NextResponse.json({
      success: false,
      error: 'No persona available for generation.'
    }, { status: 400 });
  }

  const persona = await getPersonaByKey(selectedPersonaKey);
  const allPersonas = await getAllPersonas();
  const threadPersonas = allPersonas.filter(p => p.config?.supports_threads).map(p => p.key);
  const shouldGenerateThreads = supportsThreading && threadPersonas.includes(selectedPersonaKey);

  if (shouldGenerateThreads) {
    targetBatchSize = 1; 
  }

  if (targetBatchSize <= 0) {
    return NextResponse.json({
      success: true,
      message: `✅ Account pipeline is healthy. No new tweets needed at this time.`,
      generated: 0,
    });
  }

  const generatedTweets: GeneratedTweetInfo[] = [];
  const generatedThreads: ThreadGenerationResult[] = [];
  const errors: string[] = [];
  let imageIsNeeded = false;

  const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];
  const generationStart = performance.now();
  
  const generationPromises = Array.from({ length: targetBatchSize }, async (_, i): Promise<GenerationResultUnion> => {
    if (!persona) throw new Error(`Persona ${selectedPersonaKey} not found`);

    if (shouldGenerateThreads) {
      const { getDynamicContext } = await import('@/lib/contentSource');
      const rssContext = await getDynamicContext(selectedPersonaKey, '', accountId, selectedPersonaKey);

      const threadResult = await generateThread({
        connected_account_id: accountId,
        persona: selectedPersonaKey,
        rssContext
      });

      if (threadResult) {
        if (debugMode) {
          await saveDebugOutput({
            content: threadResult.tweets.map(t => t.content),
            persona: selectedPersonaKey,
            source: threadResult.sourceUrl,
            created_at: new Date().toISOString()
          });
        }
        return { type: 'thread', data: threadResult };
      } else {
        throw new Error(`Thread generation failed for persona ${selectedPersonaKey}`);
      }
    }

    const config: TweetGenerationConfig = {
      account_id: accountId,
      persona: selectedPersonaKey,
      contentType: contentTypes[(new Date().getHours() + i) % contentTypes.length] as TweetGenerationConfig['contentType']
    };

    const generatedTweet = await generateTweet(config);
    if (!generatedTweet) throw new Error(`Failed to generate tweet`);

    const tweet: Partial<Tweet> = {
      id: generateTweetId(),
      connected_account_id: accountId,
      content: generatedTweet.content,
      hashtags: generatedTweet.hashtags,
      persona: generatedTweet.persona,
      status: 'ready',
      created_at: new Date().toISOString(),
      content_type: 'single_tweet',
      image_url: generatedTweet.imageUrl,
      image_status: generatedTweet.imageStatus || 'none',
      card_data: generatedTweet.cardData ? JSON.stringify(generatedTweet.cardData) : undefined,
      source_url: generatedTweet.sourceUrl,
    };

    await saveTweet(tweet as Tweet);

    if (debugMode) {
      await saveDebugOutput({
        content: generatedTweet.content,
        persona: selectedPersonaKey,
        source: generatedTweet.sourceUrl,
        created_at: tweet.created_at!
      });
    }

    return {
      type: 'tweet',
      data: {
        persona: selectedPersonaKey,
        contentType: config.contentType || 'unknown',
        length: generatedTweet.content.length,
        sourceUrl: generatedTweet.sourceUrl, 
      },
      needsImage: tweet.image_status === 'pending'
    };
  });

  const results = await Promise.allSettled(generationPromises);
  
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      if (result.value.type === 'tweet') {
        generatedTweets.push(result.value.data);
        if (result.value.needsImage) imageIsNeeded = true;
      } else if (result.value.type === 'thread') {
        generatedThreads.push(result.value.data);
      }
    } else if (result.status === 'rejected') {
      const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`A generation failed: ${errorMsg}`);
    }
  });

  const totalContentUnits = generatedTweets.length + generatedThreads.reduce((sum, thread) => sum + thread.total_tweets, 0);
  const endTime = performance.now();
  const totalDuration = ((endTime - startTime) / 1000).toFixed(2);

  return NextResponse.json({
    success: true,
    message: `✅ Batch generation complete for account ${accountId}.`.trim(),
    accountId,
    accountName: account.name,
    threading_enabled: supportsThreading,
    generated: {
      single_tweets: generatedTweets.length,
      threads: generatedThreads.length,
      total_content_units: totalContentUnits
    },
    targetBatchSize,
    currentPipeline: pendingTweets.length + totalContentUnits,
    maxPipeline: maxPipelineSize,
    batchInfo: debugMode ? batchInfo : undefined,
    generatedTweets: debugMode ? generatedTweets : generatedTweets.length,
    generatedThreads: debugMode ? generatedThreads : generatedThreads.map(t => ({ tweets: t.total_tweets })),
    errors: errors.length > 0 ? errors : undefined,
    duration_s: parseFloat(totalDuration),
    timestamp: new Date().toISOString()
  });
}

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

async function generateForAllAccountsEnhanced(request: NextRequest, debugMode = false) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  
  // NATIVE DATABASE TIME RESOLUTION. 
  // No node.js string parsing. Handles wrap-around offsets automatically.
  const accountsWithSchedules = await sql`
    WITH current_local AS (
      SELECT 
        a.id, a.name, a.account_username as twitter_handle, a.platform, a.personas, a.branding,
        s.start_time,
        s.days_of_week,
        (EXTRACT(HOUR FROM timezone(s.timezone, NOW())) * 60 + EXTRACT(MINUTE FROM timezone(s.timezone, NOW()))) as local_minutes,
        EXTRACT(DOW FROM timezone(s.timezone, NOW())) as local_dow
      FROM connected_accounts a
      JOIN account_schedules s ON s.connected_account_id = a.id
      WHERE a.is_active = true AND s.is_active = true
    )
    SELECT id, name, twitter_handle, platform, personas, branding
    FROM current_local
    WHERE local_dow = ANY(days_of_week)
      AND (local_minutes - start_time + 1440) % 1440 >= 0
      AND (local_minutes - start_time + 1440) % 1440 < 60
    GROUP BY id, name, twitter_handle, platform, personas, branding
    LIMIT 100
  `;

  if (accountsWithSchedules.rows.length === 0) {
    logger.info(`[Session:${sessionId}] No accounts due for generation in this window.`, 'generate-multi-skip');
    return NextResponse.json({
        success: true,
        message: 'No accounts due for generation in this time window.'
    });
  }

  const accountPromises = accountsWithSchedules.rows.map(account =>
    generateForAccountEnhanced(account.id, request, debugMode)
      .then(res => res.json())
      .catch(error => ({
          accountId: account.id,
          accountName: account.name,
          success: false,
          generated: { single_tweets: 0, threads: 0, total_content_units: 0 },
          message: error instanceof Error ? error.message : String(error)
      }))
  );

  const results = await Promise.all(accountPromises);

  const totalGenerated = results.reduce((sum, r) => sum + (r.generated?.total_content_units || 0), 0);
  const successfulAccounts = results.filter(r => r.success).length;
  const accountsWithGeneration = results.filter(r => (r.generated?.total_content_units || 0) > 0).length;

  return NextResponse.json({
    success: true,
    message: `Multi-account generation complete: ${totalGenerated} content units generated across ${accountsWithGeneration} accounts.`,
    sessionId,
    totalAccounts: accountsWithSchedules.rows.length,
    successfulAccounts,
    accountsWithGeneration,
    totalGenerated,
    results: debugMode ? results : results.map((r: AccountGenerationResult) => ({
      accountId: r.accountId,
      accountName: r.accountName,
      success: r.success,
      generated: r.generated,
      message: r.message,
    })),
    timestamp: new Date().toISOString()
  });
}