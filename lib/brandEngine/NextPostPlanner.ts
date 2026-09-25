// lib/brandEngine/NextPostPlanner.ts
// The brain — decides WHAT to post next for a brand.
// Considers: narrative arcs, content calendar, theme saturation, knowledge context.

import { sqlWithRetry } from '../db';
import { brandProfileService } from './BrandProfileService';
import { themeSaturationTracker } from './ThemeSaturationTracker';
import { knowledgeSourceService } from './KnowledgeSourceService';
import type {
  PostPlan,
  BrandProfile,
  ContentPillar,
  NarrativeArc,
  NarrativeStage,
  ContentCalendarEntry,
  BrandKnowledgeSnapshot,
} from './types';

class NextPostPlanner {

  /**
   * Plan the next post for a brand on a given platform.
   * This is the main entry point called by the generation trigger.
   *
   * Priority order:
   * 1. Active narrative arc with a stage due
   * 2. Content calendar entry for today
   * 3. Intelligent pillar selection from theme saturation
   */
  async plan(brandProfileId: string, platform: 'twitter' | 'linkedin'): Promise<PostPlan | null> {
    const brand = await brandProfileService.getById(brandProfileId);
    if (!brand || !brand.is_active) {
      console.log(`[Planner] Brand ${brandProfileId} not found or inactive`);
      return null;
    }

    // 1. Check for active narrative arc stage
    const arcPlan = await this.checkNarrativeArcs(brand, platform);
    if (arcPlan) {
      console.log(`[Planner] Using narrative arc: ${arcPlan.narrative_arc_stage?.intent}`);
      return arcPlan;
    }

    // 2. Check content calendar for today
    const calendarPlan = await this.checkCalendar(brand, platform);
    if (calendarPlan) {
      console.log(`[Planner] Using calendar entry: ${calendarPlan.suggested_angle}`);
      return calendarPlan;
    }

    // 3. Intelligent pillar selection
    const saturationPlan = await this.planFromSaturation(brand, platform);
    if (saturationPlan) {
      console.log(`[Planner] Using saturation-based plan: ${saturationPlan.pillar.name}`);
      return saturationPlan;
    }

    console.warn(`[Planner] Could not create plan for brand ${brand.brand_name}`);
    return null;
  }

  // ── 1. Narrative Arc Check ────────────────────────────────────────────────

