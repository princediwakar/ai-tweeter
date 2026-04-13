-- Migration: Add source_type column to blog_sources
-- Enables filtering sources by professional domain

ALTER TABLE blog_sources ADD COLUMN IF NOT EXISTS source_type TEXT 
  DEFAULT 'general' 
  CHECK (source_type IN (
    'technical_ai', 'product', 'engineering', 
    'business', 'marketing', 'finance', 'sales', 
    'indie_hacker', 'general'
  ));

-- Index for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_blog_sources_source_type ON blog_sources(source_type);

-- Update existing sources with source_type based on category
UPDATE blog_sources SET source_type = 
  CASE 
    WHEN category ILIKE '%AI%' OR category ILIKE '%ML%' OR category ILIKE '%Tech%' THEN 'technical_ai'
    WHEN category ILIKE '%Product%' THEN 'product'
    WHEN category ILIKE '%Engineer%' OR category ILIKE '%Software%' THEN 'engineering'
    WHEN category ILIKE '%Business%' OR category ILIKE '%Startup%' THEN 'business'
    WHEN category ILIKE '%Marketing%' THEN 'marketing'
    WHEN category ILIKE '%Finance%' OR category ILIKE '%Stock%' OR category ILIKE '%Invest%' THEN 'finance'
    WHEN category ILIKE '%Sales%' THEN 'sales'
    WHEN category ILIKE '%Indie%' OR category ILIKE '%Solo%' THEN 'indie_hacker'
    ELSE 'general'
  END
WHERE source_type IS NULL OR source_type = 'general';