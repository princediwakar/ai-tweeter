import { NextRequest, NextResponse } from 'next/server';
import { generateTweet } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { saveTweet, generateTweetId, getTweetsByAccount, getActiveAccounts, getAccount, getAccountByTwitterHandle } from '@/lib/db';
import { getCurrentTimeInIST } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { 
  getGenerationBatchInfo,
  getSchedulingInsights
} from '@/lib/schedule';
import { TweetGenerationConfig, ThreadGenerationResult, Tweet } from '@/lib/types';
import { getPersonaByKey, getAllTopicsForPersona } from '@/lib/personas';

/**
 * A utility function to shuffle an array (Fisher-Yates algorithm).
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

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
    const accountId = searchParams.get('account_id');
    const twitterHandle = searchParams.get('twitter_handle');
    const debugMode = searchParams.get('debug') === 'true';
    
    if (debugMode) {
      const insights = getSchedulingInsights();
      logger.info('Scheduling insights requested', 'generate-debug', insights);
    }
    
    if (accountId) {
      return await generateForAccountEnhanced(accountId, request, debugMode);
    }
    
    if (twitterHandle) {
      const account = await getAccountByTwitterHandle(twitterHandle);
      if (!account) {
        return NextResponse.json({ 
          error: `Account not found for Twitter handle: ${twitterHandle}` 
        }, { status: 404 });
      }
      return await generateForAccountEnhanced(account.id, request, debugMode);
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

// Define specific types for the results of the parallel generation
interface GeneratedTweetInfo {
  persona: string;
  topic: string;
  contentType: string;
  length: number;
}

type GenerationResultUnion = 
  { type: 'tweet'; data: GeneratedTweetInfo; needsImage: boolean } |
  { type: 'thread'; data: ThreadGenerationResult };

/**
 * Enhanced account-specific generation using intelligent batch processing
 */
