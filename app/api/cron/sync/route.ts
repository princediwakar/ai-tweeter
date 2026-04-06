import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { postingJobQueue } from '@/lib/postingJobQueue';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('🔄 Running daily job queue sync', 'cron-sync');

    const twitterEnqueued = await postingJobQueue.syncScheduledJobs('twitter');
    const linkedinEnqueued = await postingJobQueue.syncScheduledJobs('linkedin');

    const twitterStats = await postingJobQueue.getQueueStats('twitter');
    const linkedinStats = await postingJobQueue.getQueueStats('linkedin');

    const cleanedTwitter = await postingJobQueue.clearOldCompleted(7);
    const cleanedLinkedin = await postingJobQueue.clearOldCompleted(7);

    logger.info(`✅ Sync complete: Twitter ${twitterEnqueued} enqueued, LinkedIn ${linkedinEnqueued} enqueued, ${cleanedTwitter + cleanedLinkedin} cleaned`, 'cron-sync');

    return NextResponse.json({
      success: true,
      twitter: { enqueued: twitterEnqueued, ...twitterStats },
      linkedin: { enqueued: linkedinEnqueued, ...linkedinStats },
      cleaned: cleanedTwitter + cleanedLinkedin,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Cron sync failed', 'cron-sync', error as Error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}