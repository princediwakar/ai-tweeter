// Core Account and User Types
export interface Account {
  id: string;
  name: string;
  twitter_handle: string;
  status: 'active' | 'inactive' | 'suspended';
  twitter_api_key: string;
  twitter_api_secret: string;
  twitter_access_token: string;
  twitter_access_token_secret: string;
  personas: string[];
  branding: {
    theme: string;
    audience: string;
    tone: string;
    cta_frequency?: number;
    cta_message?: string;
  };
  created_at: Date;
  updated_at: Date;
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
  account_id: string;
  content: string;
  hashtags: string[];
  persona: string;
  qualityScore?: {
    overall: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  quality_score?: unknown;
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
  hook_type?: 'opener' | 'context' | 'crisis' | 'resolution' | 'lesson';
}

export interface EnhancedTweet {
  content: string;
  hashtags: string[];
  persona: string;
  category: string;
  topic: string;
  engagementHooks: string[];
  gibbiCTA?: string;
  contentType: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
  imageBuffer?: Buffer; // Image data for image-based tweets
}

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
  account_id?: string; // Multi-account support
  persona?: string;
  category?: string;
  topic?: string;
  contentType?: 'explanation' | 'concept_clarification' | 'memory_aid' | 'practical_application' | 'common_mistake' | 'analogy';
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