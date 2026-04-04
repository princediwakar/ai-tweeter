import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { accountService } from '@/lib/accountService';
import { initiateTwitterOAuth } from '@/lib/twitter-oauth';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * GET /api/accounts/[accountId]/twitter-oauth
 * Get Twitter OAuth 2.0 connection status for an account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    const account = await accountService.getAccountForUser(userId, accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if this account has connected Twitter tokens in connected_accounts table
    const connectedResult = await sql`
      SELECT platform_user_id, access_token_encrypted, token_expires_at, is_active
      FROM connected_accounts 
      WHERE account_id = ${accountId} AND platform = 'twitter' AND is_active = true
      LIMIT 1
    `;

    const connected = connectedResult.rows[0];
    const oauthStatus = {
      enabled: !!connected,
      userId: connected?.platform_user_id || null,
      tokenExpiresAt: connected?.token_expires_at || null,
      needsRefresh: connected?.token_expires_at 
        ? new Date(connected.token_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : false,
    };

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        twitter_handle: account.twitter_handle,
      },
      oauth: oauthStatus,
    });
  } catch (error) {
    console.error('Error fetching Twitter OAuth status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Twitter OAuth status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/[accountId]/twitter-oauth
 * Initiate Twitter OAuth 2.0 connection flow
 * Returns the authorization URL to redirect the user to Twitter
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    const account = await accountService.getAccountForUser(userId, accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Generate OAuth authorization URL using platform_settings (common credentials)
    // Account's OAuth tokens will be stored in connected_accounts after authorization
    const { authUrl, state, codeVerifier } = await initiateTwitterOAuth(account.id);

    // Store code verifier in a secure, HTTP-only cookie for the callback to retrieve
    // This is essential for serverless environments (Vercel) where memory state is not persistent
    const cookieStore = await cookies();
    cookieStore.set('twitter_oauth_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30, // 30 minutes
    });

    console.log(`🔗 Twitter OAuth initiated for account: ${account.name} (@${account.twitter_handle})`);
    console.log(`📋 State parameter: ${state}`);
    console.log(`🔗 Auth URL: ${authUrl}`);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      account: {
        id: account.id,
        name: account.name,
        twitter_handle: account.twitter_handle,
      },
      message: 'Twitter OAuth flow initiated. Redirect user to the authUrl.',
    });
  } catch (error) {
    console.error('Error initiating Twitter OAuth:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate Twitter OAuth flow' },
      { status: 500 }
    );
  }
}