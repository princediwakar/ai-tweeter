// lib/engagement/targets.ts

import { sql } from '@vercel/postgres';

export interface EngagementTarget {
  username: string;
  description: string;
  tier: number;
}

export interface EngagementConfig {
  priority_targets: EngagementTarget[];
  engagement_persona: string;
  rules: {
    max_engagements_per_day: number;
    min_hours_between_same_target: number;
  };
}

export async function getEngagementConfigForAccount(twitterHandle: string): Promise<EngagementConfig | null> {
  console.log(`[Engagement] No custom config found for ${twitterHandle}, returning default`);
  return null;
}

export function getDefaultEngagementConfig(): EngagementConfig {
  return {
    priority_targets: [],
    engagement_persona: 'default',
    rules: {
      max_engagements_per_day: 50,
      min_hours_between_same_target: 24,
    },
  };
}
