import { sql } from '@vercel/postgres';

export async function createPersonaTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS custom_personas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      
      -- Persona configuration stored as JSON
      persona_config JSONB NOT NULL DEFAULT '{}',
      
      -- Base persona to inherit from
      base_persona VARCHAR(100),
      
      -- Generation settings
      min_length INTEGER DEFAULT 100,
      max_length INTEGER DEFAULT 280,
      
      -- Enable/disable
      is_active BOOLEAN DEFAULT true,
      
      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_custom_personas_account_id 
    ON custom_personas(account_id);
  `;

  console.log('✅ custom_personas table created');
}