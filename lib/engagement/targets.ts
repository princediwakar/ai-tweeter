// lib/engagement/targets.ts
import { promises as fs } from 'fs';
import path from 'path';

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

// A simple in-memory cache to avoid reading the file on every request
let engagementConfigCache: Record<string, EngagementConfig> | null = null;

async function loadEngagementConfig(): Promise<Record<string, EngagementConfig>> {
  if (engagementConfigCache) {
    return engagementConfigCache;
  }
  const filePath = path.join(process.cwd(), 'config', 'engagement-targets.json');
  const fileContents = await fs.readFile(filePath, 'utf8');
  engagementConfigCache = JSON.parse(fileContents);
  return engagementConfigCache!;
}

export async function getEngagementConfigForAccount(twitterHandle: string): Promise<EngagementConfig | null> {
  const config = await loadEngagementConfig();
  // Normalize handle to ensure it works with or without '@'
  const normalizedHandle = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`;
  return config[normalizedHandle] || null;
}