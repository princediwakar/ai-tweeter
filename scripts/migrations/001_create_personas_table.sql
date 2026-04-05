-- scripts/migrations/001_create_personas_table.sql
-- Create the personas table to house all configuration, metadata, and prompt logic.

CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Structure of Depth Layers (Persona Blueprint)
    identity_prompt TEXT,               -- Layer 1: Identity
    source_selection_logic TEXT,        -- Layer 2: Filtering
    voice_dna TEXT,                     -- Layer 3: Style
    anti_patterns TEXT,                 -- Layer 4: Banned words
    structural_archetypes JSONB,        -- Layer 5: Rotation formats
    formatting_constraints JSONB,       -- Layer 6: Limits, Layout
    validation_checklist TEXT,          -- Layer 7: Sanity checks
    
    -- Operational Config
    config JSONB DEFAULT '{}'::jsonb,   -- Feeds, probabilities, etc.
    
    is_system BOOLEAN DEFAULT false,    -- Is it a built-in persona?
    user_id UUID,                       -- For user-created personas (future auth integration)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_personas_key ON personas(key);
CREATE INDEX IF NOT EXISTS idx_personas_is_system ON personas(is_system);
