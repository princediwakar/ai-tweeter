// app/api/admin/migrate-tweet-metadata/route.ts
// Migration: Add schedule_id and persona_id columns to tweets table
// Run once via GET /api/admin/migrate-tweet-metadata (with CRON_SECRET auth)
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const steps: string[] = [];

    // Add schedule_id column referencing account_schedules (not the old schedules table)
    await sql`
      ALTER TABLE tweets 
      ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES account_schedules(id) ON DELETE SET NULL
    `;
    steps.push('Added schedule_id column to tweets (references account_schedules)');

    // Add persona_id column referencing personas
    await sql`
      ALTER TABLE tweets 
      ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL
    `;
    steps.push('Added persona_id column to tweets (references personas)');

    // Add indexes for efficient querying
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tweets_schedule_id ON tweets(schedule_id)
    `;
    steps.push('Created index on tweets.schedule_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tweets_persona_id ON tweets(persona_id)
    `;
    steps.push('Created index on tweets.persona_id');

    return NextResponse.json({
      success: true,
      message: 'Tweet metadata migration completed',
      steps,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
