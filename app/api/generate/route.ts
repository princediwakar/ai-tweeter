// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
// NOTE: Assuming these imports exist and are correct based on your original file structure
import { generateTweet } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { saveTweet, generateTweetId, getTweetsByAccount } from '@/lib/db';
import { accountService } from '@/lib/accountService';
import { getCurrentTimeInIST } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { 
  getGenerationBatchInfo,
} from '@/lib/schedule';
import { TweetGenerationConfig, ThreadGenerationResult, Tweet } from '@/lib/types';
import { getPersonaByKey } from '@/lib/personas';



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


/**
 * Enhanced Multi-Account Content Generation API
 */
// ... (GET function remains unchanged) ...
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
  const startTime = performance.now(); // START
  const nowIST = getCurrentTimeInIST();
  const callId = Math.random().toString(36).substring(2, 8);
  
  logger.info(`[Enhanced:${callId}] Starting generation for account ${accountId}`, 'generate-enhanced', { timestamp: new Date().toISOString() });

  // --- Initial Setup & Account Check ---
  const account = await accountService.getAccount(accountId);
  if (!account) {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} not found`
    }, { status: 404 });
  }
  
  const batchInfo = getGenerationBatchInfo(account.twitter_handle, nowIST, debugMode);
  
  // ... (Persona Override and Skip Logic remains the same)
  if (debugMode && personaOverride) {
    batchInfo.personas = [personaOverride];
    logger.info(`[Enhanced:${callId}] Debug mode: overriding persona to ${personaOverride}`, 'generate-debug');
  }
  
  logger.info(`[Enhanced:${callId}] Account ${accountId} batchInfo: ${JSON.stringify(batchInfo)} (Debug: ${debugMode})`, 'generate-debug');
  
  if (!batchInfo.should_generate && !debugMode) {
    logger.info(`[Enhanced:${callId}] Generation skipped by schedule. Time elapsed: ${((performance.now() - startTime) / 1000).toFixed(2)}s`, 'generate-skip');
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
  
  const maxPipelineSize = account.twitter_handle.includes('gibbi') ? 8 : 30;
  const supportsThreading = canGenerateThreads(account);
  
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
  
  // ADD THIS BLOCK TO FETCH THE CONTEXT
  const { getDynamicContext } = await import('@/lib/contentSource');
  const rssContext = await getDynamicContext(selectedPersonaKey, '');

  // MODIFY THE CALL TO generateThread TO PASS THE CONTEXT
  const threadResult = await generateThread({ 
      account_id: accountId, 
      persona: selectedPersonaKey,
      rssContext: rssContext // Pass the fetched context
  });
  
  if (threadResult) {
    logger.info(`✅ [Enhanced:${callId}] Thread generated in ${((performance.now() - threadCallStart) / 1000).toFixed(2)}s. Source: ${threadResult.sourceUrl || 'N/A'}`, 'thread-generation-timing');
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
      contentType: contentTypes[(nowIST.getHours() + i) % contentTypes.length] as TweetGenerationConfig['contentType']
    };

    const tweetCallStart = performance.now();
    const generatedTweet = await generateTweet(config);
    logger.info(`✅ [Enhanced:${callId}] Tweet ${i+1}/${targetBatchSize} generated in ${((performance.now() - tweetCallStart) / 1000).toFixed(2)}s.`, 'tweet-generation-timing');

    if (!generatedTweet) throw new Error(`Failed to generate tweet for persona ${selectedPersonaKey}`);
    
    const saveStart = performance.now();
    // MODIFIED: Added source_url to the object saved in the database
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
      card_data: generatedTweet.cardData ? JSON.stringify(generatedTweet.cardData) : undefined,
      source_url: generatedTweet.sourceUrl, // Save the URL to the DB
    };

    await saveTweet(tweet as Tweet);
    logger.info(`[Enhanced:${callId}] Tweet ${i+1}/${targetBatchSize} saved in ${((performance.now() - saveStart) / 1000).toFixed(2)}s.`, 'tweet-db-timing');
    
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
  
  // --- IMAGE PROCESSING START ---
  if (imageIsNeeded) {
    const imageProcessingStart = performance.now(); // START: Image Processing
    logger.info(`[Enhanced:${callId}] Starting synchronous image processing for account ${accountId}`, 'image-processing');
    
    try {
      // Import the image processing logic directly
      const { getTweetsWithPendingImages, updateTweetImage } = await import('@/lib/db');
      const { generatePersonaImage } = await import('@/lib/services/imageGenerationService');
      
      const pendingImageTweets = await getTweetsWithPendingImages(10, accountId);
      
      if (pendingImageTweets.length > 0) {
        logger.info(`[Enhanced:${callId}] Found ${pendingImageTweets.length} tweets needing images`, 'image-processing');
        
        // Process images in parallel but wait for completion
        const imageProcessingPromises = pendingImageTweets.map(async (tweet) => {
          const imageCallStart = performance.now();
          try {
            await updateTweetImage(tweet.id, undefined, 'processing');

            if (!tweet.card_data) {
              throw new Error('No card_data found for image generation');
            }

            const cardData = JSON.parse(tweet.card_data);
            const imageUrl = await generatePersonaImage(cardData, tweet.persona, tweet.account_id);

            if (imageUrl) {
              await updateTweetImage(tweet.id, imageUrl, 'completed');
              logger.info(`[Enhanced:${callId}] Image completed for tweet ${tweet.id} in ${((performance.now() - imageCallStart) / 1000).toFixed(2)}s.`, 'image-success-timing');
              return { success: true, tweetId: tweet.id, imageUrl };
            } else {
              throw new Error('Image generation returned null');
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            await updateTweetImage(tweet.id, undefined, 'failed');
            logger.error(`[Enhanced:${callId}] Image failed for tweet ${tweet.id} after ${((performance.now() - imageCallStart) / 1000).toFixed(2)}s: ${errorMsg}`, 'image-error', error as Error);
            return { success: false, tweetId: tweet.id, error: errorMsg };
          }
        });
        
        const imageResults = await Promise.allSettled(imageProcessingPromises);
        const successful = imageResults.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length;
        const failed = imageResults.length - successful;
        
        logger.info(`[Enhanced:${callId}] Total image processing time: ${((performance.now() - imageProcessingStart) / 1000).toFixed(2)}s. ${successful} successful, ${failed} failed`, 'image-processing-timing');
      }
    } catch (error) {
      logger.error(`[Enhanced:${callId}] Failed to process images synchronously`, 'image-processing-error', error as Error);
    }
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
    duration_s: parseFloat(totalDuration), // Add duration to the response
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response);
}

/**
 * Enhanced multi-account orchestration
 */
async function generateForAllAccountsEnhanced(request: NextRequest, debugMode = false) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  const activeAccounts = await accountService.getAllAccounts();

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