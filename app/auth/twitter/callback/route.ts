// app/auth/twitter/callback/route.ts
// Twitter OAuth callback handler

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForToken, getTwitterUserProfile } from '@/lib/twitter-oauth';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { platformSettings } from '@/lib/platformSettings';
import { personaService } from '@/lib/personaService';
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
      return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent(errorDescription || error)}`, request.url));
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent('Missing authorization code or state')}`, request.url));
    }

    // Retrieve code verifier from persistent cookie
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('twitter_oauth_code_verifier')?.value;
    
    if (!codeVerifier) {
      console.error('❌ PKCE Verifier not found in cookies for state:', state);
      return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent('Invalid or expired session. Please try again.')}`, request.url));
    }

    // Clean up the verifier cookie
    cookieStore.delete('twitter_oauth_code_verifier');

    console.log('📝 Exchanging Twitter authorization code for tokens...');

    // Get current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user from DB
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    // Get platform credentials for the exchange
    const platformCreds = await platformSettings.getTwitterCredentials();

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(
      code, 
      codeVerifier,
      platformCreds.client_id,
      platformCreds.client_secret
    );

    // Get Twitter profile information
    const profile = await getTwitterUserProfile(accessToken);
    const twitterHandle = `@${profile.username}`;

    // --- Automated Account Provisioning ---
    
    // Parse state parameter: "accountId:${accountId}:${randomNonce}"
    const stateParts = state.split(':');
    let requestedAccountId = stateParts.length >= 2 && stateParts[0] === 'accountId' ? stateParts[1] : null;

    // 1. Check if this Twitter account is already connected for this user
    const existingConnection = await sql`
      SELECT id FROM connected_accounts
      WHERE user_id = ${userId} AND platform = 'twitter' AND account_username = ${profile.username}
      LIMIT 1
    `;

    let finalAccountId: string;

    if (existingConnection.rows.length > 0) {
      // Re-connecting an existing account
      finalAccountId = existingConnection.rows[0].id;
      console.log(`♻️ Found existing connection for @${profile.username}, using id: ${finalAccountId}`);
    } else if (requestedAccountId && requestedAccountId !== 'pending') {
      // Connecting to a specific pre-existing slot
      finalAccountId = requestedAccountId;
      console.log(`🔗 Connecting to specific account slot: ${finalAccountId}`);
    } else {
      // "One-Click" case: Generate a new ID automatically
      finalAccountId = crypto.randomUUID();
      console.log(`✨ Automating account provisioning for @${profile.username}...`);
    }

    // 2. Clear out any other connections for this specific account slot if they conflict
    // (Ensure this account slot only has one Twitter connection)
    if (finalAccountId && finalAccountId !== 'pending') {
      try {
        await sql`DELETE FROM connected_accounts WHERE id = ${finalAccountId} AND platform = 'twitter' AND account_username != ${profile.username}`;
      } catch (e) {
        console.warn('⚠️ Non-critical error clearing old connections:', e);
      }
    }

    // 3. Upsert the connection using the centralized service
    console.log(`💾 Saving automated connection for @${profile.username}...`);

    await connectedAccountsService.upsert({
      user_id: userId,
      platform: 'twitter',
      account_username: profile.username,
      id: finalAccountId,
      account_name: profile.name,
      name: profile.name,
      platform_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt.toISOString(),
      profile_image_url: profile.profile_image_url,
    });

    // Create default persona for Twitter accounts (Pattern Spotter)
    try {
      // Get the connected account ID
      const connectedAccount = await sql`
        SELECT id FROM connected_accounts
        WHERE user_id = ${userId} AND platform = 'twitter' AND account_username = ${profile.username}
        LIMIT 1
      `;
      if (connectedAccount.rows.length > 0) {
        const connectedAccountId = connectedAccount.rows[0].id;
        // Check if default persona already exists
        const existingDefault = await personaService.getDefaultPersonaForAccount(connectedAccountId);
        if (!existingDefault) {
          await personaService.createPersona({
            connected_account_id: connectedAccountId,
            name: 'Pattern Spotter',
            description: 'Finds non-obvious patterns across multiple news stories.',
            config: { key: 'pattern_spotter' },
            rss_sources: [],
            min_length: 200,
            max_length: 280,
            is_active: true,
            is_default: true,
          });
          console.log(`✅ Created default Pattern Spotter persona for Twitter account @${profile.username}`);
        }
      }
    } catch (personaError) {
      console.warn('⚠️ Failed to create default persona:', personaError);
      // Non-critical error - don't break OAuth flow
    }

    console.log(`✅ Success! Automated connection complete for @${profile.username}`);
    
    // Success redirect
    return NextResponse.redirect(new URL(`/accounts?connected=success&handle=${encodeURIComponent(profile.username)}`, request.url));

  } catch (error) {
    console.error('❌ Twitter OAuth Callback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown technical error';
    return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
