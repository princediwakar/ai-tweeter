// lib/brandEngine/KnowledgeEnrichmentPipeline.ts
// Crawl brand sources → AI extract structured knowledge → save snapshots → detect changes.
// Uses existing Jina integration for page extraction.

import { createHash } from 'node:crypto';
import { getDeepseekClientAsync } from '../generationService';
import { GENERATION_CONFIG } from '../generation/config';
import { knowledgeSourceService } from './KnowledgeSourceService';
import { brandProfileService } from './BrandProfileService';
import type {
  BrandKnowledgeSource,
  CrawledPage,
  ExtractedData,
  SnapshotChanges,
  EnrichmentResult,
  KnowledgeSourceType,
} from './types';

// ── Extraction prompts per source type ──────────────────────────────────────

const EXTRACTION_PROMPTS: Record<string, string> = {
  website: `You are a brand analyst. Extract structured information from this website content.
Return ONLY valid JSON with these fields:
{
  "company_name": "string",
  "tagline": "string or null",
  "value_propositions": ["specific benefit statements"],
  "target_audiences": ["who this product/service is for"],
  "features": ["specific product capabilities"],
  "differentiators": ["what makes this different from alternatives"],
  "tone_signals": ["how the brand communicates, e.g. professional, casual, technical"],
  "social_proof": ["specific numbers, testimonials, client mentions"]
}
Be specific. Don't invent data. If something isn't present, use empty array.`,

  blog: `You are a content analyst. Extract structured information from this blog content.
Return ONLY valid JSON:
{
  "recent_posts": [{"title": "string", "url": "string or empty", "date": "string or empty", "summary": "2-sentence summary", "topics": ["tag1", "tag2"]}],
  "content_themes": ["recurring themes across posts"],
  "writing_style_signals": ["e.g. data-driven, storytelling, technical, casual"]
}
Extract up to 10 recent posts. Be specific about topics.`,

  changelog: `Extract product updates from this changelog.
Return ONLY valid JSON:
{
  "recent_updates": [{"date": "string", "title": "string", "description": "1-sentence description", "is_major": true/false}],
  "feature_velocity": "description of how frequently they ship"
}
Extract up to 15 recent updates.`,

  pricing: `Extract pricing information from this page.
Return ONLY valid JSON:
{
  "plans": [{"name": "string", "price": "string", "features": ["string"], "target_segment": "string or null"}],
  "free_trial": true/false,
  "target_segment": "overall target market"
}`,

  docs: `Extract product capabilities from this documentation.
Return ONLY valid JSON:
{
  "capabilities": ["specific things the product can do"],
  "integrations": ["third-party services it connects with"],
  "api_available": true/false
}`,

  about: `Extract company information from this about page.
Return ONLY valid JSON:
{
  "company_name": "string",
  "mission": "string or null",
  "team_size_signal": "string or null",
  "founding_story": "string or null",
  "values": ["company values"],
  "social_proof": ["achievements, press mentions, numbers"]
}`,
};

// ── Pipeline ────────────────────────────────────────────────────────────────

export class KnowledgeEnrichmentPipeline {

