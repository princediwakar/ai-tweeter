-- Add new fields for Ecosystem Brain
ALTER TABLE brand_profiles 
ADD COLUMN primary_stakeholder_persona TEXT,
ADD COLUMN ecosystem_dynamics TEXT;
