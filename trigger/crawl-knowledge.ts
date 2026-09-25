// trigger/crawl-knowledge.ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { knowledgeSourceService } from '@/lib/brandEngine/KnowledgeSourceService';
import { knowledgeEnrichmentPipeline } from '@/lib/brandEngine/KnowledgeEnrichmentPipeline';
import { brandProfileService } from '@/lib/brandEngine/BrandProfileService';
import { contentPillarService } from '@/lib/brandEngine/ContentPillarService';

export const crawlBrandKnowledge = task({
  id: "crawl-brand-knowledge",
  maxDuration: 3600, // 1 hour max
  run: async (payload: { brandProfileId: string; url: string }) => {
    logger.info(`Starting knowledge crawl for brand profile ${payload.brandProfileId} at ${payload.url}`);

    try {
      if (payload.url) {
        await knowledgeSourceService.create({
          brand_profile_id: payload.brandProfileId,
          url: payload.url,
          source_type: 'website'
        });
      }

      // 1. Run the extraction pipeline
      const pipelineResult = await knowledgeEnrichmentPipeline.enrichBrand(payload.brandProfileId);
      
      // 2. Fetch the updated brand profile
      const brand = await brandProfileService.getById(payload.brandProfileId);
      if (!brand) throw new Error("Brand profile not found after extraction");

      // 3. Generate initial content pillars based on the extracted knowledge
      if (brand.target_audiences && brand.target_audiences.length > 0) {
         logger.info(`Generating content pillars for brand ${payload.brandProfileId}...`);
         const suggested = await contentPillarService.suggestPillars(brand);
         await contentPillarService.createBatch(suggested);
      }

      // 4. Mark onboarding as ready
      await brandProfileService.update({ id: payload.brandProfileId, onboarding_status: 'ready' });

      logger.info(`Successfully crawled and enriched brand profile ${payload.brandProfileId}`);
      return { success: true, pipelineResult };
    } catch (error: any) {
      logger.error(`Failed to crawl brand knowledge: ${error.message}`, { error });
      // We could mark it as failed, but for now we can leave it pending or retry.
      throw error;
    }
  },
});
