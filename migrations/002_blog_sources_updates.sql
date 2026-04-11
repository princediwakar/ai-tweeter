-- Migration: Add updated_at and unique constraint
-- Run after 001_create_blog_sources.sql

-- 1. Add updated_at column
ALTER TABLE blog_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add unique constraint on url (requires handling existing duplicates first)
-- Check for duplicates first
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT url, COUNT(*) as cnt 
    FROM blog_sources 
    WHERE is_active = true AND url IS NOT NULL
    GROUP BY url 
    HAVING COUNT(*) > 1
  ) sub;

  IF dup_count = 0 THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_blog_sources_url ON blog_sources(url)';
  ELSE
    RAISE NOTICE 'Found % duplicate URLs. Run cleanup manually before adding unique index', dup_count;
  END IF;
END
$$;