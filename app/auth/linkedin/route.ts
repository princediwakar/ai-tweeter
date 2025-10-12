// app/auth/linkedin/route.ts
// LinkedIn OAuth callback handler

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getLinkedInProfile } from '@/lib/linkedin';
import { accountService } from '@/lib/accountService';

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

    // TODO: Validate state parameter to prevent CSRF attacks
    // You should store the state in a session/cookie when initiating OAuth
    // and verify it matches here
    if (!state) {
      console.warn('LinkedIn OAuth: state parameter missing (CSRF protection disabled)');
    }

    console.log('📝 Exchanging LinkedIn authorization code for tokens...');

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(code);

    // Get LinkedIn profile information
    const profile = await getLinkedInProfile(accessToken);

    console.log('✅ LinkedIn authentication successful');
    console.log(`👤 User: ${profile.name || profile.sub}`);
    console.log(`🆔 LinkedIn ID: ${profile.sub}`);

    // Update the account with LinkedIn credentials
    // Note: LinkedIn profile is 'princediwakar' but we use Twitter handle to find account
    const twitterHandle = '@princediwakar25';

    const account = await accountService.getAccountByTwitterHandle(twitterHandle);
    if (!account) {
      return NextResponse.json(
        { success: false, error: `Account not found for Twitter handle: @${twitterHandle}` },
        { status: 404 }
      );
    }

    // Update account with LinkedIn tokens
    await accountService.updateAccount(account.id, {
      linkedin_access_token: accessToken,
      linkedin_refresh_token: refreshToken,
      linkedin_user_id: profile.sub,
      linkedin_enabled: true,
      linkedin_token_expires_at: expiresAt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

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
