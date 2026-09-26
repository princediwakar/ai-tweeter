// lib/brandEngine/KnowledgeSourceService.ts
// CRUD + crawl management for brand knowledge sources.

import { sqlWithRetry } from '../db';
import type {
  BrandKnowledgeSource,
  CreateKnowledgeSourceInput,
  BrandKnowledgeSnapshot,
  ExtractedData,
  SnapshotChanges,
} from './types';

class KnowledgeSourceService {
  // ── Read ──

  async getById(id: string): Promise<BrandKnowledgeSource | null> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_knowledge_sources WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapSource(result.rows[0]) : null;
  }

  async getByBrandProfile(brandProfileId: string): Promise<BrandKnowledgeSource[]> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_knowledge_sources
      WHERE brand_profile_id = ${brandProfileId} AND is_active = true
      ORDER BY created_at ASC
    `;
    return result.rows.map(this.mapSource);
  }

  async getSourcesDueForCrawl(): Promise<BrandKnowledgeSource[]> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_knowledge_sources
      WHERE is_active = true
        AND (next_crawl_at IS NULL OR next_crawl_at <= NOW())
        AND crawl_status != 'crawling'
      ORDER BY last_crawled_at ASC NULLS FIRST
      LIMIT 20
    `;
    return result.rows.map(this.mapSource);
  }

  // ── Create ──

  async create(input: CreateKnowledgeSourceInput): Promise<BrandKnowledgeSource> {
    const id = crypto.randomUUID();
    const result = await sqlWithRetry`
      INSERT INTO brand_knowledge_sources (
        id, brand_profile_id, url, source_type, label,
        crawl_depth, crawl_frequency, max_pages,
        crawl_status, is_active, created_at, updated_at
      ) VALUES (
        ${id},
        ${input.brand_profile_id},
        ${input.url},
        ${input.source_type || 'website'},
        ${input.label || null},
        ${input.crawl_depth || 2},
        ${input.crawl_frequency || 'weekly'},
        ${input.max_pages || 10},
        'pending',
        true,
        NOW(), NOW()
      )
      RETURNING *
    `;
    console.log(`[KnowledgeSource] Created: ${input.url} (${input.source_type || 'website'})`);
    return this.mapSource(result.rows[0]);
  }

  async createBatch(inputs: CreateKnowledgeSourceInput[]): Promise<BrandKnowledgeSource[]> {
    const results: BrandKnowledgeSource[] = [];
    for (const input of inputs) {
      results.push(await this.create(input));
    }
    return results;
  }

  // ── Update crawl state ──

  async markCrawling(id: string): Promise<void> {
    await sqlWithRetry`
      UPDATE brand_knowledge_sources
      SET crawl_status = 'crawling', updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  async markCompleted(id: string, pagesCrawled: number): Promise<void> {
    const nextCrawl = await this.calculateNextCrawl(id);
    await sqlWithRetry`
      UPDATE brand_knowledge_sources
      SET crawl_status = 'completed',
          last_crawled_at = NOW(),
          next_crawl_at = ${nextCrawl},
          pages_crawled = ${pagesCrawled},
          crawl_error = NULL,
          updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  async markFailed(id: string, error: string): Promise<void> {
    await sqlWithRetry`
      UPDATE brand_knowledge_sources
      SET crawl_status = 'failed',
          crawl_error = ${error},
          updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  // ── Delete ──

  async delete(id: string): Promise<void> {
    await sqlWithRetry`DELETE FROM brand_knowledge_sources WHERE id = ${id}`;
  }

  // ── Snapshots ──

  async saveSnapshot(data: {
    source_id: string;
    brand_profile_id: string;
    raw_content: string;
    raw_content_hash: string;
    extracted_data: ExtractedData;
    changes_from_previous: SnapshotChanges | null;
  }): Promise<BrandKnowledgeSnapshot> {
    const id = crypto.randomUUID();

    // Get next version number
    const versionResult = await sqlWithRetry`
      SELECT COALESCE(MAX(snapshot_version), 0) + 1 as next_version
      FROM brand_knowledge_snapshots
      WHERE source_id = ${data.source_id}
    `;
    const nextVersion = versionResult.rows[0].next_version;

    const result = await sqlWithRetry`
      INSERT INTO brand_knowledge_snapshots (
        id, source_id, brand_profile_id,
        raw_content, raw_content_hash,
        extracted_data, changes_from_previous,
        snapshot_version, crawled_at, processing_status,
        created_at
      ) VALUES (
        ${id},
        ${data.source_id},
        ${data.brand_profile_id},
        ${data.raw_content},
        ${data.raw_content_hash},
        ${JSON.stringify(data.extracted_data)}::jsonb,
        ${data.changes_from_previous ? JSON.stringify(data.changes_from_previous) : null}::jsonb,
        ${nextVersion},
        NOW(),
        'completed',
        NOW()
      )
      RETURNING *
    `;

    return this.mapSnapshot(result.rows[0]);
  }

  async getLatestSnapshot(sourceId: string): Promise<BrandKnowledgeSnapshot | null> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_knowledge_snapshots
      WHERE source_id = ${sourceId}
      ORDER BY snapshot_version DESC
      LIMIT 1
    `;
    return result.rows[0] ? this.mapSnapshot(result.rows[0]) : null;
  }

  async getLatestSnapshotsByBrand(brandProfileId: string): Promise<BrandKnowledgeSnapshot[]> {
    // Get the latest snapshot for each source of this brand
    const result = await sqlWithRetry`
      SELECT DISTINCT ON (source_id) *
      FROM brand_knowledge_snapshots
      WHERE brand_profile_id = ${brandProfileId}
        AND processing_status = 'completed'
      ORDER BY source_id, snapshot_version DESC
    `;
    return result.rows.map(this.mapSnapshot);
  }

  // ── Helpers ──

  private async calculateNextCrawl(sourceId: string): Promise<string> {
    const source = await this.getById(sourceId);
    if (!source) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const intervals: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      once: Infinity,
    };

    const interval = intervals[source.crawl_frequency] || intervals.weekly;
    if (interval === Infinity) {
      // 'once' — set far future so it never triggers again
      return new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    return new Date(Date.now() + interval).toISOString();
  }

  private mapSource(row: Record<string, unknown>): BrandKnowledgeSource {
    return {
      id: row.id as string,
      brand_profile_id: row.brand_profile_id as string,
      url: row.url as string,
      source_type: row.source_type as BrandKnowledgeSource['source_type'],
      label: row.label as string | null,
      crawl_depth: row.crawl_depth as number,
      crawl_frequency: row.crawl_frequency as BrandKnowledgeSource['crawl_frequency'],
      max_pages: row.max_pages as number,
      last_crawled_at: row.last_crawled_at as Date | null,
      next_crawl_at: row.next_crawl_at as Date | null,
      crawl_status: row.crawl_status as BrandKnowledgeSource['crawl_status'],
      crawl_error: row.crawl_error as string | null,
      pages_crawled: row.pages_crawled as number,
      is_active: row.is_active as boolean,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }

  private mapSnapshot(row: Record<string, unknown>): BrandKnowledgeSnapshot {
    return {
      id: row.id as string,
      source_id: row.source_id as string,
      brand_profile_id: row.brand_profile_id as string,
      raw_content: row.raw_content as string | null,
      raw_content_hash: row.raw_content_hash as string | null,
      extracted_data: (typeof row.extracted_data === 'string'
        ? JSON.parse(row.extracted_data)
        : row.extracted_data) as ExtractedData,
      changes_from_previous: row.changes_from_previous
        ? (typeof row.changes_from_previous === 'string'
          ? JSON.parse(row.changes_from_previous)
          : row.changes_from_previous) as SnapshotChanges
        : null,
      snapshot_version: row.snapshot_version as number,
      crawled_at: row.crawled_at as Date,
      processing_status: row.processing_status as BrandKnowledgeSnapshot['processing_status'],
      created_at: row.created_at as Date,
    };
  }
}

export const knowledgeSourceService = new KnowledgeSourceService();