  /**
   * Enrich a single knowledge source: crawl → extract → snapshot → detect changes.
   */
  async enrichSource(source: BrandKnowledgeSource): Promise<EnrichmentResult> {
    console.log(`[Enrichment] Starting enrichment for ${source.url} (${source.source_type})`);

    try {
      await knowledgeSourceService.markCrawling(source.id);

      // 1. Crawl pages using Jina
      const pages = await this.crawlSource(source);
      if (pages.length === 0) {
        await knowledgeSourceService.markFailed(source.id, 'No content extracted');
        return { source_id: source.id, snapshot_id: '', changes_detected: false };
      }

      // 2. Hash content — skip if unchanged
      const rawContent = pages.map(p => p.content).join('\n---PAGE_BREAK---\n');
      const contentHash = this.hashContent(rawContent);
      const lastSnapshot = await knowledgeSourceService.getLatestSnapshot(source.id);

      if (lastSnapshot?.raw_content_hash === contentHash) {
        console.log(`[Enrichment] Content unchanged for ${source.url}, skipping extraction`);
        await knowledgeSourceService.markCompleted(source.id, pages.length);
        return { source_id: source.id, snapshot_id: lastSnapshot.id, changes_detected: false };
      }

      // 3. AI extraction
      const extracted = await this.aiExtract(rawContent, source.source_type);

      // 4. Change detection
      const changes = lastSnapshot
        ? this.detectChanges(extracted, lastSnapshot.extracted_data as Record<string, any>)
        : null;

      // 5. Save snapshot
      const snapshot = await knowledgeSourceService.saveSnapshot({
        source_id: source.id,
        brand_profile_id: source.brand_profile_id,
        raw_content: rawContent,
        raw_content_hash: contentHash,
        extracted_data: extracted,
        changes_from_previous: changes,
      });

      // 6. Mark completed
      await knowledgeSourceService.markCompleted(source.id, pages.length);

      // 7. If significant changes, merge into brand profile
      if (changes && (changes.new_features?.length || changes.new_testimonials?.length)) {
        await brandProfileService.mergeKnowledge(source.brand_profile_id, {
          features: changes.new_features,
          social_proof: changes.new_testimonials,
        });
        console.log(`[Enrichment] Merged changes into brand profile: ${source.brand_profile_id}`);
      }

      // First-time crawl: seed the brand profile with extracted data
      if (!lastSnapshot && source.source_type === 'website') {
        const websiteData = extracted as Record<string, any>;
        await brandProfileService.mergeKnowledge(source.brand_profile_id, {
          features: websiteData.features || [],
          differentiators: websiteData.differentiators || [],
          social_proof: websiteData.social_proof || [],
          value_propositions: websiteData.value_propositions || [],
        });
      }

      console.log(`[Enrichment] Completed ${source.url}: ${pages.length} pages, changes=${!!changes}`);

      return {
        source_id: source.id,
        snapshot_id: snapshot.id,
        changes_detected: !!changes,
        changes: changes || undefined,
      };

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Enrichment] Failed for ${source.url}: ${errMsg}`);
      await knowledgeSourceService.markFailed(source.id, errMsg);
      return { source_id: source.id, snapshot_id: '', changes_detected: false };
    }
  }

  /**
   * Enrich all sources for a brand profile.
   */
  async enrichBrand(brandProfileId: string): Promise<EnrichmentResult[]> {
    const sources = await knowledgeSourceService.getByBrandProfile(brandProfileId);
    const results: EnrichmentResult[] = [];

    for (const source of sources) {
      const result = await this.enrichSource(source);
      results.push(result);
    }

    return results;
  }

  // ── Crawling ──────────────────────────────────────────────────────────────

  private async crawlSource(source: BrandKnowledgeSource): Promise<CrawledPage[]> {
    const pages: CrawledPage[] = [];

    try {
      // Primary crawl using Jina reader
      const mainPage = await this.fetchWithJina(source.url);
      if (mainPage) {
        pages.push(mainPage);
      }

      // If crawl_depth > 1, follow internal links
      if (source.crawl_depth > 1 && mainPage && mainPage.links.length > 0) {
        const internalLinks = mainPage.links
          .filter(link => this.isSameDomain(link, source.url))
          .slice(0, source.max_pages - 1);

        for (const link of internalLinks) {
          if (pages.length >= source.max_pages) break;
          try {
            const subPage = await this.fetchWithJina(link);
            if (subPage) pages.push(subPage);
          } catch {
            // Skip failed sub-pages
          }
        }
      }
    } catch (error) {
      console.error(`[Enrichment] Crawl failed for ${source.url}:`, error);
    }

    return pages;
  }

  private async fetchWithJina(url: string): Promise<CrawledPage | null> {
    try {
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Accept': 'application/json',
          'X-Return-Format': 'markdown',
        },
      });

      if (!response.ok) {
        console.warn(`[Enrichment] Jina returned ${response.status} for ${url}`);
        return null;
      }

      const data = await response.json();

      // Extract links from the content
      const linkRegex = /https?:\/\/[^\s"')\]]+/g;
      const links = (data.text || '').match(linkRegex) || [];

      return {
        url,
        title: data.title || '',
        content: data.text || data.content || '',
        links: [...new Set(links)] as string[],
      };
    } catch (error) {
      console.warn(`[Enrichment] Jina extraction failed for ${url}:`, error);
      return null;
    }
  }

  // ── AI Extraction ─────────────────────────────────────────────────────────

  private async aiExtract(content: string, sourceType: KnowledgeSourceType): Promise<ExtractedData> {
    const prompt = EXTRACTION_PROMPTS[sourceType] || EXTRACTION_PROMPTS.website;

    // Truncate content to avoid token limits (roughly 15k chars → ~4k tokens)
    const truncatedContent = content.length > 15000
      ? content.substring(0, 15000) + '\n\n[...content truncated...]'
      : content;

    try {
      const client = await getDeepseekClientAsync();
      const response = await client.chat.completions.create({
        model: GENERATION_CONFIG.ai.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Extract structured information from this content:\n\n${truncatedContent}` },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0].message.content;
      if (!raw) return {};

      return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    } catch (error) {
      console.error(`[Enrichment] AI extraction failed:`, error);
      return {};
    }
  }

  // ── Change Detection ──────────────────────────────────────────────────────

  private detectChanges(
    current: Record<string, any>,
    previous: Record<string, any>
  ): SnapshotChanges | null {
    const changes: SnapshotChanges = {};
    let hasChanges = false;

    // Detect new features
    const currentFeatures = current.features || [];
    const previousFeatures = previous.features || [];
    const newFeatures = currentFeatures.filter(
      (f: string) => !previousFeatures.some((pf: string) => pf.toLowerCase() === f.toLowerCase())
    );
    if (newFeatures.length > 0) {
      changes.new_features = newFeatures;
      hasChanges = true;
    }

    // Detect new blog posts
    const currentPosts = current.recent_posts || [];
    const previousPosts = previous.recent_posts || [];
    const previousUrls = new Set(previousPosts.map((p: any) => p.url));
    const newPosts = currentPosts.filter((p: any) => p.url && !previousUrls.has(p.url));
    if (newPosts.length > 0) {
      changes.new_blog_posts = newPosts.map((p: any) => ({
        title: p.title,
        url: p.url,
        summary: p.summary || '',
      }));
      hasChanges = true;
    }

    // Detect new social proof / testimonials
    const currentProof = current.social_proof || [];
    const previousProof = previous.social_proof || [];
    const newProof = currentProof.filter(
      (p: string) => !previousProof.some((pp: string) => pp.toLowerCase() === p.toLowerCase())
    );
    if (newProof.length > 0) {
      changes.new_testimonials = newProof;
      hasChanges = true;
    }

    // Detect pricing changes
    if (current.plans && previous.plans) {
      const currentPricing = JSON.stringify(current.plans);
      const previousPricing = JSON.stringify(previous.plans);
      if (currentPricing !== previousPricing) {
        changes.pricing_changed = true;
        hasChanges = true;
      }
    }

    return hasChanges ? changes : null;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private isSameDomain(link: string, baseUrl: string): boolean {
    try {
      const linkHost = new URL(link).hostname;
      const baseHost = new URL(baseUrl).hostname;
      return linkHost === baseHost;
    } catch {
      return false;
    }
  }
}

export const knowledgeEnrichmentPipeline = new KnowledgeEnrichmentPipeline();
