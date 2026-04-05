import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Drop unused/legacy tables only (tables that have no code references)
    await sql`DROP TABLE IF EXISTS custom_personas CASCADE`;
    await sql`DROP TABLE IF EXISTS user_accounts CASCADE`;
    await sql`DROP TABLE IF EXISTS schedules CASCADE`;
    
    // Verify platform settings remain
    const settings = await sql`
      SELECT setting_key, is_active, cloud_name, 
             CASE WHEN client_id_encrypted IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as client_id,
             CASE WHEN api_key_encrypted IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as api_key
      FROM platform_settings
    `;

    // Verify key tables exist
    const tables = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    return NextResponse.json({
      success: true,
      message: 'Legacy tables cleaned up',
      platform_settings: settings.rows,
      remaining_tables: tables.rows.map(t => t.table_name)
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}