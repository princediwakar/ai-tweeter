// lib/brandEngine/ThemeSaturationTracker.ts
// Analyzes what pillars have been posted recently and calculates saturation scores.
// Used by NextPostPlanner to decide which pillar to post from next.

import { sqlWithRetry } from '../db';
import { contentPillarService } from './ContentPillarService';
import type { ContentPillar, ThemeSaturation } from './types';

class ThemeSaturationTracker {

  /**
   * Get saturation data for all active pillars of a brand.
   * Returns each pillar with its posting frequency, recency, and saturation score.
   */
  async analyze(brandProfileId: string): Promise<ThemeSaturation[]> {
    const pillars = await contentPillarService.getByBrandProfile(brandProfileId);
    if (pillars.length === 0) return [];

    // Get post counts per pillar for last 7 and 30 days
    const stats = await sqlWithRetry`
      SELECT
        pillar_id,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as count_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as count_30d,
        MAX(created_at) as last_posted_at,
        ARRAY_AGG(DISTINCT target_audience) FILTER (WHERE target_audience IS NOT NULL) as audiences,
        ARRAY_AGG(theme_summary ORDER BY created_at DESC) FILTER (WHERE theme_summary IS NOT NULL) as recent_summaries
      FROM posts
      WHERE brand_profile_id = ${brandProfileId}
        AND pillar_id IS NOT NULL
        AND status IN ('ready', 'posted')
      GROUP BY pillar_id
    `;

    const statsMap = new Map(
      stats.rows.map(row => [row.pillar_id, row])
    );

    return pillars.map(pillar => {
      const stat = statsMap.get(pillar.id);
      const postsLast7 = parseInt(stat?.count_7d || '0', 10);
      const postsLast30 = parseInt(stat?.count_30d || '0', 10);
      const lastPosted = stat?.last_posted_at ? new Date(stat.last_posted_at) : null;
      const daysSince = lastPosted
        ? Math.floor((Date.now() - lastPosted.getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never posted = very high gap

      // Saturation score: 0 = starving for content, 1 = oversaturated
      // Based on: posts in last 7 days relative to max_per_week
      const saturation = pillar.max_per_week > 0
        ? Math.min(postsLast7 / pillar.max_per_week, 1.0)
        : 0;

      return {
        pillar,
        posts_last_7_days: postsLast7,
        posts_last_30_days: postsLast30,
        last_posted_at: lastPosted,
        days_since_last_post: daysSince,
        saturation_score: saturation,
        audiences_covered: (stat?.audiences || []).filter(Boolean),
        recent_angles: (stat?.recent_summaries || []).slice(0, 5).filter(Boolean),
      };
    });
  }

  /**
   * Select the best next pillar to post from, based on:
   * 1. Pillars that haven't been posted recently (high gap)
   * 2. Pillars with higher weight
   * 3. Pillars under their max_per_week limit
   * 4. Audiences not addressed recently
   */
  async selectNextPillar(brandProfileId: string): Promise<{
    pillar: ContentPillar;
    suggested_audience: string | null;
    avoid_angles: string[];
    narrative_context: string;
  } | null> {
    const saturations = await this.analyze(brandProfileId);
    if (saturations.length === 0) return null;

    // Filter out oversaturated pillars (at or above weekly max)
    const eligible = saturations.filter(s => s.saturation_score < 1.0);
    if (eligible.length === 0) {
      // All pillars saturated — pick the one with most days since last post
      const fallback = saturations.sort((a, b) => b.days_since_last_post - a.days_since_last_post)[0];
      return {
        pillar: fallback.pillar,
        suggested_audience: fallback.pillar.target_audience,
        avoid_angles: fallback.recent_angles,
        narrative_context: this.buildContext(fallback),
      };
    }

    // Score each eligible pillar
    const scored = eligible.map(s => {
      // Higher score = should post next
      let score = 0;

      // Weight contribution (higher weight pillars get priority)
      score += s.pillar.weight * 2;

      // Recency contribution (longer gap = higher score)
      score += Math.min(s.days_since_last_post / 7, 3); // Cap at 3 weeks worth

      // Gap respect (if min_gap_days not met, heavily penalize)
      if (s.days_since_last_post < s.pillar.min_gap_days) {
        score -= 10;
      }

      // Under-saturation bonus
      score += (1 - s.saturation_score) * 2;

      return { ...s, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Determine suggested audience
    // Pick an audience from the pillar's target that hasn't been covered recently
    let suggestedAudience = best.pillar.target_audience;

    return {
      pillar: best.pillar,
      suggested_audience: suggestedAudience,
      avoid_angles: best.recent_angles,
      narrative_context: this.buildContext(best),
    };
  }

  /**
   * Build a human-readable narrative context from saturation data.
   */
  private buildContext(saturation: ThemeSaturation): string {
    const parts: string[] = [];

    if (saturation.posts_last_7_days > 0) {
      parts.push(`Posted ${saturation.posts_last_7_days} times from "${saturation.pillar.name}" in the last 7 days.`);
    } else {
      parts.push(`No posts from "${saturation.pillar.name}" in the last 7 days.`);
    }

    if (saturation.last_posted_at) {
      parts.push(`Last post: ${saturation.days_since_last_post} days ago.`);
    } else {
      parts.push(`Never posted from this pillar before.`);
    }

    if (saturation.recent_angles.length > 0) {
      parts.push(`Recent angles covered: ${saturation.recent_angles.join('; ')}`);
    }

    if (saturation.audiences_covered.length > 0) {
      parts.push(`Audiences addressed recently: ${saturation.audiences_covered.join(', ')}`);
    }

    return parts.join(' ');
  }
}

export const themeSaturationTracker = new ThemeSaturationTracker();
