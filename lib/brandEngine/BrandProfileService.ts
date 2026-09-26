// lib/brandEngine/BrandProfileService.ts
// CRUD for brand profiles. Scoped to user_id.

import { sqlWithRetry } from '../db';
import type {
  BrandProfile,
  CreateBrandProfileInput,
  UpdateBrandProfileInput,
  ValueProposition,
  TargetAudience,
} from './types';

class BrandProfileService {
  // ── Read ──

  async getById(id: string): Promise<BrandProfile | null> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_profiles WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async getByUser(userId: string): Promise<BrandProfile[]> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_profiles
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return result.rows.map(this.mapRow.bind(this));
  }

  async getByConnectedAccount(accountId: string): Promise<BrandProfile | null> {
    // Look up any brand that uses this connected account for Twitter or LinkedIn
    const result = await sqlWithRetry`
      SELECT id FROM brand_profiles 
      WHERE twitter_account_id = ${accountId} OR linkedin_account_id = ${accountId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    if (result.rows.length === 0) return null;
    return this.getById(result.rows[0].id);
  }

  async getActiveProfiles(): Promise<BrandProfile[]> {
    const result = await sqlWithRetry`
      SELECT * FROM brand_profiles
      ORDER BY updated_at DESC
    `;
    return result.rows.map(this.mapRow.bind(this));
  }

  // ── Create ──

  async create(input: CreateBrandProfileInput): Promise<BrandProfile> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await sqlWithRetry`
      INSERT INTO brand_profiles (
        id, user_id, connected_account_id,
        twitter_account_id, linkedin_account_id, linkedin_platform_id,
        brand_name, brand_url, brand_description,
        value_propositions, target_audiences, features, differentiators, social_proof,
        brand_voice, brand_mission, competitive_angle,
        never_say, never_topics,
        is_active, onboarding_status,
        created_at, updated_at
      ) VALUES (
        ${id},
        ${input.user_id},
        ${input.connected_account_id || null},
        ${input.twitter_account_id || null},
        ${input.linkedin_account_id || null},
        ${input.linkedin_platform_id || null},
        ${input.brand_name},
        ${input.brand_url || null},
        ${input.brand_description || ''},
        ${JSON.stringify(input.value_propositions || [])}::jsonb,
        ${JSON.stringify(input.target_audiences || [])}::jsonb,
        ${JSON.stringify(input.features || [])}::jsonb,
        ${JSON.stringify(input.differentiators || [])}::jsonb,
        ${JSON.stringify(input.social_proof || [])}::jsonb,
        ${input.brand_voice || ''},
        ${input.brand_mission || null},
        ${input.competitive_angle || null},
        ${JSON.stringify(input.never_say || [])}::jsonb,
        ${JSON.stringify(input.never_topics || [])}::jsonb,
        true,
        'pending',
        ${now},
        ${now}
      )
      RETURNING *
    `;

    console.log(`[BrandProfile] Created: ${input.brand_name} (${id})`);
    return this.mapRow(result.rows[0]);
  }

  // ── Update ──

  async update(input: UpdateBrandProfileInput): Promise<BrandProfile | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const addField = (col: string, val: unknown) => {
      updates.push(`${col} = $${i++}`);
      values.push(val);
    };

    if (input.brand_name !== undefined)        addField('brand_name', input.brand_name);
    if (input.brand_url !== undefined)          addField('brand_url', input.brand_url);
    if (input.brand_description !== undefined)  addField('brand_description', input.brand_description);
    if (input.brand_voice !== undefined)        addField('brand_voice', input.brand_voice);
    if (input.brand_mission !== undefined)      addField('brand_mission', input.brand_mission);
    if (input.competitive_angle !== undefined)  addField('competitive_angle', input.competitive_angle);
    if (input.connected_account_id !== undefined) addField('connected_account_id', input.connected_account_id);
    if (input.twitter_account_id !== undefined) addField('twitter_account_id', input.twitter_account_id);
    if (input.linkedin_account_id !== undefined) addField('linkedin_account_id', input.linkedin_account_id);
    if (input.linkedin_platform_id !== undefined) addField('linkedin_platform_id', input.linkedin_platform_id);

    if (input.value_propositions !== undefined) addField('value_propositions', JSON.stringify(input.value_propositions));
    if (input.target_audiences !== undefined)   addField('target_audiences', JSON.stringify(input.target_audiences));
    if (input.features !== undefined)           addField('features', JSON.stringify(input.features));
    if (input.differentiators !== undefined)    addField('differentiators', JSON.stringify(input.differentiators));
    if (input.social_proof !== undefined)       addField('social_proof', JSON.stringify(input.social_proof));
    if (input.never_say !== undefined)          addField('never_say', JSON.stringify(input.never_say));
    if (input.never_topics !== undefined)       addField('never_topics', JSON.stringify(input.never_topics));
    
    if (input.autonomy_mode !== undefined)      addField('autonomy_mode', input.autonomy_mode);
    if (input.custom_instructions !== undefined) addField('custom_instructions', input.custom_instructions);
    if (input.consecutive_approved_posts !== undefined) addField('consecutive_approved_posts', input.consecutive_approved_posts);

    if (updates.length === 0) return this.getById(input.id);

    addField('updated_at', new Date().toISOString());
    values.push(input.id);

    const query = `UPDATE brand_profiles SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await sqlWithRetry.query(query, values as any[]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async setOnboardingStatus(id: string, status: BrandProfile['onboarding_status']): Promise<void> {
    await sqlWithRetry`
      UPDATE brand_profiles SET onboarding_status = ${status}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  // ── Delete ──

  async delete(id: string): Promise<void> {
    await sqlWithRetry`DELETE FROM brand_profiles WHERE id = ${id}`;
  }

  async softDelete(id: string): Promise<void> {
    await sqlWithRetry`
      UPDATE brand_profiles SET is_active = false, updated_at = NOW() WHERE id = ${id}
    `;
  }

  // ── Merge knowledge from crawl snapshots ──

  async mergeKnowledge(
    brandProfileId: string,
    knowledge: {
      value_propositions?: string[];
      features?: string[];
      differentiators?: string[];
      social_proof?: string[];
    }
  ): Promise<void> {
    const profile = await this.getById(brandProfileId);
    if (!profile) return;

    const mergedFeatures = [...new Set([...profile.features, ...(knowledge.features || [])])];
    const mergedDifferentiators = [...new Set([...profile.differentiators, ...(knowledge.differentiators || [])])];
    const mergedSocialProof = [...new Set([...profile.social_proof, ...(knowledge.social_proof || [])])];

    await sqlWithRetry`
      UPDATE brand_profiles SET
        features = ${JSON.stringify(mergedFeatures)}::jsonb,
        differentiators = ${JSON.stringify(mergedDifferentiators)}::jsonb,
        social_proof = ${JSON.stringify(mergedSocialProof)}::jsonb,
        updated_at = NOW()
      WHERE id = ${brandProfileId}
    `;

    console.log(`[BrandProfile] Merged knowledge for ${brandProfileId}`);
  }

  // ── Helpers ──

  private mapRow(row: Record<string, unknown>): BrandProfile {
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      connected_account_id: null,
      twitter_account_id: (row.twitter_account_id as string) || null,
      linkedin_account_id: (row.linkedin_account_id as string) || null,
      linkedin_platform_id: (row.linkedin_platform_id as string) || null,
      brand_name: row.name as string,
      brand_url: null,
      brand_description: (row.description as string) || '',
      value_propositions: this.parseJsonb<ValueProposition[]>(row.core_values, []),
      target_audiences: this.parseJsonb<TargetAudience[]>(row.target_audience, []),
      features: [],
      differentiators: [],
      social_proof: [],
      brand_voice: typeof row.tone_of_voice === 'string' ? row.tone_of_voice : JSON.stringify(row.tone_of_voice || ''),
      brand_mission: (row.industry as string) || null,
      competitive_angle: null,
      never_say: [],
      never_topics: [],
      custom_instructions: (row.custom_instructions as string) || '',
      is_active: true,
      onboarding_status: 'active',
      autonomy_mode: (row.autonomy_mode as 'copilot' | 'autopilot') || 'copilot',
      consecutive_approved_posts: (row.consecutive_approved_posts as number) || 0,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }

  private parseJsonb<T>(value: unknown, fallback: T): T {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
      try { return JSON.parse(value) as T; } catch { return fallback; }
    }
    return value as T;
  }
}

export const brandProfileService = new BrandProfileService();
