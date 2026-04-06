import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Add onboarding tracking columns to users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_topics TEXT[] DEFAULT '{}'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_post_frequency INTEGER DEFAULT 3`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_post_time VARCHAR(20) DEFAULT 'morning'`;

    // Fix connected_accounts — add updated_at column if missing
    await sql`ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
    // Backfill existing rows
    await sql`UPDATE connected_accounts SET updated_at = connected_at WHERE updated_at IS NULL`;

    // Mark existing users with connected accounts as having completed onboarding
    // so they don't get sent through the wizard again
    await sql`
      UPDATE users u
      SET onboarding_completed = true
      WHERE EXISTS (
        SELECT 1 FROM connected_accounts ca WHERE ca.user_id = u.id
      )
      AND (u.onboarding_completed IS NULL OR u.onboarding_completed = false)
    `;

    const usersCount = await sql`SELECT COUNT(*) as count FROM users WHERE onboarding_completed = true`;

    return NextResponse.json({
      success: true,
      message: 'Onboarding migration completed',
      existing_users_grandfathered: usersCount.rows[0].count,
    });
  } catch (error) {
    console.error('Onboarding migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
