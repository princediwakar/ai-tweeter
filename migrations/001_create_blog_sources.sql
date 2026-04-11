-- Migration: Create blog_sources table
-- Curated blog sources for content generation

CREATE TABLE IF NOT EXISTS blog_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  category TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_blog_sources_category ON blog_sources(category);

-- Index for filtering by topics (using array overlap)
CREATE INDEX IF NOT EXISTS idx_blog_sources_topics ON blog_sources USING GIN(topics);

-- Index for active sources
CREATE INDEX IF NOT EXISTS idx_blog_sources_active ON blog_sources(is_active) WHERE is_active = true;