import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { platformSettings } from '@/lib/platformSettings';

function encryptToken(text: string): string {
  const key = crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'default', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * GET /api/connected-accounts/twitter-callback
 * Handle Twitter OAuth 2.0 callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/settings?error=twitter_auth_failed', request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_params', request.url));
    }

    // Get stored code verifier
    const stateResult = await sql`
      SELECT code_verifier, user_email FROM oauth_states 
      WHERE state = ${state} AND platform = 'twitter'
    `;

    if (stateResult.rows.length === 0) {
      return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url));
    }

    const { code_verifier, user_email } = stateResult.rows[0];

    // Get credentials from platform settings
    const creds = await platformSettings.getTwitterCredentials();
    
    if (!creds.client_id || !creds.client_secret) {
      return NextResponse.redirect(new URL('/settings?error=platform_not_configured', request.url));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: platformSettings.getRedirectUri('twitter'),
        code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Twitter token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    const twitterUser = userResponse.ok ? await userResponse.json() : { data: { username: 'unknown' } };

    // Save to connected_accounts - use Twitter OAuth 2.0 columns
    const userResult = await sql`SELECT id FROM users WHERE email = ${user_email}`;
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      
      await sql`
        INSERT INTO connected_accounts (user_id, platform, account_username, account_name, platform_user_id, is_active, connected_at, twitter_oauth2_enabled, twitter_oauth2_access_token_encrypted, twitter_oauth2_refresh_token_encrypted, twitter_oauth2_token_expires_at)
        VALUES (${userId}, 'twitter', ${twitterUser.data.username}, ${twitterUser.data.name || twitterUser.data.username}, ${twitterUser.data.id}, true, NOW(), true, ${encryptToken(tokens.access_token)}, ${encryptToken(tokens.refresh_token || '')}, ${tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null})
        ON CONFLICT (user_id, platform, account_username) 
        DO UPDATE SET 
          account_name = EXCLUDED.account_name,
          platform_user_id = EXCLUDED.platform_user_id,
          twitter_oauth2_enabled = true,
          twitter_oauth2_access_token_encrypted = EXCLUDED.twitter_oauth2_access_token_encrypted,
          twitter_oauth2_refresh_token_encrypted = EXCLUDED.twitter_oauth2_refresh_token_encrypted,
          twitter_oauth2_token_expires_at = EXCLUDED.twitter_oauth2_token_expires_at,
          is_active = true,
          last_used_at = NOW()
      `;
    }

    // Clean up state
    await sql`DELETE FROM oauth_states WHERE state = ${state}`;

    return NextResponse.redirect(new URL('/settings?connected=twitter', request.url));

  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(new URL('/settings?error=unknown', request.url));
  }
}