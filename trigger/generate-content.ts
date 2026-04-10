// trigger/generate-content.ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { getGenerationBatchInfo } from '@/lib/schedule';
import { generateTweet } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { saveTweet, generateTweetId, getTweetsByAccount } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getPersonaByKey, getAllPersonas } from '@/lib/personas';

export const generateAccountContent = task({
  id: "generate-account-content",
  // 1 hour max duration. Vercel's limits do not apply here.
  maxDuration: 3600, 
  run: async (payload: { accountId: string; debugMode?: boolean }) => {
    const { accountId, debugMode = false } = payload;
    
    logger.info(`Starting generation for account ${accountId}`);

    const account = await connectedAccountsService.getById(accountId) as any;
    if (!account || account.status !== 'active') {
      logger.info(`Account ${accountId} inactive or not found.`);
      return { success: false, reason: "Account inactive" };
    }

    const batchInfo = await getGenerationBatchInfo(account.account_username || account.twitter_handle, debugMode);
    
    if (!batchInfo.should_generate && !debugMode) {
      logger.info(`No generation scheduled for ${accountId}`);
      return { success: true, reason: "Not scheduled" };
    }

    const accountTweets = await getTweetsByAccount(accountId);
    const pendingTweets = accountTweets.filter(t => t.status !== 'posted' && t.status !== 'failed');
    const maxPipelineSize = account.branding?.max_pipeline_size || 30;

    if (pendingTweets.length >= maxPipelineSize) {
      logger.info(`Pipeline healthy for ${accountId}.`);
      return { success: true, reason: "Pipeline full" };
    }

    let targetBatchSize = Math.min(batchInfo.batch_size || 1, maxPipelineSize - pendingTweets.length);
    const selectedPersonaKey = batchInfo.generation_personas[0];
    if (!selectedPersonaKey) throw new Error("No persona found");

    const persona = await getPersonaByKey(selectedPersonaKey);
    const allPersonas = await getAllPersonas();
    const canThreads = await canGenerateThreads(account);
    const supportsThreading = account.branding?.supports_threads ?? canThreads;
    const personaSupportsThreads = supportsThreading && allPersonas.filter(p => (p.config as any)?.supports_threads).map(p => p.key).includes(selectedPersonaKey);

    let generatedCount = 0;

    // We can run this sequentially now because we don't care about Vercel's timeout
    for (let i = 0; i < targetBatchSize; i++) {
      let selectedContentType = 'single_tweet';
      if (personaSupportsThreads) {
          // 80% chance single tweet, 20% chance thread
          selectedContentType = Math.random() < 0.20 ? 'thread' : 'single_tweet';
      }

      logger.info(`Generating ${selectedContentType} for ${accountId}...`);

      if (selectedContentType === 'thread') {
        const { getDynamicContext } = await import('@/lib/contentSource');
        const sourceContext = await getDynamicContext(selectedPersonaKey, '', accountId, selectedPersonaKey);
        const threadResult = await generateThread({ connected_account_id: accountId, persona: selectedPersonaKey, sourceContext });
        
        if (threadResult) generatedCount++;
      } else {
        const { getDynamicContext } = await import('@/lib/contentSource');
        const sourceContext = await getDynamicContext(selectedPersonaKey, selectedContentType, accountId, selectedPersonaKey);
        const config = { persona: selectedPersonaKey, connected_account_id: accountId, topic: selectedContentType, sourceContext };
        
        const enhancedTweet = await generateTweet(config);
        
        if (enhancedTweet) {
          await saveTweet({
            id: generateTweetId(),
            connected_account_id: accountId,
            persona_id: persona?.id,
            persona: selectedPersonaKey,
            schedule_id: batchInfo.schedule_ids?.[0],
            content: enhancedTweet.content,
            status: 'ready', 
            content_type: 'single_tweet', 
            hashtags: enhancedTweet.hashtags || [],
            image_url: enhancedTweet.imageUrl,
            image_status: enhancedTweet.imageStatus || 'none',
            card_data: enhancedTweet.cardData ? JSON.stringify(enhancedTweet.cardData) : undefined,
            source_url: enhancedTweet.sourceUrl, 
            created_at: new Date().toISOString()
          });
          generatedCount++;
        }
      }
    }

    logger.info(`Finished ${accountId}. Generated ${generatedCount} items.`);
    return { success: true, generated: generatedCount };
  },
});