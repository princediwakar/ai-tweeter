// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { generateTweet } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { saveTweet, generateTweetId, getTweetsByAccount } from '@/lib/db';
import { accountService } from '@/lib/accountService';
import { getCurrentTimeInIST, getCurrentISTHour, getCurrentISTMinute } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getGenerationBatchInfo } from '@/lib/schedule';
import { TweetGenerationConfig, ThreadGenerationResult, Tweet } from '@/lib/types';
import { getPersonaByKey, getAllPersonas } from '@/lib/personas';
import { sql } from '@vercel/postgres';


// MODIFIED: Added sourceUrl to the info type
interface GeneratedTweetInfo {
  persona: string;
  contentType: string;
  length: number;
  sourceUrl?: string;
}

type GenerationResultUnion =
  { type: 'tweet'; data: GeneratedTweetInfo; needsImage: boolean } |
  { type: 'thread'; data: ThreadGenerationResult };

// <<< MODIFICATION START >>>
// NEW: Helper function to save debug output to a single file
/**
 * Appends generated content to a single local debug file (debug-output.log).
 * Only intended for use when debugMode is active.
 * @param data The essential data to save.
 */
async function saveDebugOutput(data: { content: string | string[]; persona: string; source?: string; created_at: string }) {
  try {
    const debugDir = path.join(process.cwd(), 'debug-tweets');
    await fs.mkdir(debugDir, { recursive: true });

    const filePath = path.join(debugDir, 'debug-output.log'); // Static filename

    // Handle both single tweets (string) and threads (string[])
    const contentString = Array.isArray(data.content)
      ? data.content.join('\n  -> ') // Join thread parts for readability
      : data.content;
    
    // Escape any double quotes within the content to keep the format valid
    const sanitizedContent = contentString.replace(/"/g, '\\"');
    
    // Format the output line as per your requested pattern
    // const sourceInfo = data.source ? `\nsource: "${data.source}"` : '';
    // const lineToAppend = `${data.persona}: "${sanitizedContent}"${sourceInfo}\n\n`;
    const lineToAppend = `"${sanitizedContent}"\n\n`;

    await fs.appendFile(filePath, lineToAppend, 'utf-8');
    logger.info(`[Debug] Appended generation output to ${filePath}`, 'save-debug-output');
  } catch (error) {
    // Log the error but don't crash the main process. Debug saving is non-critical.
    logger.error('[Debug] Failed to save debug output file', 'save-debug-output-error', error as Error);
  }
}
// <<< MODIFICATION END >>>


/**
 * Enhanced Multi-Account Content Generation API
 */
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
      return await generateForAccountEnhanced(accountId, request, debugMode, personaOverride);
    }

    if (twitterHandle) {
      const account = await accountService.getAccountByTwitterHandle(twitterHandle);
      if (!account) {
        return NextResponse.json({
          error: `Account not found for Twitter handle: ${twitterHandle}`
        }, { status: 404 });
      }
      return await generateForAccountEnhanced(account.id, request, debugMode, personaOverride);
    }

    return await generateForAllAccountsEnhanced(request, debugMode);

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

/**
 * Enhanced account-specific generation using intelligent batch processing
 * ADDED TIMING LOGS
 */
