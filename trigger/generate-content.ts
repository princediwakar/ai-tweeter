// trigger/generate-content.ts
import { task, logger } from "@trigger.dev/sdk";
import { getGenerationBatchInfo } from '@/lib/schedule';
import { generateBrandPost } from '@/lib/generationService';
import { savePost, generatePostId, getPostsByAccount, getRecentPatternData } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { brandProfileService } from '@/lib/brandEngine/BrandProfileService';

export const generateAccountContent = task({
  id: "generate-account-content",
  maxDuration: 3600, // 1 hour max duration
  run: async (payload: { accountId: string; debugMode?: boolean }) => {
    const { accountId, debugMode = false } = payload;
    
    logger.info(`Starting Brand Engine generation for account ${accountId}`);

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
      logger.info(`Pipeline healthy for ${accountId} (${pendingPosts.length} pending posts).`);
      return { success: true, reason: "Pipeline full" };
    }

    const targetBatchSize = Math.min(batchInfo.batch_size || 1, 30 - pendingPosts.length);

    // Fetch the brand profile for this account
    let brandProfile = await brandProfileService.getByConnectedAccount(accountId);
    if (!brandProfile && account.user_id) {
      const userBrands = await brandProfileService.getByUser(account.user_id);
      brandProfile = userBrands[0] || null;
    }

    if (!brandProfile) {
      logger.warn(`No brand profile found for account ${accountId}. Please create or connect a brand profile.`);
      return { success: false, reason: "No brand profile found" };
    }

    const brandPersona = {
      id: brandProfile.id,
      name: brandProfile.brand_name,
      key: 'brand_engine',
      description: brandProfile.brand_description || '',
      config: {
        format_rules: [
          'No emojis or hashtags.', 
          'Use short, punchy sentences.', 
          'No marketing fluff or corporate speak.',
          'Start with a counter-intuitive or highly specific hook.',
          'Sound authentic and practitioner-focused.'
        ]
      }
    } as any;

    const recentData = await getRecentPatternData(accountId, 50);
    const usedSourceUrls = recentData.usedSourceUrls;
    const platform = (account.platform || 'twitter') as 'twitter' | 'linkedin';

    let generatedCount = 0;

    for (let i = 0; i < targetBatchSize; i++) {
      logger.info(`Generating brand post ${i + 1}/${targetBatchSize} for ${brandProfile.brand_name} on ${platform}...`);
      
      const result = await generateBrandPost(brandProfile.id, brandPersona, platform);
      if (result) {
        await savePost({
          id: generatePostId(),
          user_id: account.user_id,
          connected_account_id: accountId,
          schedule_id: batchInfo.schedule_ids?.[0],
          content: result.post.content,
          status: brandProfile.autonomy_mode === 'autopilot' ? 'ready' : 'draft', 
          hashtags: result.post.hashtags || [],
          image_url: result.post.imageUrl,
          card_data: result.post.cardData ? JSON.stringify(result.post.cardData) : undefined,
          created_at: new Date(),
          // Brand Engine metadata
          brand_profile_id: result.metadata.brand_profile_id,
          pillar_id: result.metadata.pillar_id,
          calendar_id: result.metadata.calendar_id,
          target_audience: result.metadata.target_audience,
          narrative_tags: result.metadata.narrative_tags,
          theme_summary: result.metadata.theme_summary,
        });

        generatedCount++;
        if (result.metadata.source_url) {
          usedSourceUrls.push(result.metadata.source_url);
        }
      }
    }

    logger.info(`Finished generation for account ${accountId}. Successfully created ${generatedCount} post(s).`);
    return { success: true, generated: generatedCount };
  },
});
