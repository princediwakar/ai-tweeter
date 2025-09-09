// app/api/generate/route.ts
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
import { getRandomTopicForPersona, getPersonaByKey } from '@/lib/personas';

// Job tracking removed - using synchronous generation

/**
 * Enhanced Multi-Account Content Generation API
 * Inspired by the YouTube system's sophisticated batch processing and account-specific logic
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const twitterHandle = searchParams.get('twitter_handle');
    const debugMode = searchParams.get('debug') === 'true';
    
    // Include scheduling insights in debug mode
    if (debugMode) {
      const insights = getSchedulingInsights();
      logger.info('Scheduling insights requested', 'generate-debug', insights);
    }
    
    // If account_id is provided, generate for specific account using enhanced logic
    if (accountId) {
      return await generateForAccountEnhanced(accountId, debugMode);
    }
    
    // If twitter_handle is provided, lookup account and generate
    if (twitterHandle) {
      const account = await getAccountByTwitterHandle(twitterHandle);
      if (!account) {
        return NextResponse.json({ 
          error: `Account not found for Twitter handle: ${twitterHandle}` 
        }, { status: 404 });
      }
      return await generateForAccountEnhanced(account.id, debugMode);
    }
    
    // Otherwise, generate for all active accounts with improved orchestration
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
 * Enhanced account-specific generation using YouTube system's intelligent batch processing
 */
async function generateForAccountEnhanced(accountId: string, debugMode = false) {
  const nowIST = getCurrentTimeInIST();
  const callId = Math.random().toString(36).substring(2, 8);
  
  logger.info(`[Enhanced:${callId}] Starting generation for account ${accountId}`, 'generate-enhanced');

  // Check debug mode from environment variable
  const isDebugMode = process.env.DEBUG_MODE === 'true';
  
  // Get enhanced batch information using YouTube-inspired scheduling logic
  const batchInfo = getGenerationBatchInfo(accountId, nowIST, isDebugMode);
  logger.info(`[Enhanced:${callId}] Account ${accountId} batchInfo: ${JSON.stringify(batchInfo)} (Debug: ${isDebugMode})`, 'generate-debug');
  
  if (!batchInfo.should_generate && !isDebugMode) {
    return NextResponse.json({
      success: true,
      message: `⏳ No generation scheduled for account ${accountId} at ${nowIST.getHours()}:00 IST`,
      accountId,
      batchInfo,
      timestamp: new Date().toISOString()
    });
  }
  
  if (isDebugMode && !batchInfo.should_generate) {
    logger.info(`[Enhanced:${callId}] Debug mode enabled - bypassing schedule for account ${accountId}`, 'generate-debug');
  }

  // Get account details and current pipeline status
  const activeAccounts = await getActiveAccounts();
  const account = activeAccounts.find(a => a.id === accountId);
  if (!account) {
    return NextResponse.json({
      success: false,
      error: `Account ${accountId} not found or inactive`
    }, { status: 404 });
  }

  const accountTweets = await getTweetsByAccount(accountId);
  const pendingTweets = accountTweets.filter(t => t.status !== 'posted' && t.status !== 'failed');
  
  // Enhanced pipeline management - different thresholds per account strategy
  const maxPipelineSize = accountId.includes('gibbi') ? 8 : 30; // Educational accounts can have larger pipeline
  
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

  // Enhanced batch generation with threading support
  const targetBatchSize = Math.min(batchInfo.batch_size, maxPipelineSize - pendingTweets.length);
  const generatedTweets = [];
  const generatedThreads = [];
  const errors = [];
  
  // Check if account supports threading
  const accountEntity = await getAccount(accountId);
  const supportsThreading = accountEntity ? canGenerateThreads(accountEntity) : false;
  
  logger.info(`[Enhanced:${callId}] Generating batch for account ${accountId} (Threading: ${supportsThreading ? 'enabled' : 'disabled'})`, 'generate-batch');

  for (let i = 0; i < targetBatchSize; i++) {
    try {
      // Intelligent persona selection - rotate through available personas
      const selectedPersonaKey = batchInfo.personas[i % batchInfo.personas.length];
      logger.info(`[Enhanced:${callId}] Account ${accountId} selectedPersonaKey: ${selectedPersonaKey}`, 'generate-debug');
      const persona = getPersonaByKey(selectedPersonaKey);
      
      if (!persona) {
        errors.push(`Persona ${selectedPersonaKey} not found`);
        continue;
      }

      // Threading decision for storytelling personas
      let shouldGenerateThread = false;
      if (supportsThreading && (selectedPersonaKey === 'business_storyteller' || selectedPersonaKey === 'cricket_storyteller')) {
        // 70% chance to generate thread for storytelling personas
        shouldGenerateThread = Math.random() < 0.7;
      }

      if (shouldGenerateThread) {
        // Generate business thread
        logger.info(`[Enhanced:${callId}] Generating thread for ${selectedPersonaKey}`, 'generate-thread');
        
        const threadResult = await generateThread({
          account_id: accountId,
          persona: selectedPersonaKey
        });
        
        if (threadResult) {
          generatedThreads.push({
            thread_id: threadResult.thread_id,
            persona: selectedPersonaKey,
            template: threadResult.template_used,
            total_tweets: threadResult.total_tweets,
            story_category: threadResult.story_category
          });
          
          // Count as multiple generation units based on thread size
          logger.info(`[Enhanced:${callId}] Generated thread "${threadResult.template_used}" with ${threadResult.total_tweets} tweets`, 'generate-success');
          
          // Skip ahead in loop since thread counts as multiple content units
          i += Math.max(1, Math.floor(threadResult.total_tweets / 2));
        } else {
          errors.push(`Failed to generate thread for persona ${selectedPersonaKey}`);
        }
      } else {
        // Generate single tweet
        const topic = getRandomTopicForPersona(selectedPersonaKey);
        if (!topic) {
          errors.push(`No topics available for persona ${selectedPersonaKey}`);
          continue;
        }
        logger.info(`[Enhanced:${callId}] Account ${accountId} selected topic: ${topic?.displayName || 'N/A'} for persona ${selectedPersonaKey}`, 'generate-debug');

        // Intelligent content type selection based on time and account strategy
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
        logger.info(`[Enhanced:${callId}] Account ${accountId} generatedTweet content (first 100 chars): ${generatedTweet?.content.substring(0, 100)}... for persona ${generatedTweet?.persona}`, 'generate-debug');

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
        logger.info(`[Enhanced:${callId}] Account ${accountId} saved tweet ${tweet.id} with persona ${tweet.persona} and content_type ${tweet.content_type}`, 'generate-debug');
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
    generatedThreads: debugMode ? generatedThreads : generatedThreads.map(t => ({ template: t.template, tweets: t.total_tweets })),
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

  // Process accounts in parallel for better performance (inspired by YouTube system)
  const accountPromises = activeAccounts.map(async (account) => {
    try {
      const result = await generateForAccountEnhanced(account.id, debugMode);
      const data = await result.json();
      
      return {
        accountId: account.id,
        accountName: account.name,
        success: data.success,
        generated: data.generated, // Keep the full object
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

  // Wait for all accounts to complete processing
  const results = await Promise.all(accountPromises);
  
  // Aggregate results with enhanced metrics
  const totalGenerated = results.reduce((sum, r) => sum + (r.generated?.total_content_units || 0), 0);
  const successfulAccounts = results.filter(r => r.success).length;
  const accountsWithGeneration = results.filter(r => (r.generated?.total_content_units || 0) > 0).length;
  
  // Include scheduling insights for monitoring
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