async function generateForAccountEnhanced(accountId: string, request: NextRequest, debugMode = false, personaOverride?: string | null) {
  // Deduplication is now handled by DB-based slot claiming in getGenerationBatchInfo (lib/schedule.ts)
  // This ensures proper deduplication across server restarts and deployments
  
  const startTime = performance.now(); // START
  const nowIST = getCurrentTimeInIST();
  const callId = Math.random().toString(36).substring(2, 8);

  logger.info(`[Enhanced:${callId}] Starting generation for account ${accountId}`, 'generate-enhanced', { timestamp: new Date().toISOString() });

  // --- Initial Setup & Account Check ---
  const account = await accountService.getAccount(accountId) as any;
  if (!account) {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} not found`
    }, { status: 404 });
  }

  const batchInfo = await getGenerationBatchInfo(account.account_username || account.twitter_handle, nowIST, debugMode);

  // ... (Persona Override and Skip Logic remains the same)
  if (debugMode && personaOverride) {
    batchInfo.generation_personas = [personaOverride];
    logger.info(`[Enhanced:${callId}] Debug mode: overriding persona to ${personaOverride}`, 'generate-debug');
  }

  logger.info(`[Enhanced:${callId}] Account ${accountId} batchInfo: ${JSON.stringify(batchInfo)} (Debug: ${debugMode})`, 'generate-debug');

  if (!batchInfo.should_generate && !debugMode) {
    logger.info(`[Enhanced:${callId}] Generation skipped by schedule. Time elapsed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`, 'generate-skip');
    return NextResponse.json({
      success: true,
      message: `⏳ No generation scheduled for account ${accountId} (check schedule window)`,
      accountId,
      batchInfo,
      timestamp: new Date().toISOString()
    });
  }

  if (debugMode && !batchInfo.should_generate) {
    logger.info(`[Enhanced:${callId}] Debug mode enabled - bypassing schedule for account ${accountId}`, 'generate-debug');
  }

  if (account.status !== 'active') {
    logger.info(`[Enhanced:${callId}] Generation skipped: account inactive. Time elapsed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`, 'generate-skip');
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} is inactive`
    }, { status: 404 });
  }

  // --- Pipeline Check ---
  const dbReadStart = performance.now();
  const accountTweets = await getTweetsByAccount(accountId);
  const pendingTweets = accountTweets.filter(t => t.status !== 'posted' && t.status !== 'failed');
  logger.info(`[Enhanced:${callId}] DB read time: ${((performance.now() - dbReadStart) / 1000).toFixed(2)}s. Pending tweets: ${pendingTweets.length}`, 'generate-timing');

  const maxPipelineSize = account.branding?.max_pipeline_size || 30;
  const canThreads = await canGenerateThreads(account);
  const supportsThreading = account.branding?.supports_threads ?? canThreads;

  if (pendingTweets.length >= maxPipelineSize) {
    logger.info(`[Enhanced:${callId}] Generation skipped: pipeline full. Time elapsed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`, 'generate-skip');
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

  // For threading personas, only generate one thread per call  
  const selectedPersonaKey = batchInfo.generation_personas[0];
  if (!selectedPersonaKey) {
    logger.error(`[Enhanced:${callId}] No persona available for generation`, 'generate-error');
    return NextResponse.json({
      success: false,
      error: 'No persona available for generation. Please assign a persona to this account.'
    }, { status: 400 });
  }

  const persona = await getPersonaByKey(selectedPersonaKey);
  if (!persona) {
    logger.error(`[Enhanced:${callId}] Persona '${selectedPersonaKey}' not found in database`, 'generate-error');
    return NextResponse.json({
      success: false,
      error: `Persona '${selectedPersonaKey}' not found. Please create a persona first.`
    }, { status: 400 });
  }

  const allPersonas = await getAllPersonas();
  const threadPersonas = allPersonas.filter(p => p.config?.supports_threads).map(p => p.key);
  const isThreadingPersona = supportsThreading && threadPersonas.includes(selectedPersonaKey);
  const shouldGenerateThreads = isThreadingPersona;

  if (shouldGenerateThreads) {
    targetBatchSize = 1; // Only one thread per generation call
    logger.info(`[Enhanced:${callId}] Threading persona detected - limiting batch size to 1`, 'generate-batch');
  }

  if (targetBatchSize <= 0) {
    logger.info(`[Enhanced:${callId}] Generation skipped: target batch size 0. Time elapsed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`, 'generate-skip');
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

  logger.info(`[Enhanced:${callId}] Generating batch (size: ${targetBatchSize}) for account ${accountId} (Threading: ${shouldGenerateThreads ? 'threads' : 'tweets'})`, 'generate-batch');

  const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];

  // --- AI GENERATION START ---
  const generationStart = performance.now();
  const generationPromises = Array.from({ length: targetBatchSize }, async (_, i): Promise<GenerationResultUnion> => {
    if (!persona) throw new Error(`Persona ${selectedPersonaKey} not found`);


    if (shouldGenerateThreads) {
      const threadCallStart = performance.now();
      logger.info(`🚀 [Enhanced:${callId}] Starting thread generation for ${selectedPersonaKey}`, 'thread-generation');

      // Fetch context with accountId and personaKey for source deduplication
      const { getDynamicContext } = await import('@/lib/contentSource');
      const rssContext = await getDynamicContext(selectedPersonaKey, '', accountId, selectedPersonaKey);

      // Generate thread with the fetched context
      const threadResult = await generateThread({
        connected_account_id: accountId,
        persona: selectedPersonaKey,
        rssContext: rssContext // Pass the fetched context
      });

      if (threadResult) {
        logger.info(`✅ [Enhanced:${callId}] Thread generated in ${((performance.now() - threadCallStart) / 1000).toFixed(2)}s. Source: ${threadResult.sourceUrl || 'N/A'}`, 'thread-generation-timing');

        // <<< MODIFICATION START >>>
        // ADDED: Save debug output if in debug mode
        if (debugMode) {
          await saveDebugOutput({
            content: threadResult.tweets.map(t => t.content),
            persona: selectedPersonaKey,
            source: threadResult.sourceUrl,
            created_at: new Date().toISOString()
          });
        }
        // <<< MODIFICATION END >>>

        return {
          type: 'thread',
          data: threadResult
        };
      } else {
        logger.error(`❌ [Enhanced:${callId}] Thread generation failed for ${selectedPersonaKey}`, 'thread-generation');
        throw new Error(`Thread generation failed for persona ${selectedPersonaKey}`);
      }
    }


    const config: TweetGenerationConfig = {
      account_id: accountId,
      persona: selectedPersonaKey,
      contentType: contentTypes[(getCurrentISTHour(nowIST) + i) % contentTypes.length] as TweetGenerationConfig['contentType']
    };

    const tweetCallStart = performance.now();
    const generatedTweet = await generateTweet(config);
    logger.info(`✅ [Enhanced:${callId}] Tweet ${i + 1}/${targetBatchSize} generated in ${((performance.now() - tweetCallStart) / 1000).toFixed(2)}s.`, 'tweet-generation-timing');

    if (!generatedTweet) throw new Error(`Failed to generate tweet for persona ${selectedPersonaKey}`);

    const saveStart = performance.now();
    // Use connected_account_id (not account_id) to match tweets table schema
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
    logger.info(`[Enhanced:${callId}] Tweet ${i + 1}/${targetBatchSize} saved in ${((performance.now() - saveStart) / 1000).toFixed(2)}s.`, 'tweet-db-timing');

    // <<< MODIFICATION START >>>
    // ADDED: Save debug output if in debug mode
    if (debugMode) {
      await saveDebugOutput({
        content: generatedTweet.content,
        persona: selectedPersonaKey,
        source: generatedTweet.sourceUrl,
        created_at: tweet.created_at!
      });
    }
    // <<< MODIFICATION END >>>

    // MODIFIED: Added sourceUrl to the API response object
    return {
      type: 'tweet',
      data: {
        persona: selectedPersonaKey,
        contentType: config.contentType || 'unknown',
        length: generatedTweet.content.length,
        sourceUrl: generatedTweet.sourceUrl, // Include URL in the response
      },
      needsImage: tweet.image_status === 'pending'
    };
  });

  const results = await Promise.allSettled(generationPromises);
  logger.info(`[Enhanced:${callId}] Total AI generation time: ${((performance.now() - generationStart) / 1000).toFixed(2)}s. Batch size: ${targetBatchSize}`, 'generate-timing');

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
      logger.error(`[Enhanced:${callId}] A parallel generation failed: ${errorMsg}`, 'generate-error', result.reason);
    }
  });

  const totalContentUnits = generatedTweets.length + generatedThreads.reduce((sum, thread) => sum + thread.total_tweets, 0);

  // --- IMAGE PROCESSING REMOVED ---
  // Images are now processed asynchronously by the /api/process-images cron job
  // This significantly reduces API response time (was +3-10s, now ~0ms overhead)
  if (imageIsNeeded) {
    logger.info(`[Enhanced:${callId}] Queued ${targetBatchSize} tweets for background image processing`, 'image-queued');
  }

  // --- FINAL TIMING AND RESPONSE ---
  const endTime = performance.now(); // END
  const totalDuration = ((endTime - startTime) / 1000).toFixed(2);
  logger.info(`[Enhanced:${callId}] Batch generation complete. Total request duration: ${totalDuration}s`, 'generate-complete-timing', { duration: parseFloat(totalDuration), target_batch_size: targetBatchSize, generated_units: totalContentUnits });


  const response = {
    success: true,
    message: `✅ Batch generation complete for account ${accountId}. ${imageIsNeeded ? 'Images processed.' : ''}`.trim(),
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
  };

  // DB-based slot claiming handles deduplication automatically

  return NextResponse.json(response);
}


