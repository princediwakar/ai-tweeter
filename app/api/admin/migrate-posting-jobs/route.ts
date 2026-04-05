import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Creating posting_jobs table...', 'migrate-jobs');

    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    await sql`
      CREATE TABLE IF NOT EXISTS posting_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id UUID NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
        platform VARCHAR(20) NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        batch_index INTEGER DEFAULT 0,
        tweets_count INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_posting_jobs_status ON posting_jobs(status, created_at) WHERE status IN ('pending', 'processing')`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posting_jobs_account_platform ON posting_jobs(account_id, platform)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posting_jobs_created ON posting_jobs(created_at DESC)`;

    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      CREATE TRIGGER update_posting_jobs_updated_at
        BEFORE UPDATE ON posting_jobs
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `;

    const result = await sql`SELECT COUNT(*) as count FROM posting_jobs`;

    logger.info(`✅ posting_jobs table created successfully. Current count: ${result.rows[0].count}`, 'migrate-jobs');

    return NextResponse.json({ 
      success: true, 
      message: 'Migration complete',
      tableCreated: true,
      existingJobs: parseInt(result.rows[0].count)
    });

  } catch (error) {
    logger.error('Migration failed', 'migrate-jobs', error as Error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}