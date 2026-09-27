// lib/brandEngine/types.ts
// Type definitions for the Brand Engine.
// Model: User → Brand Profiles → Connected Accounts
// One user manages multiple brands. No orgs, no teams.

// =============================================================================
// BRAND PROFILES
// =============================================================================

export type OnboardingStatus = 'pending' | 'crawling' | 'ready' | 'active';

export interface ValueProposition {
  proposition: string;
  audience: string;       // key from target_audiences
  pain_point: string;
}

export interface TargetAudience {
  key: string;
  label: string;
  pain_points: string[];
  language_level: string;  // 'business' | 'professional' | 'casual' | 'technical'
  motivations: string[];
}

export interface BrandProfile {
  id: string;
  user_id: string;
  connected_account_id: string | null;
  twitter_account_id?: string | null;
  linkedin_account_id?: string | null;
  linkedin_platform_id?: string | null;

  // Identity
  brand_name: string;
  brand_url: string | null;
  brand_description: string;

  // Structured knowledge
  value_propositions: ValueProposition[];
  target_audiences: TargetAudience[];
  features: string[];
  differentiators: string[];
  social_proof: string[];

  // Ecosystem Brain
  primary_stakeholder_persona: string | null;
  ecosystem_dynamics: string | null;
  operating_geography: string | null;

  // Voice & positioning
  brand_voice: string;
  brand_mission: string | null;
  competitive_angle: string | null;

  // Guardrails
  never_say: string[];
  never_topics: string[];
  custom_instructions: string;

  // Status
  is_active: boolean;
  onboarding_status: OnboardingStatus;
  autonomy_mode: 'copilot' | 'autopilot';
  consecutive_approved_posts: number;

  created_at: Date;
  updated_at: Date;
}

export interface CreateBrandProfileInput {
  user_id: string;
  connected_account_id?: string;
  twitter_account_id?: string;
  linkedin_account_id?: string;
  linkedin_platform_id?: string;
  brand_name: string;
  brand_url?: string;
  brand_description?: string;
  value_propositions?: ValueProposition[];
  target_audiences?: TargetAudience[];
  features?: string[];
  differentiators?: string[];
  social_proof?: string[];
  brand_voice?: string;
  brand_mission?: string;
  competitive_angle?: string;
  primary_stakeholder_persona?: string;
  ecosystem_dynamics?: string;
  operating_geography?: string;
  never_say?: string[];
  never_topics?: string[];
  custom_instructions?: string;
  autonomy_mode?: 'copilot' | 'autopilot';
  consecutive_approved_posts?: number;
}

export interface UpdateBrandProfileInput extends Partial<Omit<CreateBrandProfileInput, 'user_id'>> {
  id: string;
  onboarding_status?: OnboardingStatus;
}

// =============================================================================
// BRAND KNOWLEDGE SOURCES
// =============================================================================

export type KnowledgeSourceType = 'website' | 'blog' | 'docs' | 'changelog' | 'pricing' | 'about' | 'careers' | 'custom';
export type CrawlFrequency = 'daily' | 'weekly' | 'monthly' | 'once';
export type CrawlStatus = 'pending' | 'crawling' | 'completed' | 'failed';

