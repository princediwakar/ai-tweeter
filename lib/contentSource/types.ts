// lib/contentSource/types.ts
/**
 * Shared TypeScript interfaces for content source module
 */


// ─────────────────────────────────────────────
// 🔧 Core Data Structures
// ─────────────────────────────────────────────

/**
 * A headline with its source URL and optional description
 */
export interface HeadlineWithSource {
  headline: string;
  url: string;
  description?: string;
}

/**
 * An enriched article with full content and extracted entities
 * NOTE: This must match lib/generation/articleEnricher.ts::EnrichedArticle
 */
export interface EnrichedArticle {
  headline: string;
  url: string;
  description?: string;
  fullText?: string;
  keyMetrics?: string;       // Metric-heavy paragraphs extracted
  entities: string[];
  cached?: boolean;          // Flag for cached results
}

/**
 * Source metadata for tracking in prompts
 */
export interface SourceMetadata {
  index: number;
  url: string;
  headline: string;
}

// ─────────────────────────────────────────────
// 🎭 Persona Context Interfaces
// ─────────────────────────────────────────────

/**
 * Structured context for Satirist persona
 */
export interface SatiristContext {
  articles: EnrichedArticle[];
  sourceMetadata: Array<{ 
    index: number; 
    url: string; 
    headline: string 
  }>;
  headlinesInPrompt: number;
  recentContent?: string[];      // NEW: Recent tweet content for deduplication
  usedSourceUrls?: string[];     // NEW: Recently used source URLs
}


export interface RecentPattern {
  text: string;
  timestamp?: string;
  lane?: string;             // Track which lane was used
}

/**
 * Structured context for Pattern Spotter persona
 * ✨ UPDATED: Now uses enriched articles instead of headlines
 */
export interface PatternSpotterContext {
  articles: EnrichedArticle[];        // ✨ CHANGED: Enriched articles with full text
  sourceMetadata: SourceMetadata[];
  totalHeadlines: number;
  recentContent?: string[];           // Recent tweet content for deduplication
  usedSourceUrls?: string[];          // Recently used source URLs
}

/**
 * Structured context for Business Storyteller persona
 */
export interface BusinessStorytellerContext {
  mainStory: HeadlineWithSource;
  mainEntity: string;
  enrichmentContext: string[];
  sourceUrl: string;
}

/**
 * Structured context for Cricket Storyteller persona
 */
export interface CricketStorytellerContext {
  mainStory: HeadlineWithSource;
  keyPlayer: string;
  enrichmentContext: string[];
  sourceUrl: string;
}

/**
 * Structured context for English Vocab Builder persona
 */
export interface EnglishVocabBuilderContext {
  headlines: string[];
  topic: string;
}

/**
 * Union type for all persona contexts
 */
export type PersonaContext =
  | SatiristContext
  | PatternSpotterContext
  | BusinessStorytellerContext
  | CricketStorytellerContext
  | EnglishVocabBuilderContext;

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
