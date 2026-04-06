// lib/engagement/targets.ts
// Engagement targets should come from DB (connected_accounts or separate table)

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
  // TODO: Read from DB - connected_accounts.engagement_config or separate table
  // For now, return null - needs DB implementation
  console.log(`[Engagement] Loading config for ${twitterHandle} from DB...`);
  
  try {
    const result = await sql`
      SELECT engagement_config 
      FROM connected_accounts 
      WHERE twitter_handle = ${twitterHandle.replace('@', '')}
    `;
    
    if (result.rows.length > 0 && result.rows[0].engagement_config) {
      return result.rows[0].engagement_config as EngagementConfig;
    }
  } catch (error) {
    console.warn('[Engagement] Failed to load config from DB:', error);
  }
  
  return null;
}