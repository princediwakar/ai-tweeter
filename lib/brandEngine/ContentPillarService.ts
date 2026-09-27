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
    const prompt = `You are a social media strategist for an "Ecosystem Brain." Your goal is to build an audience by deeply empathizing with and entertaining the primary stakeholder of this ecosystem.
The product is NOT the main character; the stakeholder is. If the brand sells clinic software, the content should be about the realities of being a doctor.

BRAND: ${brand.brand_name}
DESCRIPTION: ${brand.brand_description}
PRIMARY STAKEHOLDER: ${brand.primary_stakeholder_persona || JSON.stringify(brand.target_audiences)}
ECOSYSTEM DYNAMICS: ${brand.ecosystem_dynamics || JSON.stringify(brand.value_propositions)}
${brand.operating_geography ? `OPERATING GEOGRAPHY: ${brand.operating_geography}` : ''}
VOICE: ${brand.brand_voice}

Return ONLY a valid JSON array of 4-6 content pillars.
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

RULES FOR PILLARS:
1. Always include an "Insider Humor / Memetic Observations" pillar (weight: 1.5) — hyper-relatable humor, inside jokes, and daily frustrations of the stakeholder.
2. Always include "The Shared Struggle / Catharsis" pillar (weight: 1.0) — serious or empathetic posts about the hard realities of their job/life.
3. Include an "Inspirational / Why We Do It" pillar (weight: 0.8) — the rewarding moments that make the struggle worth it.
4. Include a "Silent Sponsor" pillar (weight: 0.3) — rare, subtle mentions of how a great tool (like the brand) makes the struggle slightly easier, without sounding like an ad.
5. Do NOT include "Product Updates", "Customer Stories", or traditional marketing pillars.
6. Example angles MUST be highly specific to the stakeholder's daily life, not generic business advice.
7. ${brand.operating_geography ? `GEOGRAPHY RULE: All example angles MUST be culturally and geographically relevant to ${brand.operating_geography}. No localized references from outside this region.` : 'Angles should be universally relatable or specific to the brand.'}`;

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
        name: 'Insider Humor',
        slug: 'insider-humor',
        description: 'Memetic observations and inside jokes about the daily realities of the industry.',
        example_angles: ['The moment you realize you have to do the thing everyone hates', 'When the client/patient says something completely unhinged'],
        target_audience: audience,
        weight: 1.5,
      },
      {
        brand_profile_id: brand.id,
        name: 'The Shared Struggle',
        slug: 'shared-struggle',
        description: `Cathartic, empathetic observations about the hardest parts of being a ${audience}.`,
        example_angles: [`The burnout nobody talks about`, `Why the system is stacked against you`],
        target_audience: audience,
        weight: 1.0,
      },
      {
        brand_profile_id: brand.id,
        name: 'Why We Do It',
        slug: 'why-we-do-it',
        description: `Inspirational stories about the rewarding moments for a ${audience}.`,
        example_angles: [`The rare win that makes it worth it`, `Remembering why you started`],
        target_audience: audience,
        weight: 0.8,
      },
      {
        brand_profile_id: brand.id,
        name: 'The Silent Sponsor',
        slug: 'silent-sponsor',
        description: 'Extremely subtle, relatable nods to how having the right tool removes a layer of misery.',
        example_angles: ['Imagine if you did not have to fight your software today.', 'The joy of a tool that actually works.'],
        target_audience: audience,
        weight: 0.3,
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
