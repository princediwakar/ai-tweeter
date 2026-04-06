import { NextRequest, NextResponse } from 'next/server';
import { getTweetsWithPendingImages, updateTweetImage } from '@/lib/db';
import { generatePersonaImage } from '@/lib/services/imageGenerationService';
import { logger } from '@/lib/logger';

/**
 * Background Image Processing API
 * Processes queued image generation requests in parallel.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const batchId = Math.random().toString(36).substring(2, 8);
    
    logger.info(`[ImageProcessor:${batchId}] Starting parallel image processing (limit: ${limit})`, 'image-processor');

    const pendingTweets = await getTweetsWithPendingImages(limit);
    
    if (pendingTweets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tweets with pending images found.',
        processed: 0,
        failed: 0,
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`[ImageProcessor:${batchId}] Found ${pendingTweets.length} tweets to process`, 'image-processor');

    const processingPromises = pendingTweets.map(async (tweet) => {
      try {
        await updateTweetImage(tweet.id, undefined, 'processing');
        
        if (!tweet.card_data) {
          throw new Error('No card_data found for image generation');
        }

        const cardData = JSON.parse(tweet.card_data) as Record<string, unknown>;
        
        // Use connected_account_id (not account_id) to match tweets table schema
        const imageUrl = await generatePersonaImage(cardData, tweet.persona, tweet.connected_account_id);
        
        if (imageUrl) {
          await updateTweetImage(tweet.id, imageUrl, 'completed');
          logger.info(`[ImageProcessor:${batchId}] Success for tweet ${tweet.id}`, 'image-processor-success');
          return { status: 'fulfilled', id: tweet.id, url: imageUrl } as const;
        } else {
          throw new Error('Image generation returned a null or empty URL');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await updateTweetImage(tweet.id, undefined, 'failed');
        logger.error(`[ImageProcessor:${batchId}] Failure for tweet ${tweet.id}: ${errorMsg}`, 'image-processor-error', error as Error);
        return { status: 'rejected', id: tweet.id, error: errorMsg } as const;
      }
    });

    const results = await Promise.allSettled(processingPromises);
    
    // ✅ FIX 2 & 3: Rewrote the tallying logic to be more explicit for TypeScript's type narrowing.
    const processed: { id: string; url: string; }[] = [];
    const errors: { id: string; error: string; }[] = [];
    
    for (const result of results) {
      if (result.status === 'rejected') {
        // This catches unexpected crashes within the promise itself.
        errors.push({ id: 'unknown', error: `Promise rejected: ${result.reason}` });
        continue;
      }
      
      // The promise fulfilled, so we can safely access its `value`.
      const value = result.value;
      if (value.status === 'fulfilled') {
        processed.push({ id: value.id, url: value.url });
      } else { // value.status === 'rejected'
        errors.push({ id: value.id, error: value.error });
      }
    }

    const response = {
      success: true,
      message: `Image processing batch complete.`,
      batchId,
      found: pendingTweets.length,
      processed: processed.length,
      failed: errors.length,
      results: {
        processed,
        errors: errors.length > 0 ? errors : undefined
      },
      timestamp: new Date().toISOString()
    };

    logger.info(`[ImageProcessor:${batchId}] Batch complete: ${processed.length} processed, ${errors.length} failed`, 'image-processor-complete');
    
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Critical failure in image processing API', 'image-processor-critical', error as Error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process background images due to a critical error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}