  private async checkNarrativeArcs(brand: BrandProfile, platform: string): Promise<PostPlan | null> {
    const result = await sqlWithRetry`
      SELECT * FROM narrative_arcs
      WHERE brand_profile_id = ${brand.id}
        AND status = 'active'
      ORDER BY updated_at ASC
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;

    const arc = this.mapArc(result.rows[0]);
    if (arc.current_stage >= arc.stages.length) return null;

    const currentStage = arc.stages[arc.current_stage];
    if (!currentStage) return null;

    // Check if enough days have passed since last stage
    const prevStage = arc.current_stage > 0 ? arc.stages[arc.current_stage - 1] : null;
    if (prevStage?.completed_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(prevStage.completed_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < currentStage.suggested_gap_days) {
        return null; // Not time yet for next stage
      }
    }

    // Get the pillar for this arc
    let pillar: ContentPillar | null = null;
    if (arc.pillar_id) {
      const pillarResult = await sqlWithRetry`
        SELECT * FROM content_pillars WHERE id = ${arc.pillar_id}
      `;
      if (pillarResult.rows[0]) {
        pillar = this.mapPillar(pillarResult.rows[0]);
      }
    }

    if (!pillar) return null;

    const knowledgeContext = await this.buildKnowledgeContext(brand.id);

    return {
      brand_profile: brand,
      pillar,
      target_audience: currentStage.target_audience,
      suggested_angle: currentStage.angle,
      avoid_angles: [],
      narrative_context: `Narrative arc: "${arc.name}" — Stage ${arc.current_stage + 1}/${arc.stages.length}: ${currentStage.intent}`,
      narrative_arc_stage: currentStage,
      brand_knowledge_context: knowledgeContext,
      platform: platform as 'twitter' | 'linkedin',
    };
  }

  // ── 2. Calendar Check ─────────────────────────────────────────────────────

  private async checkCalendar(brand: BrandProfile, platform: string): Promise<PostPlan | null> {
    const today = new Date().toISOString().split('T')[0];

    const result = await sqlWithRetry`
      SELECT cc.*, cp.name as pillar_name, cp.description as pillar_description,
             cp.example_angles, cp.target_audience as pillar_audience,
             cp.weight, cp.min_gap_days, cp.max_per_week, cp.slug, cp.sort_order,
             cp.is_active as pillar_active, cp.created_at as pillar_created_at
      FROM content_calendar cc
      LEFT JOIN content_pillars cp ON cc.pillar_id = cp.id
      WHERE cc.brand_profile_id = ${brand.id}
        AND cc.planned_date = ${today}
        AND cc.planned_platform = ${platform}
        AND cc.status = 'planned'
      ORDER BY cc.created_at ASC
      LIMIT 1
    `;

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const pillar: ContentPillar | null = row.pillar_name ? {
      id: row.pillar_id,
      brand_profile_id: brand.id,
      name: row.pillar_name,
      slug: row.slug || '',
      description: row.pillar_description || '',
      example_angles: typeof row.example_angles === 'string'
        ? JSON.parse(row.example_angles) : (row.example_angles || []),
      target_audience: row.pillar_audience || null,
      weight: row.weight || 1.0,
      min_gap_days: row.min_gap_days || 2,
      max_per_week: row.max_per_week || 3,
      sort_order: row.sort_order || 0,
      is_active: row.pillar_active !== false,
      created_at: row.pillar_created_at,
    } : null;

    if (!pillar) return null;

    const knowledgeContext = await this.buildKnowledgeContext(brand.id);

    return {
      brand_profile: brand,
      pillar,
      target_audience: row.target_audience || pillar.target_audience || '',
      suggested_angle: row.angle || '',
      avoid_angles: [],
      narrative_context: row.narrative_note || 'Planned content calendar entry.',
      brand_knowledge_context: knowledgeContext,
      platform: platform as 'twitter' | 'linkedin',
      calendar_entry_id: row.id,
    };
  }

  // ── 3. Saturation-based Planning ──────────────────────────────────────────

  private async planFromSaturation(brand: BrandProfile, platform: string): Promise<PostPlan | null> {
    const selection = await themeSaturationTracker.selectNextPillar(brand.id);
    if (!selection) return null;

    const knowledgeContext = await this.buildKnowledgeContext(brand.id);

    // Find relevant value proposition for this audience
    const relevantValueProp = brand.value_propositions.find(
      vp => vp.audience === selection.suggested_audience
    );

    return {
      brand_profile: brand,
      pillar: selection.pillar,
      target_audience: selection.suggested_audience || selection.pillar.target_audience || '',
      suggested_angle: this.pickAngle(selection.pillar, selection.avoid_angles),
      avoid_angles: selection.avoid_angles,
      narrative_context: selection.narrative_context,
      brand_knowledge_context: knowledgeContext,
      value_proposition: relevantValueProp?.proposition,
      platform: platform as 'twitter' | 'linkedin',
    };
  }

  // ── Knowledge Context Builder ─────────────────────────────────────────────

  /**
   * Compile the latest knowledge snapshots into a text context
   * that gets injected into the generation prompt.
   */
  private async buildKnowledgeContext(brandProfileId: string): Promise<string> {
    const snapshots = await knowledgeSourceService.getLatestSnapshotsByBrand(brandProfileId);
    if (snapshots.length === 0) return 'No knowledge sources crawled yet.';

    const sections: string[] = [];

    for (const snapshot of snapshots) {
      const source = await knowledgeSourceService.getById(snapshot.source_id);
      if (!source) continue;

      const data = snapshot.extracted_data as Record<string, any>;
      const label = source.label || source.source_type;

      switch (source.source_type) {
        case 'website':
        case 'about':
          if (data.features?.length) sections.push(`Features (${label}): ${data.features.join(', ')}`);
          if (data.value_propositions?.length) sections.push(`Value props (${label}): ${data.value_propositions.join('; ')}`);
          if (data.differentiators?.length) sections.push(`Differentiators: ${data.differentiators.join('; ')}`);
          if (data.social_proof?.length) sections.push(`Social proof: ${data.social_proof.join('; ')}`);
          break;

        case 'blog':
          if (data.recent_posts?.length) {
            const posts = data.recent_posts.slice(0, 5)
              .map((p: any) => `"${p.title}" — ${p.summary}`)
              .join('\n  ');
            sections.push(`Recent blog posts:\n  ${posts}`);
          }
          break;

        case 'changelog':
          if (data.recent_updates?.length) {
            const updates = data.recent_updates
              .filter((u: any) => u.is_major)
              .slice(0, 3)
              .map((u: any) => `${u.title} (${u.date})`)
              .join(', ');
            if (updates) sections.push(`Recent launches: ${updates}`);
          }
          break;

        case 'pricing':
          if (data.plans?.length) {
            const plans = data.plans
              .map((p: any) => `${p.name}: ${p.price}`)
              .join(', ');
            sections.push(`Pricing: ${plans}`);
            if (data.free_trial) sections.push('Free trial available.');
          }
          break;

        case 'docs':
          if (data.integrations?.length) sections.push(`Integrations: ${data.integrations.join(', ')}`);
          break;
      }
    }

    return sections.length > 0
      ? sections.join('\n')
      : 'Knowledge sources crawled but no structured data extracted yet.';
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Pick an angle from the pillar's example_angles that isn't in the avoid list.
   */
  private pickAngle(pillar: ContentPillar, avoidAngles: string[]): string {
    const available = pillar.example_angles.filter(
      angle => !avoidAngles.some(
        avoid => avoid.toLowerCase().includes(angle.toLowerCase().substring(0, 20))
      )
    );

    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // All example angles used recently — return a generic instruction
    return `Find a fresh angle for "${pillar.name}" that differs from: ${avoidAngles.slice(0, 3).join('; ')}`;
  }

  private mapArc(row: Record<string, unknown>): NarrativeArc {
    return {
      id: row.id as string,
      brand_profile_id: row.brand_profile_id as string,
      pillar_id: row.pillar_id as string | null,
      name: row.name as string,
      stages: (typeof row.stages === 'string' ? JSON.parse(row.stages) : row.stages) as NarrativeStage[],
      current_stage: row.current_stage as number,
      status: row.status as NarrativeArc['status'],
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
    };
  }

  private mapPillar(row: Record<string, unknown>): ContentPillar {
    return {
      id: row.id as string,
      brand_profile_id: row.brand_profile_id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string,
      example_angles: (typeof row.example_angles === 'string'
        ? JSON.parse(row.example_angles) : (row.example_angles || [])) as string[],
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

export const nextPostPlanner = new NextPostPlanner();
