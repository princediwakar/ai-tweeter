// app/auth/linkedin/route.ts
// LinkedIn OAuth callback handler

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getLinkedInProfile } from '@/lib/linkedin';
import { connectedAccountsService } from '@/lib/connectedAccounts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return NextResponse.json(
        {
          success: false,
          error: `LinkedIn authentication failed: ${errorDescription || error}`,
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

    // Validate state parameter and extract account ID
    // State format: "accountId:${accountId}:${randomNonce}"
    let accountId: string | null = null;
    if (state) {
      try {
        const stateParts = state.split(':');
        if (stateParts.length >= 2 && stateParts[0] === 'accountId') {
          accountId = stateParts[1];
        }
      } catch (error) {
        console.error('Failed to parse state parameter:', error);
      }
    } else {
      console.warn('LinkedIn OAuth: state parameter missing (CSRF protection disabled)');
    }

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Invalid state parameter: account ID not found' },
        { status: 400 }
      );
    }

    console.log('📝 Exchanging LinkedIn authorization code for tokens...');

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(code);

    // Get LinkedIn profile information
    const profile = await getLinkedInProfile(accessToken);

    console.log('✅ LinkedIn authentication successful');
    console.log(`👤 User: ${profile.name || profile.sub}`);
    console.log(`🆔 LinkedIn ID: ${profile.sub}`);

    // Get the account by ID
    const account = await connectedAccountsService.getById(accountId);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account not found: ${accountId}` },
        { status: 404 }
      );
    }

    // Update account with LinkedIn tokens
    await connectedAccountsService.update(account.id, {
      linkedin_access_token: accessToken,
      linkedin_refresh_token: refreshToken,
      linkedin_user_id: profile.sub,
      linkedin_enabled: true,
      linkedin_token_expires_at: expiresAt,
    });

    console.log(`✅ LinkedIn credentials saved for account: ${account.twitter_handle} (${account.id})`);

    // Return success response with redirect
    return NextResponse.json({
      success: true,
      message: 'LinkedIn connected successfully!',
      profile: {
        name: profile.name,
        id: profile.sub,
        email: profile.email,
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('❌ LinkedIn OAuth callback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during LinkedIn authentication',
      },
      { status: 500 }
    );
  }
}
