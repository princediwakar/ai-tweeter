// lib/types.ts

// Core Account and User Types
export interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: Date | null;
  image: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  expires: Date;
  session_token: string;
  created_at: Date;
}

export interface UserAccount {
  user_id: string;
  account_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: Date;
}

export interface Account {
  id: string;
  name: string | null;
  twitter_handle: string;
  status: 'active' | 'inactive' | 'suspended';
  twitter_api_key_encrypted?: string;
  twitter_api_secret_encrypted?: string;
  twitter_access_token_encrypted?: string;
  twitter_access_token_secret_encrypted?: string;
  cloudinary_cloud_name_encrypted?: string;
  cloudinary_api_key_encrypted?: string;
  cloudinary_api_secret_encrypted?: string;
  // LinkedIn OAuth credentials
  linkedin_access_token_encrypted?: string;
  linkedin_refresh_token_encrypted?: string;
  linkedin_user_id?: string;
  linkedin_org_id?: string;
  linkedin_enabled?: boolean;
  linkedin_token_expires_at?: Date;
  // Twitter OAuth 2.0 credentials
  twitter_oauth2_access_token_encrypted?: string;
  twitter_oauth2_refresh_token_encrypted?: string;
  twitter_oauth2_user_id?: string;
  twitter_oauth2_enabled?: boolean;
  twitter_oauth2_token_expires_at?: Date;
  // Twitter OAuth 2.0 Client Credentials
  twitter_oauth2_client_id_encrypted?: string;
  twitter_oauth2_client_secret_encrypted?: string;
  // SaaS multi-tenancy
  owner_id?: string;
  personas: string[];
  branding: {
    theme: string;
    audience: string;
    tone: string;
    cta_frequency?: number;
    cta_message?: string;
    max_pipeline_size?: number;
    supports_threads?: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

// Extended account with decrypted credentials for internal use
export interface AccountWithCredentials extends Account {
  twitter_api_key?: string;
  twitter_api_secret?: string;
  twitter_access_token?: string;
  twitter_access_token_secret?: string;
  cloudinary_cloud_name?: string;
  cloudinary_api_key?: string;
  cloudinary_api_secret?: string;
  // Decrypted LinkedIn credentials
  linkedin_access_token?: string;
  linkedin_refresh_token?: string;
  // Decrypted Twitter OAuth 2.0 credentials
  twitter_oauth2_access_token?: string;
  twitter_oauth2_refresh_token?: string;
  // Decrypted Twitter OAuth 2.0 Client Credentials
  twitter_oauth2_client_id?: string;
  twitter_oauth2_client_secret?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  emoji: string;
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
  // Threading support
  thread_id?: string;
  thread_sequence?: number;
  parent_twitter_id?: string | null;
  content_type: 'single_tweet' | 'thread';
  // Image support
  image_url?: string; // Cloudinary URL for image-based tweets
  image_status?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  card_data?: string; // JSON-encoded VocabularyCard data for async image generation
  source_url?: string;
  // LinkedIn cross-posting support
  linkedin_id?: string;
}

export interface EnhancedTweet {
  content: string;
  hashtags: string[];
  persona: string;
  engagementHooks: string[];
  gibbiCTA?: string;
  contentType: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  imageBuffer?: Buffer; // Image data for image-based tweets (deprecated)
  imageUrl?: string; // Cloudinary URL for image-based tweets
  imageStatus?: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  cardData?: CardData; // Card data for async image generation (vocab or satirist)
  sourceUrl?: string;
  selectedHeadlineNumber?: number; // Track which headline was used (satirist persona)
  reaasoning?: Record<string, string>;
}

export interface VocabularyCard {
  word: string;
  meaning: string;
  example?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  synonyms?: string[];
  type?: 'single_word' | 'confused_pair' | 'synonym_list' | 'idiom' | 'phrasal_verb';
}

export interface SatiristCard {
  type: 'satirist_insight';
  imageContent: string;
}

// --- NEW ---
export interface PatternSpotterCard {
  type: 'pattern_spotter_insight';
  imageContent: string;
}

export interface LinkedinAnalystCard {
  type: 'linkedin_analyst_insight';
  imageContent: string;
}
// --- END NEW ---

// --- MODIFIED ---
export type CardData = VocabularyCard | SatiristCard | PatternSpotterCard | LinkedinAnalystCard;
// --- END MODIFIED ---

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

// =============================================================================
// SaaS Platform Types
// =============================================================================

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  account_name?: string;
  platform_user_id?: string;
  is_active: boolean;
  connected_at: Date;
  last_used_at?: Date;
}

export interface UserPersona {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  base_persona?: string;
  config: Record<string, unknown>;
  min_length: number;
  max_length: number;
  tone?: string;
  topics?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSchedule {
  id: string;
  user_id: string;
  connected_account_id: string;
  name: string;
  description?: string;
  persona_id?: string;
  cron_expression: string;
  timezone: string;
  use_trending: boolean;
  include_hashtags: boolean;
  bulk_count: number;
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PlatformSettings {
  id: string;
  setting_key: string;
  is_active: boolean;
  cloud_name?: string;
}