import { NextRequest, NextResponse } from 'next/server';
import { getAllTweets } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const tweets = await getAllTweets();
    return NextResponse.json({ success: true, tweets: tweets.slice(0, 10) });
  } catch (error) {
    logger.error('Error fetching tweets from DB', 'debug-tweets', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tweets' },
      { status: 500 }
    );
  }
}
