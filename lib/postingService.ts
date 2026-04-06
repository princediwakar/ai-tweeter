import { sql } from '@vercel/postgres';
import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';
import { connectedAccountsService } from './connectedAccounts';
import { postToLinkedIn, refreshAccessToken, shouldRefreshToken, LinkedInCredentials } from './linkedin';
import { claimTweetsForPosting, finalizeTweetPosting, releaseStaleTweets } from './db';
import { logger } from './logger';
import type { Tweet } from './types';

export interface PostingCredentials {
  platform: 'twitter' | 'linkedin';
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessSecret?: string;
  linkedinAccessToken?: string;
  linkedinRefreshToken?: string;
  linkedinTokenExpiresAt?: string;
  linkedinUserId?: string;
  linkedinOrgId?: string;
}

export interface PostingResult {
  success: boolean;
  tweetId?: string;
  twitterId?: string;
  linkedinId?: string;
  error?: string;
}

export async function getCredentialsForAccount(account: any): Promise<PostingCredentials> {
  return {
    platform: account.platform,
    apiKey: account.twitter_api_key,
    apiSecret: account.twitter_api_secret,
    accessToken: account.twitter_access_token,
    accessSecret: account.twitter_access_token_secret,
    linkedinAccessToken: account.linkedin_access_token,
    linkedinRefreshToken: account.linkedin_refresh_token,
    linkedinTokenExpiresAt: account.linkedin_token_expires_at,
    linkedinUserId: account.linkedin_user_id,
    linkedinOrgId: account.linkedin_org_id,
  };
}

export async function refreshTokenIfNeeded(account: any, platform: 'twitter' | 'linkedin'): Promise<boolean> {
  if (platform === 'linkedin' && account.linkedin_refresh_token && account.linkedin_token_expires_at) {
    if (shouldRefreshToken(new Date(account.linkedin_token_expires_at))) {
      try {
        logger.info(`🔄 Refreshing LinkedIn token for ${account.name}`, 'posting-service');
        const { accessToken, refreshToken, expiresAt } = await refreshAccessToken(account.linkedin_refresh_token);
        await connectedAccountsService.update(account.id, {
          linkedin_access_token: accessToken,
          linkedin_refresh_token: refreshToken,
          linkedin_token_expires_at: expiresAt,
        } as any);
        account.linkedin_access_token = accessToken;
        account.linkedin_refresh_token = refreshToken;
        account.linkedin_token_expires_at = expiresAt.toISOString();
        return true;
      } catch (error) {
        logger.error(`❌ Failed to refresh LinkedIn token: ${error}`, 'posting-service');
        return false;
      }
    }
  }
  return true;
}

export async function postToPlatform(
  tweet: Tweet,
  account: any,
  platform: 'twitter' | 'linkedin',
  credentials: PostingCredentials
): Promise<PostingResult> {
  const content = getFullTweetContent(tweet, platform);

  if (platform === 'twitter') {
    return await postToTwitter(tweet, content, credentials);
  } else {
    return await postToLinkedInPost(tweet, content, account, credentials);
  }
}

function getFullTweetContent(tweet: Tweet, platform: 'twitter' | 'linkedin'): string {
  let baseContent = tweet.content;
  if (platform === 'linkedin') {
    // Strip @ mentions for LinkedIn to prevent broken tags
    baseContent = baseContent.replace(/@/g, '');
  }
  
  if (tweet.hashtags && tweet.hashtags.length > 0) {
    // FIXED: Safely ensure every tag actually starts with a # symbol
    const formattedTags = tweet.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    return `${baseContent}\n\n${formattedTags}`;
  }
  return baseContent;
}

