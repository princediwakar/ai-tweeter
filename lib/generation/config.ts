// lib/generation/config.ts

// ========================================================================
// ⚙️ FUNCTIONAL CONFIGURATION (How the system works)
// ========================================================================
// All persona-specific config should come from DB (personas table)
// This file only contains system-level configuration

export const GENERATION_CONFIG = {
  fetching: {
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    apiTimeout: 4000,
    articlePageTimeout: 5000,
    homepageTimeout: 5000,
  },
  enrichment: {
    maxConcurrent: 3,
    fullTextLimit: 8000,
    maxEntities: 20,
    batchDelay: 1000,
  },
  ai: {
    model: 'deepseek-chat',
    temperature: 0.9,
    maxTokens: 2000,
  },
  batch: {
    defaultSize: 1,
  },
} as const;

export type GenerationConfig = typeof GENERATION_CONFIG;