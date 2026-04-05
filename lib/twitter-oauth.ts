// lib/twitter-oauth.ts
// Twitter OAuth 2.0 PKCE implementation

import crypto from 'crypto';
import { platformSettings } from './platformSettings';

const verifierStore = new Map<string, string>();

export { verifierStore };

export interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'bearer';
  scope?: string;
}

/**
 * Get redirect URI based on environment
 */
function getRedirectUri(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://aitweeter.vercel.app/auth/twitter/callback';
  }
  return 'http://localhost:3000/auth/twitter/callback';
}

/**
 * Generate PKCE code verifier (random string)
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Generate PKCE code challenge from verifier (SHA256 hash, base64url encoded)
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

/**
 * Get Twitter OAuth authorization URL with PKCE
 * Uses platform_settings for client credentials
 */
export async function getTwitterAuthUrl(
  state: string, 
  codeChallenge: string, 
  clientId?: string,
  clientSecret?: string
): Promise<string> {
  // If not provided, fetch from platform_settings
  let finalClientId = clientId;
  let finalClientSecret = clientSecret;
  
  if (!finalClientId || !finalClientSecret) {
    try {
      const platformCreds = await platformSettings.getTwitterCredentials();
      finalClientId = finalClientId || platformCreds.client_id;
      finalClientSecret = finalClientSecret || platformCreds.client_secret;
    } catch (e) {
      // Fall back to env vars
      finalClientId = finalClientId || process.env.TWITTER_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
      finalClientSecret = finalClientSecret || process.env.TWITTER_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
    }
  }

  if (!finalClientId) {
    throw new Error('Twitter OAuth credentials not configured');
  }

  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: finalClientId,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'tweet.read tweet.write users.read offline.access',
  });

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId?: string,
  clientSecret?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  // If not provided, fetch from platform_settings
  let finalClientId = clientId;
  let finalClientSecret = clientSecret;
  
  if (!finalClientId || !finalClientSecret) {
    try {
      const platformCreds = await platformSettings.getTwitterCredentials();
      finalClientId = finalClientId || platformCreds.client_id;
      finalClientSecret = finalClientSecret || platformCreds.client_secret;
    } catch (e) {
      // Fall back to env vars
      finalClientId = finalClientId || process.env.TWITTER_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
      finalClientSecret = finalClientSecret || process.env.TWITTER_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
    }
  }

  const redirectUri = getRedirectUri();

  if (!finalClientId || !finalClientSecret) {
    throw new Error('Twitter OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: finalClientId,
    code_verifier: codeVerifier,
  });

  // Twitter requires Basic Auth with client ID and secret
  const authString = Buffer.from(`${finalClientId}:${finalClientSecret}`).toString('base64');

  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authString}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter token exchange failed:', errorText);
      throw new Error(`Twitter token exchange failed: ${response.statusText}`);
    }

    const data: TwitterTokenResponse = await response.json();

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    console.log('✅ Twitter token exchange successful');
    console.log(`⏰ Token expires at: ${expiresAt.toISOString()}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresAt,
    };
  } catch (error) {
    console.error('Error exchanging Twitter code for token:', error);
    throw error;
  }
}

/**
 * Refresh Twitter access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  // If not provided, fetch from platform_settings
  let finalClientId = clientId;
  let finalClientSecret = clientSecret;
  
  if (!finalClientId || !finalClientSecret) {
    try {
      const platformCreds = await platformSettings.getTwitterCredentials();
      finalClientId = finalClientId || platformCreds.client_id;
      finalClientSecret = finalClientSecret || platformCreds.client_secret;
    } catch (e) {
      finalClientId = finalClientId || process.env.TWITTER_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
      finalClientSecret = finalClientSecret || process.env.TWITTER_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
    }
  }

  if (!finalClientId || !finalClientSecret) {
    throw new Error('Twitter OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: finalClientId,
  });

  const authString = Buffer.from(`${finalClientId}:${finalClientSecret}`).toString('base64');

  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authString}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter token refresh failed:', errorText);
      throw new Error(`Twitter token refresh failed: ${response.statusText}`);
    }

    const data: TwitterTokenResponse = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    console.log('✅ Twitter token refreshed successfully');
    console.log(`⏰ New token expires at: ${expiresAt.toISOString()}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
      expiresAt,
    };
  } catch (error) {
    console.error('Error refreshing Twitter token:', error);
    throw error;
  }
}

export interface TwitterUserProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

/**
 * Get Twitter user profile
 */
export async function getTwitterUserProfile(
  accessToken: string
): Promise<TwitterUserProfile> {
  try {
    // Fetch profile with image URL
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter profile fetch failed:', errorText);
      throw new Error(`Twitter profile fetch failed: ${response.statusText}`);
    }

    const result = await response.json();
    const profile = result.data;

    console.log(`✅ Twitter profile fetched: @${profile.username} (${profile.name})`);

    return {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      profile_image_url: profile.profile_image_url,
    };
  } catch (error) {
    console.error('Error fetching Twitter profile:', error);
    throw error;
  }
}

/**
 * Validate Twitter credentials (OAuth 2.0)
 */
export async function validateTwitterCredentials(
  accessToken: string
): Promise<{ valid: boolean; profile?: TwitterUserProfile; error?: string }> {
  try {
    const profile = await getTwitterUserProfile(accessToken);

    console.log('✅ Twitter credentials validated');
    console.log(`👤 Connected as: @${profile.username} (${profile.name})`);

    return {
      valid: true,
      profile,
    };
  } catch (error) {
    console.error('❌ Twitter credentials validation failed:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if token needs refresh (within 7 days of expiration)
 */
export function shouldRefreshToken(expiresAt?: Date): boolean {
  if (!expiresAt) return false;

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return expiresAt < sevenDaysFromNow;
}

/**
 * Generate OAuth initiation URL for Twitter OAuth 2.0 PKCE flow
 * Returns the verifier to be stored by the caller (e.g. in a cookie)
 */
export async function initiateTwitterOAuth(
  accountId: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ authUrl: string; state: string; codeVerifier: string }> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Create state parameter: "accountId:${accountId}:${randomNonce}"
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = `accountId:${accountId}:${nonce}`;

  const authUrl = await getTwitterAuthUrl(state, codeChallenge, clientId, clientSecret);
  return { authUrl, state, codeVerifier };
}