async function postToTwitter(tweet: Tweet, content: string, credentials: PostingCredentials): Promise<PostingResult> {
  try {
    const client = new TwitterApi({
      appKey: credentials.apiKey || '',
      appSecret: credentials.apiSecret || '',
      accessToken: credentials.accessToken || '',
      accessSecret: credentials.accessSecret || '',
    });
    
    if (tweet.image_url && tweet.image_status === 'completed') {
      const imageBuffer = await fetchImageFromUrl(tweet.image_url);
      if (imageBuffer) {
        const { postTweetWithImage } = await import('./twitter');
        const result = await postTweetWithImage(content, imageBuffer, {
          apiKey: credentials.apiKey || '',
          apiSecret: credentials.apiSecret || '',
          accessToken: credentials.accessToken || '',
          accessSecret: credentials.accessSecret || '',
        });
        return { success: true, twitterId: result.data.id };
      }
    }

    // FIXED: Explicit type annotation for 'result' and 'twitterId' to solve TS circular reference
    const result: TweetV2PostTweetResult = await client.v2.tweet(content);
    const twitterId: string = result.data.id;
    
    if (!twitterId) throw new Error('No ID returned from Twitter');
    
    return { success: true, twitterId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function postToLinkedInPost(tweet: Tweet, content: string, account: any, credentials: PostingCredentials): Promise<PostingResult> {
  try {
    const linkedinCreds: LinkedInCredentials = {
      accessToken: credentials.linkedinAccessToken!,
      refreshToken: credentials.linkedinRefreshToken,
      expiresAt: credentials.linkedinTokenExpiresAt ? new Date(credentials.linkedinTokenExpiresAt) : undefined,
      userId: credentials.linkedinUserId,
      orgId: credentials.linkedinOrgId,
    };

    const result = await postToLinkedIn(content, linkedinCreds, tweet.image_url);
    return { success: true, linkedinId: result.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function fetchImageFromUrl(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.error(`Failed to fetch image: ${error}`, 'posting-service');
    return null;
  }
}

export function isTweetReadyForPosting(tweet: Tweet): boolean {
  if (!tweet.image_status || tweet.image_status === 'none') return true;
  return tweet.image_status === 'completed' || tweet.image_status === 'failed';
}

export function isTweetValidForPosting(tweet: Tweet, platform: 'twitter' | 'linkedin'): boolean {
  const ready = isTweetReadyForPosting(tweet);
  if (!ready) return false;

  const content = getFullTweetContent(tweet, platform);
  const maxLength = platform === 'twitter' ? 280 : 3000;

  if (content.length > maxLength) {
    logger.info(`Skipping tweet ${tweet.id}: too long (${content.length} > ${maxLength} chars)`, 'posting-service');
    return false;
  }
  if (content.trim().length === 0) {
    logger.info(`Skipping tweet ${tweet.id}: content is empty`, 'posting-service');
    return false;
  }
  return true;
}

export async function postSingleContent(
  accountId: string,
  personas: string[],
  platform: 'twitter' | 'linkedin',
  maxTweets: number = 5
): Promise<{ posted: number; errors: number }> {
  const account = await connectedAccountsService.getById(accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);

  if (platform === 'linkedin' && (!account.linkedin_enabled || !account.linkedin_access_token)) {
    throw new Error(`LinkedIn not enabled for account: ${accountId}`);
  }

  await refreshTokenIfNeeded(account, platform);

  const claimedTweets = await claimTweetsForPosting(accountId, personas, maxTweets);
  
  if (claimedTweets.length === 0) {
    logger.info(`No tweets available for posting for account ${accountId}`, 'posting-service');
    return { posted: 0, errors: 0 };
  }

  const credentials = await getCredentialsForAccount(account);
  let posted = 0;
  let errors = 0;

  for (const tweet of claimedTweets) {
    if (!isTweetValidForPosting(tweet, platform)) {
      await finalizeTweetPosting(tweet.id, 'failed', undefined, undefined, 'Invalid for posting');
      errors++;
      continue;
    }

    const result = await postToPlatform(tweet, account, platform, credentials);

    if (result.success) {
      if (platform === 'twitter') {
        const twitterUrl = result.twitterId 
          ? `https://x.com/${account.twitter_handle}/status/${result.twitterId}` 
          : undefined;
        await finalizeTweetPosting(tweet.id, 'posted', result.twitterId, twitterUrl);
      } else {
        // LinkedIn finalize logic (Bolt-on workaround)
        await finalizeTweetPosting(tweet.id, 'posted'); 
        await sql`
          UPDATE tweets 
          SET linkedin_id = ${result.linkedinId}, posted_at = COALESCE(posted_at, NOW())
          WHERE id = ${tweet.id}
        `;
      }
      
      posted++;
      logger.info(`Posted ${platform} tweet ${tweet.id}`, 'posting-service');
    } else {
      await finalizeTweetPosting(tweet.id, 'failed', undefined, undefined, result.error);
      errors++;
      logger.error(`Failed to post tweet ${tweet.id}: ${result.error}`, 'posting-service');
    }
  }

  return { posted, errors };
}

export async function processStalePostings(accountId: string): Promise<number> {
  return await releaseStaleTweets(accountId);
}