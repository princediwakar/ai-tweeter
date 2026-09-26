// lib/brandEngine/ContentPillarService.ts
// CRUD for content pillars + AI-powered pillar suggestion from brand profile.

import { sqlWithRetry } from '../db';
import { getDeepseekClientAsync } from '../generationService';
import { GENERATION_CONFIG } from '../generation/config';
import type { ContentPillar, CreatePillarInput, BrandProfile } from './types';

class ContentPillarService {
  // ── Read ──

  async getById(id: string): Promise<ContentPillar | null> {
    const result = await sqlWithRetry`
      SELECT * FROM content_pillars WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async getByBrandProfile(brandProfileId: string): Promise<ContentPillar[]> {
    const result = await sqlWithRetry`
      SELECT * FROM content_pillars
      WHERE brand_profile_id = ${brandProfileId} AND is_active = true
      ORDER BY sort_order ASC, weight DESC
    `;
    return result.rows.map(this.mapRow);
  }

  // ── Create ──

  async create(input: CreatePillarInput): Promise<ContentPillar> {
    const id = crypto.randomUUID();
    const slug = input.slug || this.slugify(input.name);

    const result = await sqlWithRetry`
      INSERT INTO content_pillars (
        id, brand_profile_id, name, slug, description,
        example_angles, target_audience,
        weight, min_gap_days, max_per_week,
        sort_order, is_active, created_at
      ) VALUES (
        ${id},
        ${input.brand_profile_id},
        ${input.name},
        ${slug},
        ${input.description || ''},
        ${JSON.stringify(input.example_angles || [])}::jsonb,
        ${input.target_audience || null},
        ${input.weight || 1.0},
        ${input.min_gap_days || 2},
        ${input.max_per_week || 3},
        0, true, NOW()
      )
      RETURNING *
    `;

    return this.mapRow(result.rows[0]);
  }

  async createBatch(inputs: CreatePillarInput[]): Promise<ContentPillar[]> {
    const results: ContentPillar[] = [];
    for (let i = 0; i < inputs.length; i++) {
      const pillar = await this.create({ ...inputs[i] });
      results.push(pillar);
    }
    return results;
  }

  // ── Update ──

  async update(id: string, updates: Partial<CreatePillarInput>): Promise<ContentPillar | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const add = (col: string, val: unknown) => {
      setClauses.push(`${col} = $${i++}`);
      values.push(val);
    };

    if (updates.name !== undefined) add('name', updates.name);
    if (updates.description !== undefined) add('description', updates.description);
    if (updates.target_audience !== undefined) add('target_audience', updates.target_audience);
    if (updates.weight !== undefined) add('weight', updates.weight);
    if (updates.min_gap_days !== undefined) add('min_gap_days', updates.min_gap_days);
    if (updates.max_per_week !== undefined) add('max_per_week', updates.max_per_week);
    if (updates.example_angles !== undefined) add('example_angles', JSON.stringify(updates.example_angles));

    if (setClauses.length === 0) return this.getById(id);

    values.push(id);
    const query = `UPDATE content_pillars SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await sqlWithRetry.query(query, values as any[]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  // ── Delete ──

  async delete(id: string): Promise<void> {
    await sqlWithRetry`DELETE FROM content_pillars WHERE id = ${id}`;
  }

  async softDelete(id: string): Promise<void> {
    await sqlWithRetry`
      UPDATE content_pillars SET is_active = false WHERE id = ${id}
    `;
  }

  // ── AI-powered pillar suggestion ──

  /**
   * Given a brand profile (with knowledge already enriched), suggest 4-6 content pillars.
   * This is called during onboarding after the brand profile is created.
   */
  async suggestPillars(brand: BrandProfile): Promise<CreatePillarInput[]> {
    const prompt = `You are a content strategist. Given this brand profile, suggest 4-6 content pillars for their social media presence.

BRAND: ${brand.brand_name}
DESCRIPTION: ${brand.brand_description}
VALUE PROPOSITIONS: ${JSON.stringify(brand.value_propositions)}
TARGET AUDIENCES: ${JSON.stringify(brand.target_audiences)}
FEATURES: ${JSON.stringify(brand.features)}
DIFFERENTIATORS: ${JSON.stringify(brand.differentiators)}
VOICE: ${brand.brand_voice}
MISSION: ${brand.brand_mission || 'Not specified'}

Return ONLY valid JSON array. Each pillar should have:
[
  {
    "name": "Pillar Name",
    "slug": "pillar-slug",
    "description": "What kind of content goes under this pillar",
    "example_angles": ["3-5 specific post angle ideas"],
    "target_audience": "primary audience key for this pillar",
    "weight": 1.0
  }
]

RULES:
1. Always include a "Industry Ecosystem" or "Industry Trends" pillar (weight: 1.5) — engaging content about the broader industry (e.g. for healthtech: patients, doctors, news; for edtech: students, psychology, future of learning). Establish a strong, opinionated persona.
2. Always include a "Pain Point Stories" pillar (weight: 1.0) — content about problems the audience faces in their daily lives/work.
3. Include a "Product Insight" pillar (weight: 0.8) — how the specific product solves niche problems.
4. Include at least one "Social Proof" or "Customer Stories" pillar (weight: 0.7).
5. Optionally include "Behind the Scenes" or "Founder Journey" (weight: 0.3) for brand humanizing.
6. Example angles must be specific to THIS brand and industry, not generic. Look at how Swiggy/Zomato engage audiences broadly instead of just talking about delivery.
7. Weight determines posting frequency (higher = more frequent)`;

    try {
      const client = await getDeepseekClientAsync();
      const response = await client.chat.completions.create({
        model: GENERATION_CONFIG.ai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0].message.content;
      if (!raw) return this.getDefaultPillars(brand);

      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
      const pillars = Array.isArray(parsed) ? parsed : parsed.pillars || [];

      if (pillars.length === 0) return this.getDefaultPillars(brand);

      return pillars.map((p: any) => ({
        brand_profile_id: brand.id,
        name: p.name,
        slug: p.slug || this.slugify(p.name),
        description: p.description || '',
        example_angles: p.example_angles || [],
        target_audience: p.target_audience || null,
        weight: p.weight || 1.0,
      }));
    } catch (error) {
      console.error('[ContentPillar] AI suggestion failed:', error);
      return this.getDefaultPillars(brand);
    }
  }

  /**
   * Fallback pillars if AI suggestion fails.
   */
  private getDefaultPillars(brand: BrandProfile): CreatePillarInput[] {
    const audience = brand.target_audiences[0]?.key || 'general';
    return [
      {
        brand_profile_id: brand.id,
        name: 'Industry Ecosystem & Trends',
        slug: 'industry-ecosystem',
        description: 'Engaging content about the broader industry ecosystem, news, and systemic observations.',
        example_angles: ['Counter-intuitive industry observation', 'Future trends in the space'],
        target_audience: audience,
        weight: 1.5,
      },
      {
        brand_profile_id: brand.id,
        name: 'Pain Point Stories',
        slug: 'pain-points',
        description: `Real problems ${audience} face in their daily lives`,
        example_angles: [`Common frustrations for ${audience}`, `Hidden costs of the status quo`],
        target_audience: audience,
        weight: 1.0,
      },
      {
        brand_profile_id: brand.id,
        name: 'Product Insight',
        slug: 'product-insight',
        description: `How ${brand.brand_name} specifically solves niche problems`,
        example_angles: [`Feature spotlight`, `Before vs after using ${brand.brand_name}`],
        target_audience: audience,
        weight: 0.8,
      },
      {
        brand_profile_id: brand.id,
        name: 'Social Proof',
        slug: 'social-proof',
        description: 'Customer stories, metrics, and wins',
        example_angles: ['Customer success story', 'Key metric improvement'],
        target_audience: audience,
        weight: 0.7,
      },
    ];
  }

  // ── Helpers ──

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapRow(row: Record<string, unknown>): ContentPillar {
    return {
      id: row.id as string,
      brand_profile_id: row.brand_profile_id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string,
      example_angles: (typeof row.example_angles === 'string'
        ? JSON.parse(row.example_angles)
        : row.example_angles || []) as string[],
      target_audience: row.target_audience as string | null,
      weight: row.weight as number,
      min_gap_days: row.min_gap_days as number,
      max_per_week: row.max_per_week as number,
      sort_order: row.sort_order as number,
      is_active: row.is_active as boolean,
      created_at: row.created_at as Date,
    };
  }
}

export const contentPillarService = new ContentPillarService();
