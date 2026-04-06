import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check recent generation activity
    const generationStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE last_generated_at > ${oneHourAgo.toISOString()}) as last_hour,
        COUNT(*) FILTER (WHERE last_generated_at > ${oneDayAgo.toISOString()}) as last_day,
        COUNT(*) as total
      FROM generation_slots
      WHERE generation_count > 0
    `;

    // Check recent posting activity  
    const postingStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE last_posted_at > ${oneHourAgo.toISOString()}) as last_hour,
        COUNT(*) FILTER (WHERE last_posted_at > ${oneDayAgo.toISOString()}) as last_day,
        COUNT(*) as total
      FROM generation_slots
      WHERE posting_count > 0
    `;

    // Check stuck jobs (processing > 10 min)
    const stuckJobs = await sql`
      SELECT COUNT(*) as count FROM posting_jobs
      WHERE status = 'processing' AND started_at < NOW() - INTERVAL '10 minutes'
    `;

    // Check failed jobs in last 24h
    const failedJobs = await sql`
      SELECT COUNT(*) as count FROM posting_jobs
      WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '24 hours'
    `;

    // Check accounts needing attention (no generation in 2 days)
    const staleAccounts = await sql`
      SELECT COUNT(*) as count FROM connected_accounts a
      WHERE a.is_active = true AND a.platform = 'twitter'
      AND NOT EXISTS (
        SELECT 1 FROM generation_slots gs 
        WHERE gs.connected_account_id = a.id 
        AND gs.last_generated_at > NOW() - INTERVAL '2 days'
      )
    `;

    const genRow = generationStats.rows[0];
    const postRow = postingStats.rows[0];

    const healthScore = calculateHealthScore(
      parseInt(genRow.last_hour) || 0,
      parseInt(postRow.last_hour) || 0,
      parseInt(stuckJobs.rows[0].count) || 0,
      parseInt(failedJobs.rows[0].count) || 0
    );

    const response = {
      healthy: healthScore >= 70,
      score: healthScore,
      timestamp: now.toISOString(),
      generation: {
        lastHour: parseInt(genRow.last_hour) || 0,
        lastDay: parseInt(genRow.last_day) || 0,
        total: parseInt(genRow.total) || 0
      },
      posting: {
        lastHour: parseInt(postRow.last_hour) || 0,
        lastDay: parseInt(postRow.last_day) || 0,
        total: parseInt(postRow.total) || 0
      },
      alerts: {
        stuckJobs: parseInt(stuckJobs.rows[0].count) || 0,
        failedJobsLast24h: parseInt(failedJobs.rows[0].count) || 0,
        staleAccounts: parseInt(staleAccounts.rows[0].count) || 0
      }
    };

    // Log warning if unhealthy
    if (!response.healthy) {
      logger.warn(`⚠️ Cron health check unhealthy: score=${healthScore}`, 'cron-health');
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('❌ Health check failed', 'cron-health', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

function calculateHealthScore(
  genLastHour: number,
  postLastHour: number,
  stuckJobs: number,
  failedJobs: number
): number {
  let score = 100;

  // No generation in last hour = -30
  if (genLastHour === 0) score -= 30;
  
  // No posting in last hour = -20
  if (postLastHour === 0) score -= 20;

  // Stuck jobs = -10 each
  score -= stuckJobs * 10;

  // Failed jobs = -5 each (max -30)
  score -= Math.min(failedJobs * 5, 30);

  return Math.max(0, score);
}