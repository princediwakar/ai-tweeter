// lib/types.ts - All shared types (database + domain)
// Consolidated from multiple type files

// =============================================================================
// CORE USER TYPES
// =============================================================================

export interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: Date | null;
  image: string | null;
  created_at: Date;
  updated_at: Date;
  hashed_password?: string | null;
  is_admin?: boolean;
  plan?: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires: Date;
  session_token: string;
  created_at: Date;
}

// =============================================================================
// CONNECTED ACCOUNTS (from connected_accounts table)
// =============================================================================
// Main type matching database schema
export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  name: string | null;
  account_name?: string | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: Date | null;
  is_active: boolean;
  connected_at?: Date | null;
  last_used_at?: Date | null;
  // Twitter API credentials (legacy)
  account_id?: string | null;
  twitter_api_key_encrypted?: string | null;
  twitter_api_secret_encrypted?: string | null;
  twitter_access_token_encrypted?: string | null;
  twitter_access_token_secret_encrypted?: string | null;
  personas?: string[];
  branding?: Record<string, unknown>;
  cloudinary_cloud_name_encrypted?: string | null;
  cloudinary_api_key_encrypted?: string | null;
  cloudinary_api_secret_encrypted?: string | null;
  status?: string;
  profile_image_url?: string | null;
  // LinkedIn OAuth
  linkedin_enabled?: boolean;
  linkedin_user_id?: string | null;
  linkedin_org_id?: string | null;
  linkedin_access_token_encrypted?: string | null;
  linkedin_refresh_token_encrypted?: string | null;
  linkedin_token_expires_at?: Date | null;
  // Twitter OAuth 2.0
  twitter_oauth2_enabled?: boolean;
  twitter_oauth2_access_token_encrypted?: string | null;
  twitter_oauth2_refresh_token_encrypted?: string | null;
  twitter_oauth2_token_expires_at?: Date | null;
}

// Decrypted credentials for internal use
export interface ConnectedAccountWithCredentials extends ConnectedAccount {
  // Decrypted Twitter credentials
  twitter_api_key?: string;
  twitter_api_secret?: string;
  twitter_access_token?: string;
  twitter_access_token_secret?: string;
  // Decrypted LinkedIn credentials
  linkedin_access_token?: string;
  linkedin_refresh_token?: string;
  // Decrypted Twitter OAuth 2.0
  twitter_oauth2_access_token?: string;
  twitter_oauth2_refresh_token?: string;
  // Decrypted Cloudinary
  cloudinary_cloud_name?: string;
  cloudinary_api_key?: string;
  cloudinary_api_secret?: string;
}

// Backward compatibility alias
export type Account = ConnectedAccount;
export type AccountWithCredentials = ConnectedAccountWithCredentials;

// =============================================================================
// PERSONAS (from personas table)
// =============================================================================

export interface PersonaSchedule {
  id: string;
  days_of_week: number[];
  start_time: number;
  is_active: boolean;
}

export interface PersonaConfigDNA {
  identity_context: string;
  source_logic: string;
  voice_dna: string;
  anti_patterns: string;
  structural_archetypes: {
    name: string;
    description: string;
    example: string;
  }[];
  validation_checklist: string[];
  image_probability?: number;
  headlines_to_fetch?: number;
  headlines_in_prompt?: number;
  supports_threads?: boolean;
  [key: string]: unknown; // Allow dynamic config properties
}

export interface Persona {
  id: string;
  user_id?: string | null;  // Can be null - persona tied to account not user
  connected_account_id: string | null;
  name: string;
  description?: string | null;
  config?: PersonaConfigDNA | Record<string, unknown>;
  min_length?: number;
  max_length?: number;
  tone?: string | null;
  topics?: string[] | null;
  rss_sources?: string[];
  is_active?: boolean;
  is_default?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
  key: string;
  // UI-only fields (not in DB)
  emoji?: string;
  schedules?: PersonaSchedule[];
}

