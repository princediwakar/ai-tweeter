const { sql } = require('@vercel/postgres');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

async function check() {
  try {
    const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables:", res.rows.map(r => r.table_name));

    // Try inserting to see the error
    try {
      await sql`
        INSERT INTO brand_profiles (user_id, name, description, industry, tone_of_voice, target_audience, core_values, created_at, updated_at)
        VALUES (
          (SELECT id FROM users LIMIT 1), 
          'Test', 
          'Test Desc', 
          'Test Ind', 
          '["tone"]'::jsonb, 
          '["aud"]'::jsonb, 
          '["val"]'::jsonb, 
          NOW(), NOW()
        )
      `;
      console.log("Insert worked.");
    } catch (e) {
      console.error("Insert Error:", e);
    }
  } catch(e) {
    console.error(e);
  }
}
check();
