// app/api/engage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isEngagementScheduled } from '@/lib/schedule';
import { accountService } from '@/lib/accountService';
import { getEngagementConfigForAccount } from '@/lib/engagement/targets';
import { getDailyEngagementCount, getLastEngagementForTarget, logEngagement } from '@/lib/db';
import { postReplyTweet } from '@/lib/twitter';
import { scoutAndFetch } from '@/lib/engagement/activityScout';
import { selectBestTweet } from '@/lib/engagement/selector';
import { generateEngagementReply } from '@/lib/generationService';
import { getPersonaByKey } from '@/lib/personas';

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

  // 2. Check if in active window (Bypassable with debug mode)
  if (!debugMode && !isEngagementScheduled(twitterHandle)) {
    console.log(`[Engage API] Skipping: ${twitterHandle} is not within a scheduled engagement window.`);
    return NextResponse.json({ success: false, message: 'Engagement is not scheduled for this hour.' });
  }
  if (debugMode) {
    console.log('[Engage API] Bypassing schedule check due to debug mode.');
  }

  // 3. Get Account (with decrypted credentials) and Engagement Config
  const account = await accountService.getAccountByTwitterHandle(twitterHandle);
  if (!account) {
    console.error(`[Engage API] Failed: Account not found for handle: ${twitterHandle}`);
    return NextResponse.json({ error: `Account not found for handle: ${twitterHandle}` }, { status: 404 });
  }
  const engagementConfig = await getEngagementConfigForAccount(twitterHandle);
  if (!engagementConfig) {
    console.log(`[Engage API] Skipping: No engagement config found for ${twitterHandle}.`);
    return NextResponse.json({ success: false, message: `No engagement config for ${twitterHandle}.` });
  }

  // 4. Check Daily Engagement Limit
  const dailyCount = await getDailyEngagementCount(account.id);
  if (dailyCount >= engagementConfig.rules.max_engagements_per_day) {
    console.log(`[Engage API] Skipping: Daily engagement limit of ${dailyCount}/${engagementConfig.rules.max_engagements_per_day} reached.`);
    return NextResponse.json({ success: false, message: `Daily engagement limit of ${engagementConfig.rules.max_engagements_per_day} reached.` });
  }
  
  // 5. Rotate and Scout for Activity
  const now = new Date();
  const minute = now.getMinutes();
  const targets = engagementConfig.priority_targets;
  const groupSize = 3; 
  const groupIndex = Math.floor(minute / 15) % Math.ceil(targets.length / groupSize);
  const targetGroup = targets.slice(groupIndex * groupSize, (groupIndex + 1) * groupSize);

  if (targetGroup.length === 0) {
     console.log(`[Engage API] Skipping: No targets scheduled for this check (Group ${groupIndex}).`);
     return NextResponse.json({ success: false, message: `No targets scheduled for this check (Group ${groupIndex}).` });
  }
  
  console.log(`[Engage API] Checking target group ${groupIndex + 1}: ${targetGroup.map(t => t.username).join(', ')}`);
  const candidateTweets = await scoutAndFetch(account, targetGroup);

  if (candidateTweets.length === 0) {
    console.log('[Engage API] Result: No recent activity found from target group.');
    return NextResponse.json({ success: false, message: 'No recent activity from target group.' });
  }
  
  // 6. Select Best Tweet
  const tweetToEngage = selectBestTweet(candidateTweets);
  if (!tweetToEngage) {
    console.log('[Engage API] Result: Found tweets, but none passed the quality filters.');
    return NextResponse.json({ success: false, message: 'No tweets passed quality filters.' });
  }

  // 7. Check Target Rate Limit
  const targetInfo = engagementConfig.priority_targets.find(t => t.username.toLowerCase().includes(tweetToEngage.author_id!));
  if (!targetInfo) {
      console.error(`[Engage API] Failed: Could not map author ID ${tweetToEngage.author_id} to a target. Check config.`);
      return NextResponse.json({ success: false, message: `Could not map author ID ${tweetToEngage.author_id} to a target.` });
  }
  const lastEngagementTime = await getLastEngagementForTarget(account.id, targetInfo.username);
  if (lastEngagementTime) {
    const hoursSinceLast = (new Date().getTime() - lastEngagementTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < engagementConfig.rules.min_hours_between_same_target) {
      console.log(`[Engage API] Skipping: Target ${targetInfo.username} is on cooldown (${hoursSinceLast.toFixed(1)}h ago).`);
      return NextResponse.json({ success: false, message: `Skipping ${targetInfo.username}: Engaged ${hoursSinceLast.toFixed(1)}h ago (cooldown: ${engagementConfig.rules.min_hours_between_same_target}h).` });
    }
  }

  // 8. Generate Reply
  const persona = getPersonaByKey(engagementConfig.engagement_persona);
  if (!persona) {
    console.error(`[Engage API] Failed: Persona '${engagementConfig.engagement_persona}' not found.`);
    return NextResponse.json({ error: `Persona '${engagementConfig.engagement_persona}' not found.` }, { status: 500 });
  }
  const replyText = await generateEngagementReply(tweetToEngage, targetInfo, persona);
  if (!replyText) {
    console.error(`[Engage API] Failed: AI failed to generate a high-quality reply for tweet ${tweetToEngage.id}.`);
    return NextResponse.json({ error: 'Failed to generate a high-quality reply.' }, { status: 500 });
  }

  // 9. Post Reply
  const credentials = {
    apiKey: account.twitter_api_key,
    apiSecret: account.twitter_api_secret,
    accessToken: account.twitter_access_token,
    accessSecret: account.twitter_access_token_secret,
  };
  const replyResult = await postReplyTweet(replyText, tweetToEngage.id, credentials);
  const replyTweetId = replyResult.data.id;
  console.log(`[Engage API] ✅ Successfully posted reply: ${replyTweetId}`);

  // 10. Log to Database
  await logEngagement({
    account_id: account.id,
    target_username: targetInfo.username,
    target_tweet_id: tweetToEngage.id,
    target_tweet_text: tweetToEngage.text,
    reply_tweet_id: replyTweetId,
    reply_text: replyText,
    discovery_method: 'counts_api',
    target_tweet_likes: tweetToEngage.public_metrics?.like_count,
    target_tweet_retweets: tweetToEngage.public_metrics?.retweet_count,
  });

  return NextResponse.json({
    success: true,
    message: `Successfully engaged with ${targetInfo.username}`,
    engagement: {
      target: targetInfo.username,
      originalTweetUrl: `https://twitter.com/${targetInfo.username.replace('@', '')}/status/${tweetToEngage.id}`,
      replyUrl: `https://twitter.com/${twitterHandle.replace('@', '')}/status/${replyTweetId}`,
    }
  });
}