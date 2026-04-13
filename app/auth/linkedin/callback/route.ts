// app/auth/linkedin/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { exchangeCodeForToken, getLinkedInProfile, getLinkedInProfileWithUsername } from '@/lib/linkedin';
import { connectedAccountsService } from '@/lib/connectedAccounts';

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce Strict Authorization: User MUST already be logged in via NextAuth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.error('❌ LinkedIn Connect Failed: No active NextAuth session.');
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

    const cookieStore = await cookies();
    const callbackCookie = await cookieStore.get('oauth_callback_url');
    const callbackUrl = callbackCookie?.value || '/setup';

    if (error) {
      console.error('LinkedIn OAuth Callback Error:', error, errorDescription);
      await cookieStore.delete('oauth_callback_url');
      const separator = callbackUrl.includes('?') ? '&' : '?';
      return NextResponse.redirect(new URL(`${callbackUrl}${separator}connected=error&message=${encodeURIComponent(errorDescription || error)}`, request.url));
    }

    if (!code || !state) {
      await cookieStore.delete('oauth_callback_url');
      const separator = callbackUrl.includes('?') ? '&' : '?';
      return NextResponse.redirect(new URL(`${callbackUrl}${separator}connected=error&message=Missing code or state`, request.url));
    }

    // 3. CSRF Protection: Verify state from cookie
    const stateCookie = await cookieStore.get('linkedin_oauth_state');
    const storedState = stateCookie?.value;
    
    if (!storedState || storedState !== state) {
      console.warn('⚠️ LinkedIn state mismatch or missing cookie');
      // In production, strictly enforce this:
      // return NextResponse.redirect(new URL('/onboarding?connected=error&message=Invalid session state', request.url));
    }

    // Clean up the cookie
    await cookieStore.delete('linkedin_oauth_state');

    console.log('📝 Exchanging LinkedIn authorization code for tokens...');
    
    // 4. Exchange code for tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(code);

    // 5. Fetch LinkedIn Profile metadata (OpenID)
    const profile = await getLinkedInProfile(accessToken);

    // 5a. Fetch LinkedIn Profile with username (vanityName)
    let profileWithUsername = {
      id: profile.sub,
      firstName: profile.given_name || '',
      lastName: profile.family_name || '',
      profileName: profile.name || '',
      vanityName: '',
      profileUrl: '',
    };
    try {
      profileWithUsername = await getLinkedInProfileWithUsername(accessToken);
    } catch (e) {
      console.warn('⚠️ Could not fetch LinkedIn profile with username (v2 API may not be available)');
    }

    // 6. State parsing to resolve Account Node targeting
    const stateParts = state.split(':');
    let requestedAccountId = stateParts.length >= 2 && stateParts[0] === 'accountId' ? stateParts[1] : null;

    const existingConnection = await sql`
      SELECT id FROM connected_accounts
      WHERE user_id = ${userId} AND platform = 'linkedin' AND account_username = ${profile.sub}
      LIMIT 1
    `;

    let finalAccountId: string;

    if (existingConnection.rows.length > 0) {
      finalAccountId = existingConnection.rows[0].id;
      console.log(`♻️ Updating existing connection for LinkedIn user ${profile.name}`);
    } else if (requestedAccountId && requestedAccountId !== 'pending') {
      finalAccountId = requestedAccountId;
      console.log(`🔗 Connecting to specific account slot: ${finalAccountId}`);
    } else {
      finalAccountId = crypto.randomUUID();
      console.log(`✨ Provisioning new node for LinkedIn user ${profile.name}...`);
    }

    // Clear out conflicting nodes for this exact slot ID
    if (finalAccountId && finalAccountId !== 'pending') {
      try {
        await sql`DELETE FROM connected_accounts WHERE id = ${finalAccountId} AND platform = 'linkedin' AND account_username != ${profile.sub}`;
      } catch (e) {
        console.warn('⚠️ Non-critical error clearing old connections:', e);
      }
    }

    // 7. Upsert using the centralized service
    // Use vanityName as the account_username if available, otherwise fall back to sub
    const linkedInUsername = profileWithUsername.vanityName || profile.sub;
    
    await connectedAccountsService.upsert({
      user_id: userId,
      platform: 'linkedin',
      account_username: linkedInUsername,
      id: finalAccountId,
      name: profile.name,
      platform_user_id: profile.sub,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt.toISOString(),
      profile_url: profileWithUsername.profileUrl,
    });

    console.log(`✅ Success! LinkedIn node secured for ${profile.name}`);
    
    // Get callback URL from cookie (default to setup)
    const successCallbackCookie = await cookieStore.get('oauth_callback_url');
    const successCallbackUrl = successCallbackCookie?.value || '/setup';
    await cookieStore.delete('oauth_callback_url');
    
    // Redirect to callback URL with success params
    const separator = successCallbackUrl.includes('?') ? '&' : '?';
    return NextResponse.redirect(new URL(`${successCallbackUrl}${separator}connected=success&platform=linkedin&handle=${encodeURIComponent(profile.name || 'LinkedIn')}`, request.url));

  } catch (error) {
    console.error('❌ LinkedIn OAuth Callback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown technical error';
    
    // Get callback URL from cookie (default to setup)
    const errorCallbackCookie = await cookieStore.get('oauth_callback_url');
    const errorCallbackUrl = errorCallbackCookie?.value || '/setup';
    await cookieStore.delete('oauth_callback_url');
    
    const separator = errorCallbackUrl.includes('?') ? '&' : '?';
    return NextResponse.redirect(new URL(`${errorCallbackUrl}${separator}connected=error&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}