// trigger/generate-content.ts
import { task, logger } from "@trigger.dev/sdk";
import { getGenerationBatchInfo } from '@/lib/schedule';
import { generatePost } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { savePost, generatePostId, getPostsByAccount, getRecentPatternData } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getPersonaByKey, getAllPersonas } from '@/lib/personas';


export const generateAccountContent = task({
  id: "generate-account-content",
  // 1 hour max duration. Vercel's limits do not apply here
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
    const selectedPersonaKey = batchInfo.generation_personas?.[0] || 'brand_engine';

    const canThreads = await canGenerateThreads(accountId);
    const personaSupportsThreads = canThreads; // Default to true for threads
    const rssPersonaKeys: string[] = []; // No longer supporting rss based personas

    const mockPersona = {
      id: 'mock-persona-id',
      name: 'Brand Engine Persona',
      key: selectedPersonaKey,
      description: '',
      config: {
        format_rules: [
          'No emojis or hashtags.', 
          'Use short, punchy sentences.', 
          'No marketing fluff or corporate speak.',
          'Start with a counter-intuitive or highly specific hook.',
          'Sound like a visionary industry expert or practitioner, not a marketer.'
        ]
      }
    } as any;

    const persona = mockPersona;

    const recentData = await getRecentPatternData(accountId, 50);
    const usedSourceUrls = recentData.usedSourceUrls;
    logger.info(`Fetched ${usedSourceUrls.length} already-used source URLs for deduplication`);

    // --- Check for Brand Profile ---
    const { brandProfileService } = await import('@/lib/brandEngine/BrandProfileService');
    const brandProfile = await brandProfileService.getByConnectedAccount(accountId);

    let generatedCount = 0;

    for (let i = 0; i < targetBatchSize; i++) {
      if (brandProfile) {
         // --- NEW BRAND ENGINE PIPELINE ---
         logger.info(`Using Perennial Brand Engine for ${accountId}...`);
         const { generateBrandPost } = await import('@/lib/generationService');
         const platform = (account.platform || 'twitter') as 'twitter' | 'linkedin';

         // Optional: get external context if persona uses RSS
         let externalContext = '';
         if (personaSupportsThreads || rssPersonaKeys.includes(selectedPersonaKey)) {
             const { getDynamicContext } = await import('@/lib/contentSource');
             externalContext = await getDynamicContext(selectedPersonaKey, 'single_tweet', accountId, selectedPersonaKey, usedSourceUrls);
         }

         const result = await generateBrandPost(brandProfile.id, persona, platform, externalContext);
         if (result) {
            await savePost({
              id: generatePostId(),
              connected_account_id: accountId,
              persona_id: persona?.id,
              persona: selectedPersonaKey,
              schedule_id: batchInfo.schedule_ids?.[0],
              content: result.post.content,
              status: 'ready', 
              content_type: 'single_tweet', 
              hashtags: result.post.hashtags || [],
              image_url: result.post.imageUrl,
              image_status: result.post.imageStatus || 'none',
              card_data: result.post.cardData ? JSON.stringify(result.post.cardData) : undefined,
              source_url: result.metadata.source_url, 
              created_at: new Date(),
              // Brand Engine metadata
              brand_profile_id: result.metadata.brand_profile_id,
              pillar_id: result.metadata.pillar_id,
              calendar_id: result.metadata.calendar_id,
              target_audience: result.metadata.target_audience,
              narrative_tags: result.metadata.narrative_tags,
              theme_summary: result.metadata.theme_summary
            });
            generatedCount++;
            if (result.metadata.source_url) {
               usedSourceUrls.push(result.metadata.source_url);
            }
         }

      } else {
         // --- LEGACY PIPELINE ---
         let selectedContentType = 'single_tweet';
         if (personaSupportsThreads) {
             selectedContentType = Math.random() < 0.20 ? 'thread' : 'single_tweet';
         }

         logger.info(`Generating ${selectedContentType} for ${accountId}...`);

         if (selectedContentType === 'thread') {
           const { getDynamicContext } = await import('@/lib/contentSource');
           const sourceContext = await getDynamicContext(selectedPersonaKey, '', accountId, selectedPersonaKey, usedSourceUrls);
           const threadResult = await generateThread({ connected_account_id: accountId, persona: selectedPersonaKey, sourceContext });
           
           if (threadResult) generatedCount++;
         } else {
           const { getDynamicContext } = await import('@/lib/contentSource');
           const sourceContext = await getDynamicContext(selectedPersonaKey, selectedContentType, accountId, selectedPersonaKey, usedSourceUrls);
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
             if (enhancedPost.sourceUrl) {
                usedSourceUrls.push(enhancedPost.sourceUrl);
             }
           }
         }
      }
    }

    logger.info(`Finished ${accountId}. Generated ${generatedCount} items.`);
    return { success: true, generated: generatedCount };
  },
});