async function generateForAccountEnhanced(accountId: string, request: NextRequest, debugMode = false) {
  const nowIST = getCurrentTimeInIST();
  const callId = Math.random().toString(36).substring(2, 8);
  
  logger.info(`[Enhanced:${callId}] Starting generation for account ${accountId}`, 'generate-enhanced');
  
  const account = await getAccount(accountId);
  if (!account) {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} not found`
    }, { status: 404 });
  }
  
  const batchInfo = getGenerationBatchInfo(account.twitter_handle, nowIST, debugMode);
  logger.info(`[Enhanced:${callId}] Account ${accountId} batchInfo: ${JSON.stringify(batchInfo)} (Debug: ${debugMode})`, 'generate-debug');
  
  if (!batchInfo.should_generate && !debugMode) {
    return NextResponse.json({
      success: true,
      message: `⏳ No generation scheduled for account ${accountId} at ${nowIST.getHours()}:00 IST`,
      accountId,
      batchInfo,
      timestamp: new Date().toISOString()
    });
  }
  
  if (debugMode && !batchInfo.should_generate) {
    logger.info(`[Enhanced:${callId}] Debug mode enabled - bypassing schedule for account ${accountId}`, 'generate-debug');
  }

  if (account.status !== 'active') {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} is inactive`
    }, { status: 404 });
  }

  const accountTweets = await getTweetsByAccount(accountId);
  const pendingTweets = accountTweets.filter(t => t.status !== 'posted' && t.status !== 'failed');
  
  const maxPipelineSize = account.twitter_handle.includes('gibbi') ? 8 : 30;
  
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

  const targetBatchSize = Math.min(batchInfo.batch_size, maxPipelineSize - pendingTweets.length);
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
  
  const supportsThreading = canGenerateThreads(account);
  
  logger.info(`[Enhanced:${callId}] Generating batch for account ${accountId} (Threading: ${supportsThreading ? 'enabled' : 'disabled'})`, 'generate-batch');

  const selectedPersonaKey = batchInfo.personas[0];
  const allTopics = getAllTopicsForPersona(selectedPersonaKey);
  const shuffledTopics = shuffleArray(allTopics);
  const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];

  const generationPromises = Array.from({ length: targetBatchSize }, async (_, i): Promise<GenerationResultUnion> => {
    const persona = getPersonaByKey(selectedPersonaKey);
    if (!persona) throw new Error(`Persona ${selectedPersonaKey} not found`);

    if (supportsThreading && ['business_storyteller', 'cricket_storyteller'].includes(selectedPersonaKey) && Math.random() < 0.7) {
      const threadResult = await generateThread({ account_id: accountId, persona: selectedPersonaKey });
      if (threadResult) return { type: 'thread', data: threadResult };
      throw new Error(`Failed to generate thread for persona ${selectedPersonaKey}`);
    }

    const topic = shuffledTopics[i % shuffledTopics.length];
    if (!topic) throw new Error(`No unique topics left for persona ${selectedPersonaKey}`);

    const config: TweetGenerationConfig = {
      account_id: accountId,
      persona: selectedPersonaKey,
      topic: topic.key,
      contentType: contentTypes[(nowIST.getHours() + i) % contentTypes.length] as TweetGenerationConfig['contentType']
    };

    const generatedTweet = await generateTweet(config);
    if (!generatedTweet) throw new Error(`Failed to generate tweet for persona ${selectedPersonaKey}`);
    
    const tweet: Partial<Tweet> = {
      id: generateTweetId(),
      account_id: accountId,
      content: generatedTweet.content,
      hashtags: generatedTweet.hashtags,
      persona: generatedTweet.persona,
      status: 'ready',
      created_at: new Date().toISOString(),
      content_type: 'single_tweet',
      image_url: generatedTweet.imageUrl,
      image_status: generatedTweet.imageStatus || 'none',
      card_data: generatedTweet.cardData ? JSON.stringify(generatedTweet.cardData) : undefined
    };

    await saveTweet(tweet as Tweet);
    
    return {
      type: 'tweet',
      data: {
        persona: selectedPersonaKey,
        topic: topic.displayName,
        contentType: config.contentType || 'unknown',
        length: generatedTweet.content.length
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
      logger.error(`[Enhanced:${callId}] A parallel generation failed: ${errorMsg}`, 'generate-error', result.reason);
    }
  });

  const totalContentUnits = generatedTweets.length + generatedThreads.reduce((sum, thread) => sum + thread.total_tweets, 0);
  
  // ✅ PRODUCTION-READY CHANGE: Trigger image processing in the background without waiting for it.
  if (imageIsNeeded) {
    logger.info(`[Enhanced:${callId}] Firing non-blocking request to process images for account ${accountId}`, 'image-trigger');
    
    // Construct a full URL that works in both dev and production (Vercel, etc.)
    const triggerUrl = new URL('/api/process-images', request.url).href;
    
    // Fire-and-forget: we don't `await` this, so the main response is sent immediately.
    fetch(triggerUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    }).catch(error => {
      // Log errors but don't let them affect the main API response.
      logger.error(`[Enhanced:${callId}] Background image processing trigger failed`, 'image-trigger-error', error as Error);
    });
  }

  const response = {
    success: true,
    message: `✅ Batch generation complete for account ${accountId}. ${imageIsNeeded ? 'Image processing triggered.' : ''}`.trim(),
    accountId,
    accountName: account.name,
    strategy: batchInfo.account_strategy,
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
    generatedThreads: debugMode ? generatedThreads : generatedThreads.map(t => ({ template: t.template_used, tweets: t.total_tweets })),
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString()
  };

  logger.info(`[Enhanced:${callId}] Batch complete response sent`, 'generate-complete');
  return NextResponse.json(response);
}

/**
 * Enhanced multi-account orchestration
 */
async function generateForAllAccountsEnhanced(request: NextRequest, debugMode = false) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  const activeAccounts = await getActiveAccounts();
  
  if (activeAccounts.length === 0) { /* ... no change ... */ }

  // Fire off all account generations in parallel
  const accountPromises = activeAccounts.map(account => 
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
    totalAccounts: activeAccounts.length,
    successfulAccounts,
    accountsWithGeneration,
    totalGenerated,
    results: debugMode ? results : results.map(r => ({
      accountId: r.accountId,
      accountName: r.accountName,
      success: r.success,
      generated: r.generated,
      strategy: r.strategy
    })),
    timestamp: new Date().toISOString()
  };

  logger.info(`[Session:${sessionId}] Multi-account generation complete`, 'generate-multi-complete');
  return NextResponse.json(response);
}