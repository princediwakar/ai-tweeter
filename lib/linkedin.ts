// lib/linkedin.ts
// LinkedIn API implementation using OAuth 2.0
import crypto from 'crypto';
import { platformSettings } from './platformSettings';

export interface LinkedInCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  userId?: string;
  orgId?: string;
}

export interface LinkedInPostResponse {
  id: string;
  url?: string;
}

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

interface LinkedInProfileResponse {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

/**
 * Get redirect URI based on environment
 */
function getRedirectUri(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/connected-accounts/linkedin-callback`;
}

/**
 * Get LinkedIn OAuth authorization URL
 */
export async function getLinkedInAuthUrl(state: string): Promise<string> {
  let clientId = process.env.LINKEDIN_CLIENT_ID;
  
  if (!clientId) {
    try {
      const creds = await platformSettings.getLinkedInCredentials();
      clientId = creds.client_id;
    } catch (e) {
      // Fallback
    }
  }

  const redirectUri = getRedirectUri();

  if (!clientId) {
    throw new Error('LinkedIn OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email w_member_social',
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Generate OAuth initiation URL for LinkedIn OAuth 2.0 flow
 */
export async function initiateLinkedInOAuth(accountId: string): Promise<{ authUrl: string; state: string }> {
  // Create state parameter: "accountId:${accountId}:${randomNonce}"
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = `accountId:${accountId}:${nonce}`;

  const authUrl = await getLinkedInAuthUrl(state);
  return { authUrl, state };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  let clientId = process.env.LINKEDIN_CLIENT_ID;
  let clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    try {
      const creds = await platformSettings.getLinkedInCredentials();
      clientId = creds.client_id;
      clientSecret = creds.client_secret;
    } catch (e) {
      // Fallback
    }
  }

  const redirectUri = getRedirectUri();

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn token exchange failed:', errorText);
      throw new Error(`LinkedIn token exchange failed: ${response.statusText}`);
    }

    const data: LinkedInTokenResponse = await response.json();

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    console.log('✅ LinkedIn token exchange successful');
    console.log(`⏰ Token expires at: ${expiresAt.toISOString()}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresAt,
    };
  } catch (error) {
    console.error('Error exchanging LinkedIn code for token:', error);
    throw error;
  }
}

/**
 * Refresh LinkedIn access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn token refresh failed:', errorText);
      throw new Error(`LinkedIn token refresh failed: ${response.statusText}`);
    }

    const data: LinkedInTokenResponse = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    console.log('✅ LinkedIn token refreshed successfully');
    console.log(`⏰ New token expires at: ${expiresAt.toISOString()}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use old refresh token if not provided
      expiresAt,
    };
  } catch (error) {
    console.error('Error refreshing LinkedIn token:', error);
    throw error;
  }
}

/**
 * Get LinkedIn user profile (OpenID Connect)
 */
export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfileResponse> {
  try {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn profile fetch failed:', errorText);
      throw new Error(`LinkedIn profile fetch failed: ${response.statusText}`);
    }

    const profile: LinkedInProfileResponse = await response.json();
    console.log(`✅ LinkedIn profile fetched: ${profile.name || profile.sub}`);

    return profile;
  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    throw error;
  }
}

/**
 * Post content to LinkedIn
 */
export async function postToLinkedIn(
  content: string,
  credentials: LinkedInCredentials,
  imageUrl?: string
): Promise<LinkedInPostResponse> {
  try {
    // Ensure we have a valid access token
    if (!credentials.accessToken) {
      throw new Error('LinkedIn access token is required');
    }

    // Get user profile to get the author URN
    const profile = await getLinkedInProfile(credentials.accessToken);
    const authorUrn = `urn:li:person:${profile.sub}`;

    // Prepare post payload
    const payload: {
      author: string;
      lifecycleState: string;
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: string };
          shareMediaCategory: string;
          media?: Array<{
            status: string;
            originalUrl: string;
          }>;
        };
      };
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': string;
      };
    } = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    // Add image if provided
    if (imageUrl) {
      payload.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          originalUrl: imageUrl,
        },
      ];
    }

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LinkedIn post failed:', errorText);

      // Handle specific errors
      if (response.status === 401) {
        throw new Error('🔐 UNAUTHORIZED: LinkedIn token expired or invalid. Please re-authenticate.');
      }

      if (response.status === 429) {
        throw new Error('⏰ RATE LIMIT: Too many LinkedIn posts. Please wait before trying again.');
      }

      throw new Error(`LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const postId = result.id;

    console.log('✅ Post published successfully to LinkedIn!');
    console.log(`📝 Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    console.log(`🆔 Post ID: ${postId}`);
    console.log(`📊 Length: ${content.length} characters`);

    return {
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
    };
  } catch (error) {
    console.error('❌ Error posting to LinkedIn:', error);
    throw error;
  }
}

/**
 * Validate LinkedIn credentials
 */
export async function validateLinkedInCredentials(
  credentials: LinkedInCredentials
): Promise<{ valid: boolean; profile?: LinkedInProfileResponse; error?: string }> {
  try {
    if (!credentials.accessToken) {
      return { valid: false, error: 'Access token is missing' };
    }

    const profile = await getLinkedInProfile(credentials.accessToken);

    console.log('✅ LinkedIn credentials validated');
    console.log(`👤 Connected as: ${profile.name || profile.sub}`);

    return {
      valid: true,
      profile,
    };
  } catch (error) {
    console.error('❌ LinkedIn credentials validation failed:', error);
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
