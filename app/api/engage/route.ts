// app/api/engage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getEngagementConfigForAccount, getDefaultEngagementConfig } from '@/lib/engagement/targets';
import { getDailyEngagementCount, getLastEngagementForTarget, logEngagement, hasEngagedWithPost } from '@/lib/db';
import { postReplyTweet } from '@/lib/twitter';
import { scoutAndFetch } from '@/lib/engagement/activityScout';
import { selectBestTweet } from '@/lib/engagement/selector';
import { generateEngagementReply } from '@/lib/generationService';

export async function GET(request: NextRequest) {
  // 1. Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[Engage API] Unauthorized access attempt.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const twitterHandle = searchParams.get('twitter_handle');
  const debugMode = process.env.DEBUG_MODE === 'true' || searchParams.get('debug') === 'true';

  if (!twitterHandle) {
    console.error('[Engage API] Failed: Missing twitter_handle parameter.');
    return NextResponse.json({ error: 'Missing twitter_handle parameter' }, { status: 400 });
  }
  
  console.log(`[Engage API] Received request for ${twitterHandle}.${debugMode ? ' (DEBUG MODE)' : ''}`);

  // 2. Check if in active window using Native Postgres Timezone Math
  if (!debugMode) {
    const scheduleCheck = await sql`
      WITH current_local AS (
        SELECT 
          s.start_time, s.end_time, s.days_of_week, s.timezone,
          (EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC')))) as local_minutes,
          EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(s.timezone, 'UTC'))) as local_dow
        FROM account_schedules s
        JOIN connected_accounts a ON s.connected_account_id = a.id
        WHERE a.account_username = ${twitterHandle} 
          AND a.is_active = true 
          AND s.is_active = true
      )
      SELECT 1
      FROM current_local
      WHERE local_dow = ANY(current_local.days_of_week)
        AND local_minutes >= current_local.start_time 
        AND local_minutes <= current_local.end_time
      LIMIT 1
    `;

    const isScheduled = scheduleCheck.rows.length > 0;

    if (!isScheduled) {
      console.log(`[Engage API] Skipping: ${twitterHandle} is not within a scheduled engagement window in their local timezone.`);
      return NextResponse.json({ success: false, message: 'Engagement is not scheduled for this time.' });
    }
  } else {
    console.log('[Engage API] Bypassing schedule check due to debug mode.');
  }

  // 3. Get Account (with decrypted credentials) and Engagement Config
  const account = await connectedAccountsService.getByTwitterHandle(twitterHandle);
  if (!account) {
    console.error(`[Engage API] Failed: Account not found for handle: ${twitterHandle}`);
    return NextResponse.json({ error: `Account not found for handle: ${twitterHandle}` }, { status: 404 });
  }
  
  const accountWithCreds = await connectedAccountsService.getWithCredentials(account.id);
  if (!accountWithCreds) {
    console.error(`[Engage API] Failed: Account credentials not found for handle: ${twitterHandle}`);
    return NextResponse.json({ error: `Account credentials not found for handle: ${twitterHandle}` }, { status: 404 });
  }
  
  const engagementConfig = await getEngagementConfigForAccount(twitterHandle) || getDefaultEngagementConfig();

  // 4. Check Daily Engagement Limit
  const dailyCount = await getDailyEngagementCount(account.id);
  if (dailyCount >= engagementConfig.rules.max_engagements_per_day) {
    console.log(`[Engage API] Skipping: Daily engagement limit of ${dailyCount}/${engagementConfig.rules.max_engagements_per_day} reached.`);
    return NextResponse.json({ success: false, message: `Daily engagement limit of ${engagementConfig.rules.max_engagements_per_day} reached.` });
  }
  
  // 5. Scout for Activity (all targets, no rotation needed)
  const targets = engagementConfig.priority_targets;
  console.log(`[Engage API] Checking ${targets.length} target(s): ${targets.map(t => t.username).join(', ')}`);

  const candidateTweets = await scoutAndFetch(accountWithCreds, targets);

  if (candidateTweets.length === 0) {
    console.log(`[Engage API] Result: No recent activity found from any targets.`);
    return NextResponse.json({
      success: false,
      message: 'No recent activity from targets.',
      checked_accounts: targets.map(t => t.username)
    });
  }

  // 6. Filter out already-engaged tweets and check cooldowns
  const validTweets = [];
  for (const tweet of candidateTweets) {
    // Check if already engaged with this specific tweet
    const alreadyEngaged = await hasEngagedWithPost(account.id, tweet.id);
    if (alreadyEngaged) {
      console.log(`[Engage API] Skipping tweet ${tweet.id} from ${tweet.targetUsername} - already engaged`);
      continue;
    }

    // Check target cooldown
    const lastEngagementTime = await getLastEngagementForTarget(account.id, tweet.targetUsername);
    if (lastEngagementTime) {
      const hoursSinceLast = (new Date().getTime() - lastEngagementTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < engagementConfig.rules.min_hours_between_same_target) {
        console.log(`[Engage API] Skipping tweet from ${tweet.targetUsername} - on cooldown (${hoursSinceLast.toFixed(1)}h ago, need ${engagementConfig.rules.min_hours_between_same_target}h)`);
        continue;
      }
    }

    validTweets.push(tweet);
  }

  if (validTweets.length === 0) {
    console.log('[Engage API] Result: All fetched tweets are either already engaged or on cooldown.');
    return NextResponse.json({ success: false, message: 'All tweets are already engaged or on cooldown.' });
  }

  // 7. Select Best Tweet
  const tweetToEngage = selectBestTweet(validTweets);
  if (!tweetToEngage) {
    console.log('[Engage API] Result: Found tweets, but none passed the quality filters.');
    return NextResponse.json({ success: false, message: 'No tweets passed quality filters.' });
  }

  // 8. Get target info (now embedded in tweet from activityScout)
  const targetUsername = (tweetToEngage as typeof tweetToEngage & { targetUsername: string }).targetUsername;
  const targetTier = (tweetToEngage as typeof tweetToEngage & { targetTier: number }).targetTier;

  // Find the full target object for persona info
  const targetInfo = targets.find(t => t.username === targetUsername);
  if (!targetInfo) {
    console.error(`[Engage API] Failed: Could not find target info for ${targetUsername}`);
    return NextResponse.json({ error: 'Internal error: target info not found' }, { status: 500 });
  }

  console.log(`[Engage API] Selected tweet ${tweetToEngage.id} from ${targetUsername} (tier: ${targetTier})`);

  // 9. Generate Reply
  const replyText = await generateEngagementReply(tweetToEngage, targetInfo, engagementConfig.engagement_persona);
  if (!replyText) {
    console.error(`[Engage API] Failed: AI failed to generate a high-quality reply for tweet ${tweetToEngage.id}.`);
    return NextResponse.json({ error: 'Failed to generate a high-quality reply.' }, { status: 500 });
  }

  // 10. Post Reply
  const apiKeyCred = accountWithCreds.credentials.find(c => c.auth_type === 'api_key' && c.is_active);
  const oauth1Cred = accountWithCreds.credentials.find(c => c.auth_type === 'oauth1' && c.is_active);
  const credentials = {
    apiKey: apiKeyCred?.api_key || '',
    apiSecret: apiKeyCred?.api_secret || '',
    accessToken: oauth1Cred?.access_token || '',
    accessSecret: oauth1Cred?.refresh_token || '',
  };
  const replyResult = await postReplyTweet(replyText, tweetToEngage.id, credentials);
  const replyTweetId = replyResult.data.id;
  console.log(`[Engage API] ✅ Successfully posted reply: ${replyTweetId}`);

  // 11. Log to Database
  await logEngagement({
    connected_account_id: account.id,
    target_username: targetUsername,
    target_tweet_id: tweetToEngage.id,
    target_tweet_text: tweetToEngage.text,
    reply_tweet_id: replyTweetId,
    reply_text: replyText,
    discovery_method: 'user_timeline',
    target_tweet_likes: tweetToEngage.public_metrics?.like_count,
    target_tweet_retweets: tweetToEngage.public_metrics?.retweet_count,
    tier: targetTier
  });

  return NextResponse.json({
    success: true,
    message: `Successfully engaged with ${targetUsername}`,
    engagement: {
      target: targetUsername,
      originalTweetUrl: `https://twitter.com/${targetUsername.replace('@', '')}/status/${tweetToEngage.id}`,
      replyUrl: `https://twitter.com/${twitterHandle.replace('@', '')}/status/${replyTweetId}`,
    }
  });
}