const { sql } = require('@vercel/postgres');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

async function resetSchema() {
  try {
    console.log("Dropping old tables...");
    await sql.query(`
      DROP TABLE IF EXISTS posts CASCADE;
      DROP TABLE IF EXISTS threads CASCADE;
      DROP TABLE IF EXISTS content_calendar CASCADE;
      DROP TABLE IF EXISTS narrative_arcs CASCADE;
      DROP TABLE IF EXISTS content_pillars CASCADE;
      DROP TABLE IF EXISTS brand_knowledge_snapshots CASCADE;
      DROP TABLE IF EXISTS brand_knowledge_sources CASCADE;
      DROP TABLE IF EXISTS brand_profiles CASCADE;
      DROP TABLE IF EXISTS blog_sources CASCADE;
      DROP TABLE IF EXISTS personas CASCADE;
      DROP TABLE IF EXISTS posting_jobs CASCADE;
      DROP TABLE IF EXISTS generation_slots CASCADE;
      DROP TABLE IF EXISTS account_schedules CASCADE;
    `);

    console.log("Reading 000_base_schema.sql...");
    const schemaSql = fs.readFileSync('migrations/000_base_schema.sql', 'utf8');
    
    console.log("Applying schema...");
    await sql.query(schemaSql);
    
    console.log("Schema applied successfully.");
  } catch(e) {
    console.error("Migration Error:", e);
  }
}
resetSchema();
