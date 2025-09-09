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
import { TweetGenerationConfig } from '@/lib/types';
import { getPersonaByKey, getAllTopicsForPersona } from '@/lib/personas';

/**
 * A utility function to shuffle an array (Fisher-Yates algorithm).
 * This ensures we don't repeat topics within a single generation batch.
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArr = [...array]; // Create a copy to avoid modifying the original
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]]; // Swap elements
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
      return await generateForAccountEnhanced(accountId, debugMode);
    }
    
    if (twitterHandle) {
      const account = await getAccountByTwitterHandle(twitterHandle);
      if (!account) {
        return NextResponse.json({ 
          error: `Account not found for Twitter handle: ${twitterHandle}` 
        }, { status: 404 });
      }
      return await generateForAccountEnhanced(account.id, debugMode);
    }
    
    return await generateForAllAccountsEnhanced(debugMode);
    
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
 */
async function generateForAccountEnhanced(accountId: string, debugMode = false) {
  const nowIST = getCurrentTimeInIST();
  const callId = Math.random().toString(36).substring(2, 8);
  
  logger.info(`[Enhanced:${callId}] Starting generation for account ${accountId}`, 'generate-enhanced');
  
  const batchInfo = getGenerationBatchInfo(accountId, nowIST, debugMode);
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

  const account = await getAccount(accountId);
  if (!account || account.status !== 'active') {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} not found or inactive`
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
  
  const generatedTweets = [];
  const generatedThreads = [];
  const errors = [];
  
  const supportsThreading = canGenerateThreads(account);
  
  logger.info(`[Enhanced:${callId}] Generating batch for account ${accountId} (Threading: ${supportsThreading ? 'enabled' : 'disabled'})`, 'generate-batch');

  // Pre-fetch and shuffle topics to GUARANTEE variety within the batch.
  const selectedPersonaKey = batchInfo.personas[0]; // Assumes one primary persona for the batch
  const allTopics = getAllTopicsForPersona(selectedPersonaKey);
  const shuffledTopics = shuffleArray(allTopics);

  for (let i = 0; i < targetBatchSize; i++) {
    try {
      const persona = getPersonaByKey(selectedPersonaKey);
      
      if (!persona) {
        errors.push(`Persona ${selectedPersonaKey} not found`);
        continue;
      }

      const shouldGenerateThread = supportsThreading && ['business_storyteller', 'cricket_storyteller'].includes(selectedPersonaKey) && Math.random() < 0.7;

      if (shouldGenerateThread) {
        logger.info(`[Enhanced:${callId}] Generating thread for ${selectedPersonaKey}`, 'generate-thread');
        const threadResult = await generateThread({ account_id: accountId, persona: selectedPersonaKey });
        
        if (threadResult) {
          generatedThreads.push(threadResult);
          i += Math.max(1, Math.floor(threadResult.total_tweets / 2));
        } else {
          errors.push(`Failed to generate thread for persona ${selectedPersonaKey}`);
        }
      } else {
        // Use the pre-shuffled list to pick a unique topic for each tweet in the batch.
        const topic = shuffledTopics[i % shuffledTopics.length];
        if (!topic) {
          errors.push(`No unique topics left for persona ${selectedPersonaKey}`);
          continue;
        }
        logger.info(`[Enhanced:${callId}] Account ${accountId} selected topic: ${topic?.displayName || 'N/A'} for persona ${selectedPersonaKey}`, 'generate-debug');

        const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];
        const contentType = contentTypes[(nowIST.getHours() + i) % contentTypes.length];

        const config: TweetGenerationConfig = {
          account_id: accountId,
          persona: selectedPersonaKey,
          topic: topic.key,
          contentType: contentType as TweetGenerationConfig['contentType']
        };

        const generatedTweet = await generateTweet(config);
        
        if (!generatedTweet) {
          errors.push(`Failed to generate tweet for persona ${selectedPersonaKey}`);
          continue;
        }
        
        const tweet = {
          id: generateTweetId(),
          account_id: accountId,
          content: generatedTweet.content,
          hashtags: generatedTweet.hashtags,
          persona: generatedTweet.persona,
          status: 'ready' as const,
          created_at: new Date().toISOString(),
          quality_score: 1,
          content_type: 'single_tweet' as const,
          image_url: generatedTweet.imageUrl
        };

        await saveTweet(tweet);
        generatedTweets.push({
          persona: selectedPersonaKey,
          topic: topic.displayName,
          contentType,
          length: generatedTweet.content.length
        });

        logger.info(`[Enhanced:${callId}] Generated single tweet ${i + 1}/${targetBatchSize} for ${selectedPersonaKey}`, 'generate-success');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Generation ${i + 1} failed: ${errorMsg}`);
      logger.error(`[Enhanced:${callId}] Generation ${i + 1} failed: ${errorMsg}`, 'generate-error', error as Error);
    }
  }

  const totalContentUnits = generatedTweets.length + generatedThreads.reduce((sum, thread) => sum + thread.total_tweets, 0);
  
  const response = {
    success: true,
    message: `✅ Enhanced batch generation complete for account ${accountId}`,
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

  logger.info(`[Enhanced:${callId}] Batch complete: ${generatedTweets.length} tweets + ${generatedThreads.length} threads (${totalContentUnits} total units)`, 'generate-complete');
  return NextResponse.json(response);
}


