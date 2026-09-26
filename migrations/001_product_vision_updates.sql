ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS autonomy_mode VARCHAR(50) DEFAULT 'copilot';
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS consecutive_approved_posts INTEGER DEFAULT 0;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS custom_instructions TEXT DEFAULT '';

ALTER TABLE blog_sources ADD COLUMN IF NOT EXISTS brand_profile_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE;
