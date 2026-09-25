-- ============================================================================
-- Migration 004: Brand Engine
-- Creates all tables for the perennial brand engine architecture.
-- Model: User → Brand Profiles → Connected Accounts
-- A user can manage multiple brands. Each brand has its own knowledge, pillars,
-- calendar, and connected social accounts.
-- ============================================================================

-- ─── Brand Profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,

    -- Identity
    brand_name TEXT NOT NULL,
    brand_url TEXT,
    brand_description TEXT NOT NULL DEFAULT '',

    -- Structured knowledge
    value_propositions JSONB NOT NULL DEFAULT '[]',
    target_audiences JSONB NOT NULL DEFAULT '[]',
    features JSONB NOT NULL DEFAULT '[]',
    differentiators JSONB NOT NULL DEFAULT '[]',
    social_proof JSONB NOT NULL DEFAULT '[]',

    -- Voice & positioning
    brand_voice TEXT NOT NULL DEFAULT '',
    brand_mission TEXT,
    competitive_angle TEXT,

    -- Guardrails
    never_say JSONB NOT NULL DEFAULT '[]',
    never_topics JSONB NOT NULL DEFAULT '[]',

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    onboarding_status TEXT NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_user ON brand_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_profiles_account ON brand_profiles(connected_account_id);

-- ─── Brand Knowledge Sources ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

    url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'website',
    label TEXT,

    crawl_depth INTEGER NOT NULL DEFAULT 1,
    crawl_frequency TEXT NOT NULL DEFAULT 'weekly',
    max_pages INTEGER NOT NULL DEFAULT 10,

    last_crawled_at TIMESTAMPTZ,
    next_crawl_at TIMESTAMPTZ,
    crawl_status TEXT NOT NULL DEFAULT 'pending',
    crawl_error TEXT,
    pages_crawled INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_brand ON brand_knowledge_sources(brand_profile_id);

-- ─── Brand Knowledge Snapshots ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_knowledge_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES brand_knowledge_sources(id) ON DELETE CASCADE,
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

    raw_content TEXT,
    raw_content_hash TEXT,
    extracted_data JSONB NOT NULL DEFAULT '{}',
    changes_from_previous JSONB,

    snapshot_version INTEGER NOT NULL DEFAULT 1,
    crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_source ON brand_knowledge_snapshots(source_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_brand ON brand_knowledge_snapshots(brand_profile_id);

-- ─── Content Pillars ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',

    example_angles JSONB NOT NULL DEFAULT '[]',
    target_audience TEXT,

    weight REAL NOT NULL DEFAULT 1.0,
    min_gap_days INTEGER NOT NULL DEFAULT 2,
    max_per_week INTEGER NOT NULL DEFAULT 3,

    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pillars_brand ON content_pillars(brand_profile_id);

-- ─── Content Calendar ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

    planned_date DATE NOT NULL,
    planned_platform TEXT NOT NULL DEFAULT 'linkedin',

    pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,
    angle TEXT NOT NULL DEFAULT '',
    target_audience TEXT,

    builds_on_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    narrative_note TEXT,

    status TEXT NOT NULL DEFAULT 'planned',
    generated_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_brand_date ON content_calendar(brand_profile_id, planned_date);

-- ─── Narrative Arcs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS narrative_arcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    stages JSONB NOT NULL DEFAULT '[]',
    current_stage INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arcs_brand ON narrative_arcs(brand_profile_id);

-- ─── Extend posts table ─────────────────────────────────────────────────────

DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN pillar_id UUID REFERENCES content_pillars(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN calendar_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN target_audience TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN narrative_tags JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN theme_summary TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_brand ON posts(brand_profile_id);
CREATE INDEX IF NOT EXISTS idx_posts_pillar ON posts(pillar_id);
