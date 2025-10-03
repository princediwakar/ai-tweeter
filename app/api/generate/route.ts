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
    const personaOverride = searchParams.get('persona');
    
    if (debugMode) {
      const insights = getSchedulingInsights();
      logger.info('Scheduling insights requested', 'generate-debug', insights);
    }
    
    if (accountId) {
      return await generateForAccountEnhanced(accountId, request, debugMode, personaOverride);
    }
    
    if (twitterHandle) {
      const account = await getAccountByTwitterHandle(twitterHandle);
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
async function generateForAccountEnhanced(accountId: string, request: NextRequest, debugMode = false, personaOverride?: string | null) {
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
  
  // Override persona if specified in debug mode
  if (debugMode && personaOverride) {
    batchInfo.personas = [personaOverride];
    logger.info(`[Enhanced:${callId}] Debug mode: overriding persona to ${personaOverride}`, 'generate-debug');
  }
  
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
  const supportsThreading = canGenerateThreads(account);
  
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

  let targetBatchSize = Math.min(batchInfo.batch_size, maxPipelineSize - pendingTweets.length);
  
  // For threading personas, only generate one thread per call  
  const selectedPersonaKey = batchInfo.personas[0];
  const persona = getPersonaByKey(selectedPersonaKey);
  const isThreadingPersona = supportsThreading && ['business_storyteller', 'cricket_storyteller'].includes(selectedPersonaKey);
  const shouldGenerateThreads = isThreadingPersona && persona?.content_types?.includes('thread');
  
  if (shouldGenerateThreads) {
    targetBatchSize = 1; // Only one thread per generation call
    logger.info(`[Enhanced:${callId}] Threading persona detected - limiting batch size to 1`, 'generate-batch');
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
  
  logger.info(`[Enhanced:${callId}] Generating batch for account ${accountId} (Threading: ${shouldGenerateThreads ? 'threads' : 'tweets'})`, 'generate-batch');

  const allTopics = getAllTopicsForPersona(selectedPersonaKey);
  const shuffledTopics = shuffleArray(allTopics);
  const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];

  const generationPromises = Array.from({ length: targetBatchSize }, async (_, i): Promise<GenerationResultUnion> => {
    if (!persona) throw new Error(`Persona ${selectedPersonaKey} not found`);

    // For threading personas, generate thread synchronously to ensure completion
    if (shouldGenerateThreads) {
      logger.info(`🚀 [Enhanced:${callId}] Starting thread generation for ${selectedPersonaKey}`, 'thread-generation');
      
      const threadResult = await generateThread({ account_id: accountId, persona: selectedPersonaKey });
      
      if (threadResult) {
        logger.info(`✅ [Enhanced:${callId}] Thread generated: ${threadResult.thread_id} - "${threadResult.template_used}" with ${threadResult.total_tweets} tweets`, 'thread-generation');
        return { 
          type: 'thread', 
          data: threadResult
        };
      } else {
        logger.error(`❌ [Enhanced:${callId}] Thread generation failed for ${selectedPersonaKey}`, 'thread-generation');
        throw new Error(`Thread generation failed for persona ${selectedPersonaKey}`);
      }
    }

    // For non-threading personas, generate regular tweets
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
  
  // ✅ FIXED: Process images synchronously during generation to ensure reliability
  if (imageIsNeeded) {
    logger.info(`[Enhanced:${callId}] Processing images synchronously for account ${accountId}`, 'image-processing');
    
    try {
      // Import the image processing logic directly
      const { getTweetsWithPendingImages, updateTweetImage } = await import('@/lib/db');
      const { generatePersonaImage } = await import('@/lib/imageGenerationService');
      
      const pendingImageTweets = await getTweetsWithPendingImages(10, accountId);
      
      if (pendingImageTweets.length > 0) {
        logger.info(`[Enhanced:${callId}] Found ${pendingImageTweets.length} tweets needing images`, 'image-processing');
        
        // Process images in parallel but wait for completion
        const imageProcessingPromises = pendingImageTweets.map(async (tweet) => {
          try {
            await updateTweetImage(tweet.id, undefined, 'processing');
            
            if (!tweet.card_data) {
              throw new Error('No card_data found for image generation');
            }

            const cardData = JSON.parse(tweet.card_data);
            const imageUrl = await generatePersonaImage(cardData, tweet.persona, tweet.account_id);
            
            if (imageUrl) {
              await updateTweetImage(tweet.id, imageUrl, 'completed');
              logger.info(`[Enhanced:${callId}] Image completed for tweet ${tweet.id}`, 'image-success');
              return { success: true, tweetId: tweet.id, imageUrl };
            } else {
              throw new Error('Image generation returned null');
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            await updateTweetImage(tweet.id, undefined, 'failed');
            logger.error(`[Enhanced:${callId}] Image failed for tweet ${tweet.id}: ${errorMsg}`, 'image-error', error as Error);
            return { success: false, tweetId: tweet.id, error: errorMsg };
          }
        });
        
        const imageResults = await Promise.allSettled(imageProcessingPromises);
        const successful = imageResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = imageResults.length - successful;
        
        logger.info(`[Enhanced:${callId}] Image processing complete: ${successful} successful, ${failed} failed`, 'image-processing');
      }
    } catch (error) {
      logger.error(`[Enhanced:${callId}] Failed to process images synchronously`, 'image-processing-error', error as Error);
    }
  }

  const response = {
    success: true,
    message: `✅ Batch generation complete for account ${accountId}. ${imageIsNeeded ? 'Images processed.' : ''}`.trim(),
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