// lib/contentSource/utils.ts
/**
 * Shared utility functions and cache logic for content source module
 */

import { GENERATION_CONFIG } from '../generation/config';
import type { CacheEntry } from './types';

// ─────────────────────────────────────────────
// 🔧 Constants
// ─────────────────────────────────────────────

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.31',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0',
];

// ─────────────────────────────────────────────
// 📦 Cache Management
// ─────────────────────────────────────────────

const contentCache: Map<string, CacheEntry> = new Map();

export function getCachedContext(key: string): string | null {
  const cached = contentCache.get(key);
  if (cached && Date.now() - cached.timestamp < GENERATION_CONFIG.fetching.cacheTTL) {
    console.log(`[Content Source] 📦 Using cached context for: "${key}"`);
    return cached.context;
  }
  return null;
}

export function setCachedContext(key: string, context: string): void {
  contentCache.set(key, { context, timestamp: Date.now() });
  console.log(`[Content Source] 💾 Cached new context for: "${key}"`);
}

// ─────────────────────────────────────────────
// 🛠️ Helper Functions
// ─────────────────────────────────────────────

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function cleanDescription(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, '...')
    .trim();
}

export function selectRandomSources<T>(items: T[], count: number): T[] {
  return [...items].sort(() => 0.5 - Math.random()).slice(0, count);
}

export function getTodayDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

export async function handleContextError(persona: string, error: unknown, fallbackMessage: string): Promise<string> {
  console.error(`[Content Source] ❌ Context failure for ${persona}:`, error);
  return fallbackMessage;
}