// Tweet and Content Types
export interface Tweet {
  id: string;
  connected_account_id: string;
  account_id?: string; // Deprecated - use connected_account_id
  content: string;
  hashtags: string[];
  persona: string;
  qualityScore?: {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  status: 'ready' | 'posted' | 'failed' | 'draft' | 'scheduled';
  posted_at?: string;
  twitter_id?: string;
  twitter_url?: string;
  error_message?: string;
  created_at: string;
  // Schedule & persona tracking
  schedule_id?: string; // The schedule that triggered this tweet's generation
  persona_id?: string;  // The DB id of the persona used to generate this
  // Threading support
  thread_id?: string;
  thread_sequence?: number;
  parent_twitter_id?: string | null;
  content_type: 'single_tweet' | 'thread';
  // Image support
  image_url?: string; // Cloudinary URL for image-based tweets
  image_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  card_data?: string; // JSON-encoded card data for async image generation
  source_url?: string;
  // LinkedIn cross-posting support
  linkedin_id?: string;
}

export interface EnhancedTweet {
  content: string;
  hashtags: string[];
  persona: string;
  engagementHooks: string[];
  contentType: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy' | 'single_tweet' | 'thread';
  imageBuffer?: Buffer;
  imageUrl?: string;
  imageStatus?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  cardData?: Record<string, unknown>; // Generic card data from AI (configurable via DB)
  sourceUrl?: string;
  selectedHeadlineNumber?: number;
  reasoning?: Record<string, string>;
}

// Generic card data - structure defined by AI prompt in DB
export interface CardData {
  [key: string]: unknown;
  type?: string;
}

// TweetJob - kept for backward compatibility
export interface TweetJob {
  id: string;
  persona: string;
  generation_date: string;
  category: string;
  category_display_name: string;
  topic: string;
  topic_display_name: string;
  content_type: string;
  step: number;
  status: 'ready' | 'posted' | 'failed';
  data: {
    tweet: EnhancedTweet;
  };
  created_at: string;
  scheduled_for?: string;
  posted_at?: string;
  twitter_id?: string;
  twitter_url?: string;
  error_message?: string;
}

export interface VariationMarkers {
  time_marker: string;
  token_marker: string;
  generation_timestamp: number;
  content_hash: string;
}

export interface TweetGenerationConfig {
  connected_account_id?: string; // Multi-account support (use connected_accounts table)
  account_id?: string; // Deprecated - use connected_account_id
  persona?: string;
  category?: string;
  topic?: string;
  contentType?: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  skipRSS?: boolean;
}

// NEW: Added the complete type definition for the object returned by generateThread
export interface ThreadGenerationResult {
  thread_id: string;
  total_tweets: number;
  story_category: string;
}

export interface ImageConfig {
  enabled: boolean;
  unsplashQuery?: string;
  dimensions: {
    width: number;
    height: number;
  };
  textStyle: {
    wordSize: number;
    meaningSize: number;
    exampleSize: number;
    wordColor: string;
    meaningColor: string;
    exampleColor: string;
    fontFamily: string;
    backgroundColor: string;
    backgroundOpacity: number;
  };
}


// Form and UI Types
export interface GenerateFormState {
  account_id: string;
  persona: string;
  includeHashtags: boolean;
  useTrendingTopics: boolean;
  customPrompt: string;
}

export interface DashboardStats {
  ready: number;
  posted: number;
}

export interface AutoSchedulerStats {
  totalGenerated: number;
  totalPosted: number;
  lastRun: Date | null;
  nextRun: Date | null;
  schedule: string;
  isRunning: boolean;
  note: string;
}

export interface GenerationResult {
  success: boolean;
  tweet?: EnhancedTweet;
  jobId?: string;
  error?: string;
}

// Re-use standard Persona type
export type UserPersona = Persona;

// Legacy schedule type - uses account_schedules table
export interface UserSchedule {
  id: string;
  user_id: string;
  connected_account_id: string;
  name: string;
  description?: string;
  persona_id?: string;
  timezone: string;
  schedule_config?: Record<string, unknown>;
  days_of_week: number[];
  start_time: number;
  end_time: number;
  is_active: boolean;
  max_posts_per_day?: number;
  created_at: Date;
  updated_at: Date;
}

export interface PlatformSettings {
  id: string;
  setting_key: string;
  is_active: boolean;
  cloud_name?: string;
}