export interface BrandKnowledgeSource {
  id: string;
  brand_profile_id: string;
  url: string;
  source_type: KnowledgeSourceType;
  label: string | null;
  crawl_depth: number;
  crawl_frequency: CrawlFrequency;
  max_pages: number;
  last_crawled_at: Date | null;
  next_crawl_at: Date | null;
  crawl_status: CrawlStatus;
  crawl_error: string | null;
  pages_crawled: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKnowledgeSourceInput {
  brand_profile_id: string;
  url: string;
  source_type?: KnowledgeSourceType;
  label?: string;
  crawl_depth?: number;
  crawl_frequency?: CrawlFrequency;
  max_pages?: number;
}

// =============================================================================
// KNOWLEDGE SNAPSHOTS
// =============================================================================

export type SnapshotProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WebsiteExtraction {
  company_name?: string;
  tagline?: string;
  value_propositions?: string[];
  target_audiences?: string[];
  features?: string[];
  differentiators?: string[];
  tone_signals?: string[];
  social_proof?: string[];
}

export interface BlogExtraction {
  recent_posts?: {
    title: string;
    url: string;
    date?: string;
    summary: string;
    topics: string[];
  }[];
  content_themes?: string[];
  writing_style_signals?: string[];
}

export interface ChangelogExtraction {
  recent_updates?: {
    date: string;
    title: string;
    description: string;
    is_major: boolean;
  }[];
  feature_velocity?: string;
}

export interface PricingExtraction {
  plans?: {
    name: string;
    price: string;
    features: string[];
    target_segment?: string;
  }[];
  free_trial?: boolean;
  target_segment?: string;
}

export interface DocsExtraction {
  capabilities?: string[];
  integrations?: string[];
  api_available?: boolean;
}

export type ExtractedData =
  | WebsiteExtraction
  | BlogExtraction
  | ChangelogExtraction
  | PricingExtraction
  | DocsExtraction
  | Record<string, unknown>;

export interface SnapshotChanges {
  new_features?: string[];
  removed_features?: string[];
  new_blog_posts?: { title: string; url: string; summary: string }[];
  pricing_changed?: boolean;
  new_testimonials?: string[];
  tone_shift?: string;
}

export interface BrandKnowledgeSnapshot {
  id: string;
  source_id: string;
  brand_profile_id: string;
  raw_content: string | null;
  raw_content_hash: string | null;
  extracted_data: ExtractedData;
  changes_from_previous: SnapshotChanges | null;
  snapshot_version: number;
  crawled_at: Date;
  processing_status: SnapshotProcessingStatus;
  created_at: Date;
}

// =============================================================================
// CONTENT PILLARS
// =============================================================================

export interface ContentPillar {
  id: string;
  brand_profile_id: string;
  name: string;
  slug: string;
  description: string;
  example_angles: string[];
  target_audience: string | null;
  weight: number;
  min_gap_days: number;
  max_per_week: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}

export interface CreatePillarInput {
  brand_profile_id: string;
  name: string;
  slug?: string;
  description?: string;
  example_angles?: string[];
  target_audience?: string;
  weight?: number;
  min_gap_days?: number;
  max_per_week?: number;
}

// =============================================================================
// CONTENT CALENDAR
// =============================================================================

export type CalendarEntryStatus = 'planned' | 'suggested' | 'generating' | 'generated' | 'posted' | 'skipped';

export interface ContentCalendarEntry {
  id: string;
  brand_profile_id: string;
  planned_date: Date;
  planned_platform: 'twitter' | 'linkedin';
  pillar_id: string | null;
  angle: string;
  target_audience: string | null;
  builds_on_post_id: string | null;
  narrative_note: string | null;
  status: CalendarEntryStatus;
  generated_post_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// NARRATIVE ARCS
// =============================================================================

export type ArcStatus = 'active' | 'completed' | 'paused';

export interface NarrativeStage {
  order: number;
  intent: string;
  angle: string;
  target_audience: string;
  suggested_gap_days: number;
  generated_post_id?: string;
  completed_at?: string;
}

export interface NarrativeArc {
  id: string;
  brand_profile_id: string;
  pillar_id: string | null;
  name: string;
  stages: NarrativeStage[];
  current_stage: number;
  status: ArcStatus;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// THEME SATURATION (computed, not stored)
// =============================================================================

export interface ThemeSaturation {
  pillar: ContentPillar;
  posts_last_7_days: number;
  posts_last_30_days: number;
  last_posted_at: Date | null;
  days_since_last_post: number;
  saturation_score: number;   // 0 = starving, 1 = oversaturated
  audiences_covered: string[];
  recent_angles: string[];
}

// =============================================================================
// POST PLAN (output of NextPostPlanner)
// =============================================================================

export interface PostPlan {
  brand_profile: BrandProfile;
  pillar: ContentPillar;
  target_audience: string;
  suggested_angle: string;
  avoid_angles: string[];
  narrative_context: string;
  narrative_arc_stage?: NarrativeStage;
  brand_knowledge_context: string;
  value_proposition?: string;
  platform: 'twitter' | 'linkedin';
  calendar_entry_id?: string;
}

// =============================================================================
// ENRICHMENT PIPELINE
// =============================================================================

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  links: string[];
}

export interface EnrichmentResult {
  source_id: string;
  snapshot_id: string;
  changes_detected: boolean;
  changes?: SnapshotChanges;
}
