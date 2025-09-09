import { NextRequest, NextResponse } from 'next/server';
import { 
  getReadyTweetsByAccount, 
  saveTweet, 
  getReadyThreads,
  getAccountByTwitterHandle
} from '@/lib/db';
import { postCompleteThread } from '@/lib/instantThreadService';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST } from '@/lib/utils';
import { 
  getScheduledPersonasForPosting, 
  getScheduledAccountIds,
  isPostingScheduled 
} from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import { postTweet, postTweetWithImage } from '@/lib/twitter';

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nowIST = getCurrentTimeInIST();
    const currentHourIST = nowIST.getHours();
    const dayOfWeek = nowIST.getDay();
    
    logger.info(`🔍 Multi-account posting check at ${currentHourIST}:00 IST (Day: ${dayOfWeek})`, 'auto-post');

    // Get all available account IDs with schedules
    const scheduledAccountIds = getScheduledAccountIds();
    
    if (scheduledAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `⚠️ No accounts configured with posting schedules`,
        scheduledPersonas: [],
        currentHour: currentHourIST,
        accountsProcessed: 0,
        totalPosted: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Check which accounts have posting scheduled for current time
    const activeScheduledAccounts: string[] = [];
    const allScheduledPersonas: string[] = [];

    for (const accountId of scheduledAccountIds) {
      if (isPostingScheduled(accountId, nowIST)) {
        activeScheduledAccounts.push(accountId);
        const personas = getScheduledPersonasForPosting(accountId, dayOfWeek, currentHourIST);
        allScheduledPersonas.push(...personas);
      }
    }

    if (activeScheduledAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: `⏳ No accounts scheduled for posting at ${currentHourIST}:00 IST`,
        scheduledPersonas: [],
        currentHour: currentHourIST,
        accountsProcessed: 0,
        totalPosted: 0,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`📋 Accounts scheduled for posting: ${activeScheduledAccounts.join(', ')}`, 'auto-post');
    logger.info(`📋 Personas scheduled for posting: ${allScheduledPersonas.join(', ')}`, 'auto-post');

    // Get all active accounts
    const accounts = await accountService.getAllAccounts();
    logger.info(`👥 Processing ${accounts.length} active accounts`, 'auto-post');
    
    const accountResults = [];
    let totalPosted = 0;
    let totalErrors = 0;

    // Process each account separately
    for (const account of accounts) {
      try {
        logger.info(`🏢 Processing account: ${account.name} (@${account.twitter_handle})`, 'auto-post');
        
        // Skip accounts not scheduled for posting at this time
        if (!activeScheduledAccounts.includes(account.id)) {
          logger.info(`⏭️ Account ${account.name} not scheduled for posting at this time`, 'auto-post');
          continue;
        }
        
        // Get ready tweets for this account
        const readyTweets = await getReadyTweetsByAccount(account.id);
        
        // Get scheduled personas for this specific account
        const accountScheduledPersonas = getScheduledPersonasForPosting(account.id, dayOfWeek, currentHourIST);
        
        // Filter tweets by scheduled personas for this account
        const scheduledTweets = readyTweets.filter(tweet =>
          accountScheduledPersonas.includes(tweet.persona)
        );

        logger.info(`📝 Found ${scheduledTweets.length} scheduled tweets for ${account.name}`, 'auto-post');

        let accountPosted = 0;
        const accountErrors: string[] = [];

        // Create Twitter credentials for this account
        const twitterCredentials = {
          apiKey: account.twitter_api_key,
          apiSecret: account.twitter_api_secret,
          accessToken: account.twitter_access_token,
          accessSecret: account.twitter_access_token_secret,
        };

        // Post tweets for this account
        for (const tweet of scheduledTweets) {
          try {
            logger.info(`📤 ${account.name}: Posting tweet: ${tweet.content.substring(0, 50)}...`, 'auto-post');
            
            // Check if this is an image-enabled persona
            const { getPersonaByKey } = await import('@/lib/personas');
            const persona = getPersonaByKey(tweet.persona);
            
            let result;
            
            // Handle image tweets for image-enabled personas
            if (persona?.image_generation?.enabled && tweet.persona === 'english_vocab_builder') {
              logger.info(`🖼️ ${account.name}: Generating image for vocabulary tweet`, 'auto-post');
              
              try {
                // Generate image for this tweet
                const { generatePersonaImage } = await import('@/lib/imageGenerationService');
                const imageBuffer = await generatePersonaImage(tweet.content, tweet.persona);
                
                if (imageBuffer) {
                  // Post with image and minimal hashtag text
                  const minimalContent = tweet.hashtags?.length > 0 
                    ? tweet.hashtags.map(tag => `#${tag}`).join(' ')
                    : '#EnglishLearning #Vocabulary';
                  
                  logger.info(`🖼️ ${account.name}: Posting image tweet with minimal text`, 'auto-post');
                  result = await postTweetWithImage(minimalContent, imageBuffer, twitterCredentials);
                } else {
                  // Fallback to text tweet if image generation fails
                  logger.warn(`⚠️ ${account.name}: Image generation failed, posting as text`, 'auto-post');
                  const fullContent = tweet.hashtags?.length > 0 
                    ? `${tweet.content}\n\n${tweet.hashtags.map(tag => `#${tag}`).join(' ')}`
                    : tweet.content;
                  result = await postTweet(fullContent, twitterCredentials);
                }
              } catch (imageError) {
                logger.warn(`⚠️ ${account.name}: Image generation/posting failed, falling back to text: ${imageError}`, 'auto-post');
                // Fallback to text tweet
                const fullContent = tweet.hashtags?.length > 0 
                  ? `${tweet.content}\n\n${tweet.hashtags.map(tag => `#${tag}`).join(' ')}`
                  : tweet.content;
                result = await postTweet(fullContent, twitterCredentials);
              }
            } else {
              // Regular text tweet
              const fullContent = tweet.hashtags?.length > 0 
                ? `${tweet.content}\n\n${tweet.hashtags.map(tag => `#${tag}`).join(' ')}`
                : tweet.content;
              
              result = await postTweet(fullContent, twitterCredentials);
            }
            
            // Update tweet status
            const updatedTweet = {
              ...tweet,
              status: 'posted' as const,
              postedAt: new Date().toISOString(),
              twitterId: result.data.id,
              twitterUrl: `https://x.com/${account.twitter_handle}/status/${result.data.id}`,
              posted_at: new Date().toISOString(),
              twitter_id: result.data.id,
              twitter_url: `https://x.com/${account.twitter_handle}/status/${result.data.id}`
            };
            
            await saveTweet(updatedTweet);
            accountPosted++;
            totalPosted++;
            
            logger.info(`✅ ${account.name}: Posted tweet ${tweet.id} - Twitter ID: ${result.data.id}`, 'auto-post');
            
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`❌ ${account.name}: Failed to post tweet ${tweet.id}: ${errorMsg}`, 'auto-post', error as Error);
            
            // Mark tweet as failed
            const failedTweet = {
              ...tweet,
              status: 'failed' as const,
              errorMessage: errorMsg,
              error_message: errorMsg
            };
            await saveTweet(failedTweet);
            
            accountErrors.push(`Tweet ${tweet.id}: ${errorMsg}`);
            totalErrors++;
          }
        }

        accountResults.push({
          account: {
            id: account.id,
            name: account.name,
            twitter_handle: account.twitter_handle
          },
          found: scheduledTweets.length,
          posted: accountPosted,
          errors: accountErrors.length,
          errorDetails: accountErrors
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to process account ${account.name}: ${errorMsg}`, 'auto-post', error as Error);
        
        accountResults.push({
          account: {
            id: account.id,
            name: account.name,
            twitter_handle: account.twitter_handle
          },
          found: 0,
          posted: 0,
          errors: 1,
          errorDetails: [`Account processing failed: ${errorMsg}`]
        });
        totalErrors++;
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      currentTime: `${nowIST.getHours()}:${nowIST.getMinutes().toString().padStart(2, '0')} IST`,
      scheduledPersonas: allScheduledPersonas,
      accountsProcessed: accounts.length,
      totalPosted,
      totalErrors,
      accountResults,
      message: totalPosted > 0 
        ? `🚀 Posted ${totalPosted} tweets across ${accounts.length} accounts!`
        : accounts.length > 0
          ? `⏳ No tweets ready to post from ${accounts.length} accounts at this time`
          : '👥 No active accounts found',
    };

    logger.info(`📊 Multi-account posting summary: ${totalPosted} posted, ${totalErrors} errors across ${accounts.length} accounts`, 'auto-post');
    
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Multi-account posting failed', 'auto-post', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process multi-account posting',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Enhanced POST method with instant thread posting
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestBody = await request.json().catch(() => ({}));
    
    const nowIST = getCurrentTimeInIST();
    const currentHourIST = nowIST.getHours();
    const dayOfWeek = nowIST.getDay();
    
    logger.info(`🚀 Instant thread posting system check at ${nowIST.getHours()}:${nowIST.getMinutes().toString().padStart(2, '0')} IST`, 'auto-post');

    // Handle specific account filtering
    let scheduledAccountIds = getScheduledAccountIds();
    
    // Filter by account_id if provided
    if (requestBody.account_id) {
      scheduledAccountIds = scheduledAccountIds.filter(id => id === requestBody.account_id);
      logger.info(`🎯 Filtering to specific account_id: ${requestBody.account_id}`, 'auto-post');
    }
    
    // Filter by twitter_handle if provided
    if (requestBody.twitter_handle) {
      const account = await getAccountByTwitterHandle(requestBody.twitter_handle);
      if (!account) {
        return NextResponse.json({ 
          error: `Account not found for Twitter handle: ${requestBody.twitter_handle}` 
        }, { status: 404 });
      }
      scheduledAccountIds = [account.id];
      logger.info(`🎯 Filtering to Twitter handle: ${requestBody.twitter_handle} (${account.id})`, 'auto-post');
    }
    
    if (scheduledAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `⚠️ No accounts configured with posting schedules`,
        accountsProcessed: 0,
        totalPosted: 0,
        threadsPosted: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Get filtered accounts based on scheduledAccountIds
    const allAccounts = await accountService.getAllAccounts();
    const accounts = allAccounts.filter(account => scheduledAccountIds.includes(account.id));
    
    let totalPosted = 0;
    let totalErrors = 0;
    let threadsPosted = 0;
    const accountResults = [];

    // Process each account with instant thread posting
    for (const account of accounts) {
      try {
        logger.info(`🏢 Processing account: ${account.name} (@${account.twitter_handle})`, 'auto-post');
        
        let accountPosted = 0;
        const accountErrors: string[] = [];
        let readyThreadsCount = 0;

        // Create Twitter credentials for this account
        const twitterCredentials = {
          apiKey: account.twitter_api_key,
          apiSecret: account.twitter_api_secret,
          accessToken: account.twitter_access_token,
          accessSecret: account.twitter_access_token_secret,
        };

        // Check if posting is scheduled for this account
        const debugMode = process.env.DEBUG_MODE === 'true';
        if (debugMode || isPostingScheduled(account.id, nowIST)) {
          // Get scheduled personas for this specific account
          const accountScheduledPersonas = debugMode ? ['tech_commentary', 'business_storyteller', 'satirist', 'cricket_storyteller'] : getScheduledPersonasForPosting(account.id, dayOfWeek, currentHourIST);
          
          // PRIORITY 1: Post ready threads instantly (highest priority)
          const readyThreads = await getReadyThreads(account.id);
          const scheduledThreads = readyThreads.filter(thread =>
            accountScheduledPersonas.includes(thread.persona)
          );
          readyThreadsCount = scheduledThreads.length;

          if (scheduledThreads.length > 0) {
            try {
              const threadToPost = scheduledThreads[0]; // Post oldest ready thread
              logger.info(`🚀 ${account.name}: Posting complete thread "${threadToPost.title}" (${threadToPost.total_tweets} tweets)`, 'auto-post');
              
              // Post the entire thread at once using instant thread service
              const threadResult = await postCompleteThread(
                threadToPost.id,
                account.id,
                threadToPost.total_tweets,
                twitterCredentials,
                account.twitter_handle
              );

              if (threadResult.success) {
                accountPosted += threadResult.tweets_posted;
                totalPosted += threadResult.tweets_posted;
                threadsPosted++;
                
                logger.info(`✅ ${account.name}: Posted complete thread "${threadToPost.title}" - ${threadResult.tweets_posted} tweets`, 'auto-post');
                logger.info(`🔗 Thread URL: https://x.com/${account.twitter_handle.replace('@', '')}/status/${threadResult.twitter_ids[0]}`, 'auto-post');
              } else {
                accountErrors.push(`Thread ${threadToPost.id}: ${threadResult.error}`);
                totalErrors++;
                logger.error(`❌ ${account.name}: Failed to post thread "${threadToPost.title}": ${threadResult.error}`, 'auto-post');
              }
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              logger.error(`❌ ${account.name}: Failed to post thread: ${errorMsg}`, 'auto-post', error as Error);
              accountErrors.push(`Thread posting: ${errorMsg}`);
              totalErrors++;
            }
          } else {
            // PRIORITY 2: Fall back to single tweets if no threads are ready
            const readyTweets = await getReadyTweetsByAccount(account.id);
            const scheduledTweets = readyTweets.filter(tweet =>
              (debugMode || accountScheduledPersonas.includes(tweet.persona)) && tweet.content_type === 'single_tweet'
            );

            if (scheduledTweets.length > 0) {
              const tweet = scheduledTweets[0]; // Post oldest ready single tweet
              
              try {
                logger.info(`📤 ${account.name}: Posting single tweet: ${tweet.content.substring(0, 50)}...`, 'auto-post');
                
                // Combine content with hashtags
                const fullContent = tweet.hashtags?.length > 0 
                  ? `${tweet.content}\n\n${tweet.hashtags.map(tag => `#${tag}`).join(' ')}`
                  : tweet.content;
                
                const result = await postTweet(fullContent, twitterCredentials);
                
                // Update tweet status
                const updatedTweet = {
                  ...tweet,
                  status: 'posted' as const,
                  posted_at: new Date().toISOString(),
                  twitter_id: result.data.id,
                  twitter_url: `https://x.com/${account.twitter_handle}/status/${result.data.id}`
                };
                
                await saveTweet(updatedTweet);
                accountPosted++;
                totalPosted++;
                
                logger.info(`✅ ${account.name}: Posted single tweet ${tweet.id} - Twitter ID: ${result.data.id}`, 'auto-post');
                
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error(`❌ ${account.name}: Failed to post single tweet ${tweet.id}: ${errorMsg}`, 'auto-post', error as Error);
                
                // Mark tweet as failed
                const failedTweet = {
                  ...tweet,
                  status: 'failed' as const,
                  error_message: errorMsg
                };
                await saveTweet(failedTweet);
                
                accountErrors.push(`Tweet ${tweet.id}: ${errorMsg}`);
                totalErrors++;
              }
            } else {
              logger.info(`📋 ${account.name}: No ready content (threads or single tweets) found`, 'auto-post');
            }
          }
        } else {
          logger.info(`⏭️ ${account.name}: No posting scheduled at this time`, 'auto-post');
        }

        accountResults.push({
          account: {
            id: account.id,
            name: account.name,
            twitter_handle: account.twitter_handle
          },
          posted: accountPosted,
          errors: accountErrors.length,
          errorDetails: accountErrors,
          readyThreads: readyThreadsCount
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Failed to process account ${account.name}: ${errorMsg}`, 'auto-post', error as Error);
        
        accountResults.push({
          account: {
            id: account.id,
            name: account.name,
            twitter_handle: account.twitter_handle
          },
          posted: 0,
          errors: 1,
          errorDetails: [`Account processing failed: ${errorMsg}`],
          hasActiveThread: false
        });
        totalErrors++;
      }
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      currentTime: `${nowIST.getHours()}:${nowIST.getMinutes().toString().padStart(2, '0')} IST`,
      accountsProcessed: accounts.length,
      totalPosted,
      totalErrors,
      threadsPosted,
      accountResults,
      message: totalPosted > 0 
        ? `🚀 Posted ${totalPosted} tweets (${threadsPosted} complete threads) across ${accounts.length} accounts!`
        : accounts.length > 0
          ? `⏳ No content ready to post from ${accounts.length} accounts at this time`
          : '👥 No active accounts found',
    };

    logger.info(`📊 Instant thread posting summary: ${totalPosted} posted (${threadsPosted} complete threads), ${totalErrors} errors across ${accounts.length} accounts`, 'auto-post');
    
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Instant thread posting system failed', 'auto-post', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process instant thread posting system',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