/**
 * Enhanced multi-account orchestration inspired by YouTube system's parallel processing
 */
async function generateForAllAccountsEnhanced(debugMode = false) {
  const sessionId = Math.random().toString(36).substring(2, 8);
  const activeAccounts = await getActiveAccounts();
  
  logger.info(`[Session:${sessionId}] Starting enhanced multi-account generation for ${activeAccounts.length} accounts`, 'generate-multi');
  
  if (activeAccounts.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No active accounts found',
      totalAccounts: 0,
      totalGenerated: 0,
      timestamp: new Date().toISOString()
    });
  }

  const accountPromises = activeAccounts.map(async (account) => {
    try {
      const result = await generateForAccountEnhanced(account.id, debugMode);
      const data = await result.json();
      
      return {
        accountId: account.id,
        accountName: account.name,
        success: data.success,
        generated: data.generated,
        strategy: data.strategy || 'Unknown',
        currentPipeline: data.currentPipeline || 0,
        message: data.message || data.error,
        errors: data.errors
      };
      
    } catch (error) {
      logger.error(`[Session:${sessionId}] Failed to process account ${account.id}`, 'generate-multi-error', error as Error);
      return {
        accountId: account.id,
        accountName: account.name,
        success: false,
        generated: { single_tweets: 0, threads: 0, total_content_units: 0 },
        strategy: 'Unknown',
        currentPipeline: 0,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  });

  const results = await Promise.all(accountPromises);
  
  const totalGenerated = results.reduce((sum, r) => sum + (r.generated?.total_content_units || 0), 0);
  const successfulAccounts = results.filter(r => r.success).length;
  const accountsWithGeneration = results.filter(r => (r.generated?.total_content_units || 0) > 0).length;
  
  const insights = getSchedulingInsights();
  
  const response = {
    success: true,
    message: `Enhanced multi-account generation complete: ${totalGenerated} content units generated across ${accountsWithGeneration} accounts`,
    sessionId,
    totalAccounts: activeAccounts.length,
    successfulAccounts,
    accountsWithGeneration,
    totalGenerated,
    schedulingInsights: debugMode ? insights : undefined,
    results: debugMode ? results : results.map(r => ({
      accountId: r.accountId,
      accountName: r.accountName,
      success: r.success,
      generated: r.generated,
      strategy: r.strategy
    })),
    timestamp: new Date().toISOString()
  };

  logger.info(`[Session:${sessionId}] Multi-account generation complete: ${totalGenerated} units, ${successfulAccounts}/${activeAccounts.length} accounts successful`, 'generate-multi-complete');
  
  return NextResponse.json(response);
}