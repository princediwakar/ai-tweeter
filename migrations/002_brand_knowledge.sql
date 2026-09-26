CREATE TABLE IF NOT EXISTS brand_knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'website',
    label TEXT,
    crawl_depth INTEGER NOT NULL DEFAULT 1,
    crawl_frequency TEXT NOT NULL DEFAULT 'weekly',
    max_pages INTEGER NOT NULL DEFAULT 10,
    crawl_status TEXT NOT NULL DEFAULT 'pending',
    crawl_error TEXT,
    pages_crawled INTEGER NOT NULL DEFAULT 0,
    last_crawled_at TIMESTAMPTZ,
    next_crawl_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bks_brand_profile ON brand_knowledge_sources(brand_profile_id);

CREATE TABLE IF NOT EXISTS brand_knowledge_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES brand_knowledge_sources(id) ON DELETE CASCADE,
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    raw_content TEXT,
    raw_content_hash TEXT,
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    changes_from_previous JSONB,
    snapshot_version INTEGER NOT NULL DEFAULT 1,
    crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bksnap_source ON brand_knowledge_snapshots(source_id);
