// app/auth/twitter/route.ts
// Twitter OAuth callback handler

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getTwitterUserProfile, verifierStore } from '@/lib/twitter-oauth';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { platformSettings } from '@/lib/platformSettings';
import { sql } from '@vercel/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Twitter OAuth error:', error, errorDescription);
      return NextResponse.json(
        {
          success: false,
          error: `Twitter authentication failed: ${errorDescription || error}`,
        },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is missing' },
        { status: 400 }
      );
    }

    // Validate state parameter and retrieve code verifier
    if (!state) {
      console.warn('Twitter OAuth: state parameter missing (CSRF protection disabled)');
      return NextResponse.json(
        { success: false, error: 'Invalid OAuth state' },
        { status: 400 }
      );
    }

    const codeVerifier = verifierStore.get(state);
    if (!codeVerifier) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OAuth state' },
        { status: 400 }
      );
    }

    // Clean up the verifier
    verifierStore.delete(state);

    console.log('📝 Exchanging Twitter authorization code for tokens...');

    // Parse state parameter to get account ID
    // State format: "accountId:${accountId}:${randomNonce}"
    let accountId: string | null = null;
    try {
      const stateParts = state.split(':');
      if (stateParts.length >= 2 && stateParts[0] === 'accountId') {
        accountId = stateParts[1];
      }
    } catch (err) {
      console.error('Failed to parse state parameter:', err);
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Invalid state parameter: account ID not found' },
        { status: 400 }
      );
    }

    // Get the account
    const account = await connectedAccountsService.getById(accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account not found: ${accountId}` },
        { status: 404 }
      );
    }

    // Get current user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user from DB
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    // Get platform credentials (common for all accounts)
    const platformCreds = await platformSettings.getTwitterCredentials();

    // Exchange code for tokens using platform credentials
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(
      code, 
      codeVerifier,
      platformCreds.client_id,
      platformCreds.client_secret
    );

    // Get Twitter profile information
    const profile = await getTwitterUserProfile(accessToken);

    console.log('✅ Twitter authentication successful');
    console.log(`👤 User: @${profile.username} (${profile.name})`);
    console.log(`🆔 Twitter ID: ${profile.id}`);

    // Verify the Twitter handle matches the account
    const expectedHandle = (account.twitter_handle ?? '').replace('@', '');
    if (profile.username.toLowerCase() !== expectedHandle.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: `Twitter handle mismatch. Account expects @${expectedHandle}, but connected account is @${profile.username}`
        },
        { status: 400 }
      );
    }

    // Store user OAuth tokens in connected_accounts table
    // Use simple encryption for now (same as platformSettings)
    const expiresAtStr = expiresAt.toISOString();
    await sql`
      INSERT INTO connected_accounts (
        user_id, account_id, platform, account_username, account_name, platform_user_id,
        access_token_encrypted, refresh_token_encrypted, token_expires_at, is_active, connected_at
      )
      VALUES (
        ${userId}, ${accountId}, 'twitter', ${profile.username}, ${profile.name}, ${profile.id},
        ${accessToken}, ${refreshToken}, ${expiresAtStr}, true, NOW()
      )
      ON CONFLICT (user_id, platform, account_username) 
      DO UPDATE SET 
        account_id = ${accountId},
        platform_user_id = ${profile.id},
        access_token_encrypted = ${accessToken},
        refresh_token_encrypted = ${refreshToken},
        token_expires_at = ${expiresAtStr},
        is_active = true,
        last_used_at = NOW()
    `;

    // Mark account as having Twitter connected
    await connectedAccountsService.update(account.id, {
      twitter_oauth2_enabled: true,
      twitter_oauth2_user_id: profile.id,
    });

    console.log(`✅ Twitter OAuth tokens saved to connected_accounts for user ${userId}`);

    // Return success response with redirect to frontend
    return NextResponse.redirect(new URL(`/accounts?connected=success&handle=${encodeURIComponent(profile.username)}&message=${encodeURIComponent('Twitter account connected successfully!')}`, request.url));
  } catch (error) {
    console.error('❌ Twitter OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during Twitter authentication';
    return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
