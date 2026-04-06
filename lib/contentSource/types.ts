// lib/contentSource/types.ts
/**
 * Shared TypeScript interfaces for content source module
 * 
 * DESIGN: All types are generic/dynamic - personas read from DB (personas.rss_sources)
 * No hardcoded persona-specific types
 */

// ─────────────────────────────────────────────
// 🔧 Core Data Structures
// ─────────────────────────────────────────────

export interface HeadlineWithSource {
  headline: string;
  url: string;
  description?: string;
  sourceType?: 'rss' | 'reddit' | 'twitter'
}

export interface EnrichedArticle {
  headline: string;
  url: string;
  description?: string;
  fullText?: string;
  keyMetrics?: string;
  entities: string[];
  cached?: boolean;
}

export interface SourceMetadata {
  index: number;
  url: string;
  headline: string;
}

// ─────────────────────────────────────────────
// 🎭 Generic Persona Context (dynamic - works for any persona)
// ─────────────────────────────────────────────

export interface PersonaContext {
  articles: EnrichedArticle[];
  sourceMetadata: SourceMetadata[];
  articlesJson?: string;
  headlinesInPrompt: number;
  recentContent?: string[];
  usedSourceUrls?: string[];
}

// ─────────────────────────────────────────────
// 🔧 Cache & Utilities
// ─────────────────────────────────────────────

export interface CacheEntry {
  context: string;
  timestamp: number;
}

// ─────────────────────────────────────────────
// 📡 RSS Feed Interfaces
// ─────────────────────────────────────────────

export interface RssItem {
  title?: string[];
  description?: string[];
  link?: string[];
}

export interface RedditPostData {
  title: string;
  created_utc: number;
  permalink: string;
  selftext: string;
}