import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2';
import { connectedAccountsService } from './connectedAccounts';
import { postToLinkedIn, refreshAccessToken, shouldRefreshToken, LinkedInCredentials } from './linkedin';
import { claimPostsForPosting, finalizePostPosting, releaseStalePosts } from './db';
import { logger } from './logger';
import type { Post, ConnectedAccountWithCredentials } from './types';

export interface PostingResult {
  success: boolean;
  tweetId?: string;
  twitterId?: string;
  linkedinId?: string;
  error?: string;
}

export async function getCredentialsForAccount(account: ConnectedAccountWithCredentials): Promise<{
  platform: 'twitter' | 'linkedin';
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessSecret?: string;
  linkedinAccessToken?: string;
  linkedinRefreshToken?: string;
  linkedinTokenExpiresAt?: string;
}> {
  const oauth1Cred = account.credentials.find(c => c.auth_type === 'oauth1' && c.is_active);
  const oauth2Cred = account.credentials.find(c => c.auth_type === 'oauth2' && c.is_active);
  const apiKeyCred = account.credentials.find(c => c.auth_type === 'api_key' && c.is_active);

  return {
    platform: account.platform,
    apiKey: apiKeyCred?.api_key,
    apiSecret: apiKeyCred?.api_secret,
    accessToken: oauth1Cred?.access_token,
    accessSecret: oauth1Cred?.refresh_token,
    linkedinAccessToken: oauth2Cred?.access_token,
    linkedinRefreshToken: oauth2Cred?.refresh_token,
    linkedinTokenExpiresAt: oauth2Cred?.token_expires_at?.toISOString(),
  };
}

export async function refreshTokenIfNeeded(account: ConnectedAccountWithCredentials, platform: 'twitter' | 'linkedin'): Promise<boolean> {
  if (platform === 'linkedin') {
    const oauth2Cred = account.credentials.find(c => c.auth_type === 'oauth2' && c.is_active);
    if (oauth2Cred?.refresh_token && oauth2Cred?.token_expires_at) {
      if (shouldRefreshToken(oauth2Cred.token_expires_at)) {
        try {
          logger.info(`🔄 Refreshing LinkedIn token for ${account.name}`, 'posting-service');
          const { accessToken, refreshToken, expiresAt } = await refreshAccessToken(oauth2Cred.refresh_token);
          await connectedAccountsService.updateToken(account.id, accessToken, refreshToken, expiresAt, 'oauth2');
          return true;
        } catch (error) {
          logger.error(`❌ Failed to refresh LinkedIn token: ${error}`, 'posting-service');
          return false;
        }
      }
    }
  }
  return true;
}

export async function postToPlatform(
post: Post,
  account: ConnectedAccountWithCredentials,
  platform: 'twitter' | 'linkedin',
  credentials: ReturnType<typeof getCredentialsForAccount>
): Promise<PostingResult> {
  const content = getFullTweetContent(post, platform);

  if (platform === 'twitter') {
    return await postToTwitter(post, content, credentials);
  } else {
    return await postToLinkedInPost(post, content, account, credentials);
  }
}

function getFullTweetContent(post: Post, platform: 'twitter' | 'linkedin'): string {
  let baseContent = post.content;
  if (platform === 'linkedin') {
    baseContent = baseContent.replace(/@/g, '');
  }
  
  if (post.hashtags && post.hashtags.length > 0) {
    const formattedTags = post.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
    return `${baseContent}\n\n${formattedTags}`;
  }
  return baseContent;
}

async function postToTwitter(post: Post, content: string, credentials: ReturnType<typeof getCredentialsForAccount>): Promise<PostingResult> {
    if (post.image_url && post.image_status === 'completed') {
      const imageBuffer = await fetchImageFromUrl(post.image_url);
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

    const result: TweetV2PostTweetResult = await client.v2.tweet(content);
    const twitterId: string = result.data.id;
    
    if (!twitterId) throw new Error('No ID returned from Twitter');
    
    return { success: true, twitterId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function postToLinkedInPost(post: Post, content: string, account: ConnectedAccountWithCredentials, credentials: ReturnType<typeof getCredentialsForAccount>): Promise<PostingResult> {
  try {
    const linkedinCreds: LinkedInCredentials = {
      accessToken: credentials.linkedinAccessToken!,
      refreshToken: credentials.linkedinRefreshToken,
      expiresAt: credentials.linkedinTokenExpiresAt ? new Date(credentials.linkedinTokenExpiresAt) : undefined,
    };

    const result = await postToLinkedIn(content, linkedinCreds, post.image_url || undefined);
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

export function isPostReadyForPosting(post: Post): boolean {
  if (!post.image_status || post.image_status === 'none') return true;
  return post.image_status === 'completed' || post.image_status === 'failed';
}

export function isPostValidForPosting(post: Post, platform: 'twitter' | 'linkedin'): boolean {
  const ready = isPostReadyForPosting(post);
  if (!ready) return false;
  const content = getFullTweetContent(post, platform);
  const maxLength = platform === 'twitter' ? 280 : 3000;
  if (content.length > maxLength) {
    logger.info(`Skipping post ${post.id}: too long (${content.length} > ${maxLength} chars)`, 'posting-service');
    return false;
  }
  if (!content.trim()) {
    logger.info(`Skipping post ${post.id}: content is empty`, 'posting-service');
    return false;
  }
  return true;
}

export function isTweetValidForPosting(post: Post, platform: 'twitter' | 'linkedin'): boolean {
  const ready = isPostReadyForPosting(post);
  if (!ready) return false;

  const content = getFullTweetContent(post, platform);
  const maxLength = platform === 'twitter' ? 280 : 3000;

  if (content.length > maxLength) {
    logger.info(`Skipping post ${post.id}: too long (${content.length} > ${maxLength} chars)`, 'posting-service');
    return false;
  }
  if (content.trim().length === 0) {
    logger.info(`Skipping post ${post.id}: content is empty`, 'posting-service');
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
  const account = await connectedAccountsService.getByIdWithCredentials(accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);

  if (platform === 'linkedin') {
    const oauth2Cred = account.credentials.find(c => c.auth_type === 'oauth2' && c.is_active);
    if (!oauth2Cred?.access_token) {
      throw new Error(`LinkedIn not enabled for account: ${accountId}`);
    }
  }

  await refreshTokenIfNeeded(account, platform);

  const claimedPosts = await claimPostsForPosting(accountId, personas, maxTweets);
  
  if (claimedPosts.length === 0) {
    logger.info(`No posts available for posting for account ${accountId}`, 'posting-service');
    return { posted: 0, errors: 0 };
  }

  const credentials = await getCredentialsForAccount(account);
  let posted = 0;
  let errors = 0;

  for (const post of claimedPosts) {
    if (!isPostValidForPosting(post, platform)) {
      await finalizePostPosting(post.id, 'failed', 'Invalid for posting');
      errors++;
      continue;
    }

    const result = await postToPlatform(post, account, platform, credentials);

    if (result.success) {
      await finalizePostPosting(post.id, 'posted'); 
      posted++;
      logger.info(`Posted ${platform} post ${post.id}`, 'posting-service');
    } else {
      await finalizePostPosting(post.id, 'failed', result.error);
      errors++;
      logger.error(`Failed to post ${post.id}: ${result.error}`, 'posting-service');
    }
  }

  return { posted, errors };
}

export async function processStalePostings(accountId: string): Promise<number> {
  return await releaseStalePosts(accountId);
}
