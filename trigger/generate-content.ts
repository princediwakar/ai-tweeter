// trigger/generate-content.ts
import { task, logger } from "@trigger.dev/sdk";
import { getGenerationBatchInfo } from '@/lib/schedule';
import { generatePost } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { savePost, generatePostId, getPostsByAccount } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getPersonaByKey, getAllPersonas } from '@/lib/personas';

export const generateAccountContent = task({
  id: "generate-account-content",
  // 1 hour max duration. Vercel's limits do not apply here.
  maxDuration: 3600, 
  run: async (payload: { accountId: string; debugMode?: boolean }) => {
    const { accountId, debugMode = false } = payload;
    
    logger.info(`Starting generation for account ${accountId}`);

    const account = await connectedAccountsService.getById(accountId);
    if (!account || account.status !== 'active') {
      logger.info(`Account ${accountId} inactive or not found.`);
      return { success: false, reason: "Account inactive" };
    }

    const batchInfo = await getGenerationBatchInfo(account.account_username, debugMode);
    
    if (!batchInfo.should_generate && !debugMode) {
      logger.info(`No generation scheduled for ${accountId}`);
      return { success: true, reason: "Not scheduled" };
    }

    const accountPosts = await getPostsByAccount(accountId);
    const pendingPosts = accountPosts.filter(t => t.status !== 'posted' && t.status !== 'failed');

    if (pendingPosts.length >= 30) {
      logger.info(`Pipeline healthy for ${accountId}.`);
      return { success: true, reason: "Pipeline full" };
    }

    let targetBatchSize = Math.min(batchInfo.batch_size || 1, 30 - pendingPosts.length);
    const selectedPersonaKey = batchInfo.generation_personas[0];
    if (!selectedPersonaKey) throw new Error("No persona found");

    const persona = await getPersonaByKey(selectedPersonaKey);
    const allPersonas = await getAllPersonas();
    const canThreads = await canGenerateThreads(accountId);
    const personaSupportsThreads = canThreads && allPersonas.filter(p => (p.config as any)?.supports_threads).map(p => p.key).includes(selectedPersonaKey);

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
        
        const enhancedPost = await generatePost(config);
        
        if (enhancedPost) {
          await savePost({
            id: generatePostId(),
            connected_account_id: accountId,
            persona_id: persona?.id,
            persona: selectedPersonaKey,
            schedule_id: batchInfo.schedule_ids?.[0],
            content: enhancedPost.content,
            status: 'ready', 
            content_type: 'single_tweet', 
            hashtags: enhancedPost.hashtags || [],
            image_url: enhancedPost.imageUrl,
            image_status: enhancedPost.imageStatus || 'none',
            card_data: enhancedPost.cardData ? JSON.stringify(enhancedPost.cardData) : undefined,
            source_url: enhancedPost.sourceUrl, 
            created_at: new Date()
          });
          generatedCount++;
        }
      }
    }

    logger.info(`Finished ${accountId}. Generated ${generatedCount} items.`);
    return { success: true, generated: generatedCount };
  },
});