// Define a specific type for the results of the account generation process.
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
  // Add other potential properties to make the type more complete if needed
};

/**
 * Enhanced multi-account orchestration - SCALABLE VERSION
 * Queries only accounts due for generation in current time window
 * Uses DB slot claiming to prevent duplicate generation
 */
async function generateForAllAccountsEnhanced(request: NextRequest, debugMode = false) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  
  // Get current time in IST
  const nowIST = getCurrentTimeInIST();
  const currentHourIST = getCurrentISTHour(nowIST);
  const currentMinuteIST = getCurrentISTMinute(nowIST);
  const currentMinutes = currentHourIST * 60 + currentMinuteIST;
  const dayOfWeek = Math.floor((nowIST.getDay() + 6) % 7) + 1;

  // Get all accounts with active schedules that have started in the last 60 min or will start in next 60 min
  const accountsWithSchedules = await sql`
    SELECT a.id, a.name, a.account_username as twitter_handle, a.platform, a.personas, a.branding
    FROM connected_accounts a
    JOIN account_schedules s ON s.connected_account_id = a.id
    WHERE a.is_active = true
      AND s.is_active = true
      AND ${dayOfWeek} = ANY(s.days_of_week)
      AND s.start_time >= ${currentMinutes - 60}
      AND s.start_time <= ${currentMinutes + 60}
    GROUP BY a.id
    LIMIT 100
  `;

  console.log(`[Generate] Current time: ${currentHourIST}:${currentMinuteIST} (${currentMinutes} min), dayOfWeek: ${dayOfWeek}`);
  console.log(`[Generate] Found ${accountsWithSchedules.rows.length} accounts with schedules`);

  if (accountsWithSchedules.rows.length === 0) {
    logger.info(`[Session:${sessionId}] No accounts due for generation in this window.`, 'generate-multi-skip');
    return NextResponse.json({
        success: true,
        message: 'No accounts due for generation in this time window.'
    });
  }

  logger.info(`[Session:${sessionId}] Found ${accountsWithSchedules.rows.length} accounts due for generation`, 'generate-multi');

  // Process each account - getGenerationBatchInfo handles slot claiming internally
  // This prevents duplicate generation even if same schedule falls in window twice
  const accountPromises = accountsWithSchedules.rows.map(account =>
    generateForAccountEnhanced(account.id, request, debugMode)
      .then(res => res.json())
      .catch(error => {
        logger.error(`[Session:${sessionId}] Failed to process account ${account.id}`, 'generate-multi-error', error as Error);
        return {
          accountId: account.id,
          accountName: account.name,
          success: false,
          generated: { single_tweets: 0, threads: 0, total_content_units: 0 },
          message: error instanceof Error ? error.message : String(error)
        };
      })
  );

  const results = await Promise.all(accountPromises);

  // Summarize results
  const totalGenerated = results.reduce((sum, r) => sum + (r.generated?.total_content_units || 0), 0);
  const successfulAccounts = results.filter(r => r.success).length;
  const accountsWithGeneration = results.filter(r => (r.generated?.total_content_units || 0) > 0).length;

  const response = {
    success: true,
    message: `Multi-account generation complete: ${totalGenerated} content units generated across ${accountsWithGeneration} accounts.`,
    sessionId,
    totalAccounts: accountsWithSchedules.rows.length,
    successfulAccounts,
    accountsWithGeneration,
    totalGenerated,
    // Use the specific type `AccountGenerationResult` instead of `any`.
    results: debugMode ? results : results.map((r: AccountGenerationResult) => ({
      accountId: r.accountId,
      accountName: r.accountName,
      success: r.success,
      generated: r.generated,
      message: r.message,
    })),
    timestamp: new Date().toISOString()
  };

  logger.info(`[Session:${sessionId}] Multi-account generation complete`, 'generate-multi-complete');
  return NextResponse.json(response);
}