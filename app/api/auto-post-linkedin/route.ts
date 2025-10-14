// app/api/auto-post-linkedin/route.ts
// LinkedIn posting service - independent of Twitter posting

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';
import { getCurrentTimeInIST } from '@/lib/utils';
import {
  getScheduledPersonasForLinkedInPosting,
  isLinkedInPostingScheduled
} from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import {
  postToLinkedIn,
  refreshAccessToken,
  shouldRefreshToken,
  LinkedInCredentials
} from '@/lib/linkedin';
import { Tweet } from '@/lib/types';

/**
 * Auto-post LinkedIn endpoint - posts ready content to LinkedIn
 * Runs on separate schedule from Twitter posting
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const debugMode = process.env.DEBUG_MODE === 'true';
    const nowIST = getCurrentTimeInIST();
    const currentHourIST = nowIST.getHours();
    const dayOfWeek = nowIST.getDay();

    logger.info(`🔍 [LinkedIn] Auto-post check at ${currentHourIST}:00 IST${debugMode ? ' (DEBUG MODE)' : ''}`, 'auto-post-linkedin');

    // Get all active accounts with LinkedIn enabled
    const allAccounts = await accountService.getAllAccounts();
    const linkedinAccounts = allAccounts.filter(
      account => account.linkedin_enabled && account.linkedin_access_token
    );

    if (linkedinAccounts.length === 0) {
      logger.info('⏳ No LinkedIn-enabled accounts found', 'auto-post-linkedin');
      return NextResponse.json({
        success: true,
        message: 'No LinkedIn-enabled accounts found'
      });
    }

    let totalPosted = 0;
    let totalErrors = 0;

    for (const account of linkedinAccounts) {
      try {
        // Check if this account is scheduled for LinkedIn posting now (skip in debug mode)
        if (!debugMode && !isLinkedInPostingScheduled(account.twitter_handle, nowIST)) {
          logger.info(`⏳ ${account.name}: Not scheduled for LinkedIn posting at this hour`, 'auto-post-linkedin');
          continue;
        }

        logger.info(`🏢 Processing LinkedIn posting for: ${account.name}`, 'auto-post-linkedin');

        // Get scheduled personas for LinkedIn posting
        let scheduledPersonas = getScheduledPersonasForLinkedInPosting(
          account.twitter_handle,
          dayOfWeek,
          currentHourIST
        );

        // In debug mode, provide default persona if none scheduled
        if (debugMode && scheduledPersonas.length === 0) {
          scheduledPersonas = ['satirist', 'pattern_spotter'];
          logger.info(`🔍 [LinkedIn] Debug mode: Using default persona 'satirist' or 'pattern_spotter' for ${account.name}`, 'auto-post-linkedin');
        }

        if (scheduledPersonas.length === 0) {
          logger.info(`⏳ ${account.name}: No personas scheduled for LinkedIn posting`, 'auto-post-linkedin');
          continue;
        }

        // Check if token needs refresh
        if (account.linkedin_refresh_token && shouldRefreshToken(account.linkedin_token_expires_at)) {
          logger.info(`🔄 ${account.name}: Refreshing LinkedIn token`, 'auto-post-linkedin');
          try {
            const { accessToken, refreshToken, expiresAt } = await refreshAccessToken(
              account.linkedin_refresh_token
            );

            await accountService.updateAccount(account.id, {
              linkedin_access_token: accessToken,
              linkedin_refresh_token: refreshToken,
              linkedin_token_expires_at: expiresAt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            // Update account object for current use
            account.linkedin_access_token = accessToken;
            account.linkedin_refresh_token = refreshToken;
            account.linkedin_token_expires_at = expiresAt;

            logger.info(`✅ ${account.name}: LinkedIn token refreshed`, 'auto-post-linkedin');
          } catch (error) {
            logger.error(`❌ ${account.name}: Failed to refresh LinkedIn token`, 'auto-post-linkedin', error as Error);
            totalErrors++;
            continue;
          }
        }

        // Query tweets ready for LinkedIn posting
        // Status can be 'ready' (not posted anywhere) or 'posted' (posted to Twitter but not LinkedIn)
        // Must be single tweets only (no threads for now)
        const result = await sql<Tweet>`
          SELECT * FROM tweets
          WHERE account_id = ${account.id}
          AND status IN ('ready', 'posted')
          AND linkedin_id IS NULL
          AND content_type = 'single_tweet'
          ORDER BY created_at ASC
        `;

        // Filter by scheduled personas (satirist, pattern_spotter)
        const eligibleTweets = result.rows.filter(tweet =>
          scheduledPersonas.includes(tweet.persona)
        );

        if (eligibleTweets.length === 0) {
          logger.info(`📋 ${account.name}: No tweets ready for LinkedIn posting`, 'auto-post-linkedin');
          continue;
        }

        const tweet = eligibleTweets[0];
        logger.info(`📤 ${account.name}: Posting to LinkedIn: ${tweet.content.substring(0, 50)}...`, 'auto-post-linkedin');

        // Prepare LinkedIn credentials
        const linkedinCredentials: LinkedInCredentials = {
          accessToken: account.linkedin_access_token!,
          refreshToken: account.linkedin_refresh_token,
          expiresAt: account.linkedin_token_expires_at,
          userId: account.linkedin_user_id,
          orgId: account.linkedin_org_id,
        };

        // Post to LinkedIn
        try {
          // Remove @ symbol from Twitter handles for LinkedIn
          // @AshwiniVaishnaw → AshwiniVaishnaw
          // @princediwakar25 → princediwakar25
          const contentForLinkedIn = tweet.content.replace(/@/g, '');

          // Combine content and hashtags
          const fullContent = tweet.hashtags?.length > 0
            ? `${contentForLinkedIn}\n\n${tweet.hashtags.map(tag => `${tag}`).join(' ')}`
            : contentForLinkedIn;

          logger.info(`📝 ${account.name}: Removed @ symbols from Twitter handles for LinkedIn`, 'auto-post-linkedin');

          const linkedinResult = await postToLinkedIn(
            fullContent,
            linkedinCredentials,
            tweet.image_url // Pass image URL if available
          );

          // Update tweet with LinkedIn ID
          await sql`
            UPDATE tweets
            SET
              linkedin_id = ${linkedinResult.id},
              status = CASE
                WHEN twitter_id IS NOT NULL THEN 'posted'
                ELSE status
              END
            WHERE id = ${tweet.id}
          `;

          totalPosted++;
          logger.info(`✅ ${account.name}: Posted to LinkedIn successfully`, 'auto-post-linkedin');
          logger.info(`🔗 LinkedIn Post ID: ${linkedinResult.id}`, 'auto-post-linkedin');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(`❌ ${account.name}: Failed to post to LinkedIn: ${errorMsg}`, 'auto-post-linkedin', error as Error);

          // Update tweet with error (but don't mark as failed - it might still post to Twitter)
          await sql`
            UPDATE tweets
            SET
              error_message = ${`LinkedIn: ${errorMsg}`}
            WHERE id = ${tweet.id}
          `;

          totalErrors++;
        }
      } catch (error) {
        logger.error(`❌ Failed to process LinkedIn account ${account.name}`, 'auto-post-linkedin', error as Error);
        totalErrors++;
      }
    }

    logger.info(`📊 [LinkedIn] Summary: ${totalPosted} posted, ${totalErrors} errors`, 'auto-post-linkedin');
    return NextResponse.json({
      success: true,
      totalPosted,
      totalErrors,
      timestamp: nowIST.toISOString()
    });

  } catch (error) {
    logger.error('[LinkedIn] Auto-post failed', 'auto-post-linkedin', error as Error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
