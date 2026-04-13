// lib/types.ts - All shared types (database + domain)
// Updated to match new normalized schema

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
// CONNECTED ACCOUNTS (credentials merged into this table)
// =============================================================================

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  name: string | null;
  platform_user_id: string | null;
  is_active: boolean;
  status: string;
  connected_at: Date | null;
  updated_at: Date | null;
  profile_url?: string | null;
  // Optional credential fields (exposed for convenience, prefer using ConnectedAccountWithCredentials)
  auth_type?: AuthType | null;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expires_at?: Date | null;
  api_key_encrypted?: string | null;
  api_secret_encrypted?: string | null;
}

// =============================================================================
// ACCOUNT CREDENTIALS (DEPRECATED - merged into connected_accounts)
// Kept for backward compatibility
// =============================================================================

export type AuthType = 'oauth1' | 'oauth2' | 'api_key';

export interface AccountCredential {
  id: string;
  connected_account_id: string;
  auth_type: AuthType;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: Date | null;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Decrypted credentials for internal use
export interface AccountCredentialDecrypted extends Omit<AccountCredential, 'access_token_encrypted' | 'refresh_token_encrypted' | 'api_key_encrypted' | 'api_secret_encrypted'> {
  access_token: string | null;
  refresh_token: string | null;
  api_key: string | null;
  api_secret: string | null;
}

// Account with decrypted credentials (joined view)
export interface ConnectedAccountWithCredentials extends ConnectedAccount {
  credentials: AccountCredentialDecrypted[];
}

// =============================================================================
// SOCIAL POSTS (platform-specific post IDs)
// =============================================================================

export interface SocialPost {
  id: string;
  post_id: string;
  platform: 'twitter' | 'linkedin';
  platform_post_id: string | null;
  platform_post_url: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

// =============================================================================
// PERSONAS (tied to connected_account)
// =============================================================================

export interface PersonaSchedule {
  id: string;
  days_of_week: number[];
  start_time: number;
  is_active: boolean;
}

export interface PersonaConfigDNA {
  core_thesis: string;
  the_enemy: string;
  analytical_framework: string;
  framing_bias: string;
  hook_mechanics: string;
  format_rules: string[];
  headlines_to_fetch: number;
  headlines_in_prompt: number;
  image_probability: number;
  supports_threads?: boolean;
  source_type?: string;
}

export interface Persona {
  id: string;
  connected_account_id: string | null;
  key: string;
  name: string;
  description: string | null;
  config: PersonaConfigDNA | Record<string, unknown>;
  min_length: number;
  max_length: number;
  tone: string | null | undefined;
  topics: string[] | null | undefined;
  rss_sources: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  // UI-only fields (not in DB)
  emoji?: string;
  schedules?: PersonaSchedule[];
}

// =============================================================================
// POSTS (renamed from tweets)
// =============================================================================

export type PostStatus = 'ready' | 'posted' | 'failed' | 'draft' | 'scheduled';
export type ContentType = 'single_tweet' | 'thread';
export type ImageStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

export interface Post {
  id: string;
  connected_account_id?: string | null;
  content: string;
  hashtags?: string[];
  persona: string;
  qualityScore?: {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  status: PostStatus;
  posted_at?: Date | null;
  error_message?: string | null;
  created_at: Date;
  // Schedule & persona tracking
  schedule_id?: string | null;
  persona_id?: string | null;
  // Threading support
  thread_id?: string | null;
  thread_sequence?: number | null;
  content_type?: ContentType;
  // Image support
  image_url?: string | null;
  image_status?: ImageStatus;
  card_data?: string | null;
  source_url?: string | null;
  
  // Legacy camelCase aliases (for backward compat)
  postedAt?: Date | undefined;
  errorMessage?: string | undefined;
  createdAt?: Date;
}

// Post with platform-specific IDs
export interface PostWithSocialPosts extends Post {
  social_posts: SocialPost[];
}

export interface EnhancedPost {
  content: string;
  hashtags: string[];
  persona: string;
  engagementHooks: string[];
  contentType: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy' | 'single_tweet' | 'thread';
  imageBuffer?: Buffer;
  imageUrl?: string;
  imageStatus?: ImageStatus;
  cardData?: Record<string, unknown>;
  sourceUrl?: string;
  selectedHeadlineNumber?: number;
  reasoning?: Record<string, string>;
}

export interface CardData {
  [key: string]: unknown;
  type?: string;
}

export interface PostGenerationConfig {
  connected_account_id?: string;
  persona?: string;
  category?: string;
  topic?: string;
  contentType?: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  batchPosition?: number;
  batchSize?: number;
  previousWords?: string[];
  previousHeadlines?: number[];
  recentPatterns?: { text: string; timestamp?: string }[];
  usedSourceUrls?: string[];
  generationFormat?: 'image' | 'text-only';
  skipRSS?: boolean;
  sourceContext?: string;
}

export interface VariationMarkers {
  time_marker: string;
  token_marker: string;
  generation_timestamp: number;
  content_hash: string;
}

export interface GenerationContext {
  account: ConnectedAccount | null;
  useRSSSources: boolean;
  sourceContext: string;
  userTopicContext?: string;
}

export interface ThreadGenerationResult {
  thread_id: string;
  total_tweets: number;
  story_category: string;
}

// =============================================================================
// IMAGE GENERATION
// =============================================================================

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

// =============================================================================
// SCHEDULES (account_schedules table)
// =============================================================================

export interface AccountSchedule {
  id: string;
  connected_account_id: string | null;
  persona_id: string | null;
  name: string;
  timezone: string;
  schedule_config: Record<string, unknown>;
  days_of_week: number[];
  start_time: number;
  end_time: number;
  is_active: boolean;
  max_posts_per_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserSchedule extends AccountSchedule {
  user_id: string;
  description?: string;
}

// =============================================================================
// PLATFORM SETTINGS (global_integrations table)
// =============================================================================

export interface GlobalIntegration {
  id: string;
  setting_key: string;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  client_id_encrypted: string | null;
  client_secret_encrypted: string | null;
  cloud_name: string | null;
  extra_settings: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type PlatformSettings = GlobalIntegration;

// =============================================================================
// THREADS
// =============================================================================

export interface Thread {
  id: string;
  connected_account_id: string | null;
  title: string | null;
  persona: string | null;
  total_tweets: number | null;
  current_tweet: number;
  parent_tweet_id: string | null;
  status: string;
  story_category: string | null;
  created_at: Date;
}

// =============================================================================
// GENERATION SLOTS
// =============================================================================

export interface GenerationSlot {
  id: string;
  connected_account_id: string;
  schedule_id: string | null;
  slot_date: Date;
  slot_hour: number;
  slot_minute: number;
  generation_count: number;
  last_generated_at: Date | null;
  posting_count: number;
  last_posted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// POSTING JOBS
// =============================================================================

export type PostingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PostingJob {
  id: string;
  account_id: string;
  platform: 'twitter' | 'linkedin';
  status: PostingJobStatus;
  batch_index: number;
  tweets_count: number;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  user_id: string | null;
  schedule_id: string | null;
  scheduled_date: Date | null;
}

// =============================================================================
// UI Types
// =============================================================================

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
  post?: EnhancedPost;
  jobId?: string;
  error?: string;
}

export type UserPersona = Persona;