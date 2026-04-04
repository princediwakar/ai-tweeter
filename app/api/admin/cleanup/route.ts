import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Delete all accounts
    await sql`DELETE FROM accounts`;
    
    // 2. Drop old tables
    await sql`DROP TABLE IF EXISTS custom_personas CASCADE`;
    await sql`DROP TABLE IF EXISTS account_schedules CASCADE`;
    await sql`DROP TABLE IF EXISTS user_accounts CASCADE`;
    await sql`DROP TABLE IF EXISTS engagement_log CASCADE`;
    
    // 3. Verify platform settings
    const settings = await sql`
      SELECT setting_key, is_active, cloud_name, 
             CASE WHEN client_id_encrypted IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as client_id,
             CASE WHEN api_key_encrypted IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as api_key
      FROM platform_settings
    `;

    return NextResponse.json({
      success: true,
      message: 'Old data cleaned up',
      platform_settings: settings.rows
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}