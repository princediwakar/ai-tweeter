// app/auth/twitter/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { exchangeCodeForToken, getTwitterUserProfile } from '@/lib/twitter-oauth';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { platformSettings } from '@/lib/platformSettings';

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce Strict Authorization: User MUST already be logged in via NextAuth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error('❌ Twitter Connect Failed: No active NextAuth session.');
      return NextResponse.redirect(new URL('/auth/signin?error=unauthorized_connection', request.url));
    }

    // Resolve the internal Database User ID securely from the session email
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email} LIMIT 1`;
    if (userResult.rows.length === 0) {
      return NextResponse.redirect(new URL('/auth/signin?error=user_not_found', request.url));
    }
    const userId = userResult.rows[0].id;

    // 2. Parse OAuth parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('Twitter OAuth error:', error, errorDescription);
      return NextResponse.redirect(new URL(`/onboarding?connected=error&message=${encodeURIComponent(errorDescription || error)}`, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL(`/onboarding?connected=error&message=${encodeURIComponent('Missing authorization code or state')}`, request.url));
    }

    // 3. Verify PKCE from the Initiation Route
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('twitter_oauth_code_verifier')?.value;
    
    if (!codeVerifier) {
      console.error('❌ PKCE Verifier not found in cookies for state:', state);
      return NextResponse.redirect(new URL(`/onboarding?connected=error&message=${encodeURIComponent('Invalid or expired session. Please try again.')}`, request.url));
    }

    // Clean up the verifier cookie immediately
    cookieStore.delete('twitter_oauth_code_verifier');

    console.log('📝 Exchanging Twitter authorization code for tokens...');

    // 4. Exchange code using Platform Credentials
    const platformCreds = await platformSettings.getTwitterCredentials();
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(
      code, 
      codeVerifier,
      platformCreds.client_id,
      platformCreds.client_secret
    );

    // 5. Fetch the Twitter Profile payload
    const profile = await getTwitterUserProfile(accessToken);

    // 6. State parsing to resolve Account Node targeting
    const stateParts = state.split(':');
    let requestedAccountId = stateParts.length >= 2 && stateParts[0] === 'accountId' ? stateParts[1] : null;

    // Check if this specific Twitter account is already connected for this user
    const existingConnection = await sql`
      SELECT id FROM connected_accounts
      WHERE user_id = ${userId} AND platform = 'twitter' AND account_username = ${profile.username}
      LIMIT 1
    `;

    let finalAccountId: string;

    if (existingConnection.rows.length > 0) {
      finalAccountId = existingConnection.rows[0].id;
      console.log(`♻️ Updating existing connection for @${profile.username}`);
    } else if (requestedAccountId && requestedAccountId !== 'pending') {
      finalAccountId = requestedAccountId;
      console.log(`🔗 Connecting to specific account slot: ${finalAccountId}`);
    } else {
      finalAccountId = crypto.randomUUID();
      console.log(`✨ Provisioning new node for @${profile.username}...`);
    }

    // Clear out conflicting nodes for this exact slot ID to prevent data corruption
    if (finalAccountId && finalAccountId !== 'pending') {
      try {
        await sql`DELETE FROM connected_accounts WHERE id = ${finalAccountId} AND platform = 'twitter' AND account_username != ${profile.username}`;
      } catch (e) {
        console.warn('⚠️ Non-critical error clearing old connections:', e);
      }
    }

    // 7. Upsert using the centralized service
    await connectedAccountsService.upsert({
      user_id: userId,
      platform: 'twitter',
      account_username: profile.username,
      id: finalAccountId,
      name: profile.name,
      platform_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt.toISOString(),
    });

    console.log(`✅ Success! Node secured for @${profile.username}`);
    
    // Redirect back to the onboarding wizard or dashboard
    return NextResponse.redirect(new URL(`/onboarding?connected=success&platform=twitter&handle=${encodeURIComponent(profile.username)}`, request.url));

  } catch (error) {
    console.error('❌ Twitter OAuth Callback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown technical error';
    return NextResponse.redirect(new URL(`/onboarding?connected=error&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}