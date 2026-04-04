import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import { platformSettings } from '@/lib/platformSettings';
import crypto from 'crypto';

function encryptToken(text: string): string {
  const key = crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'default', 'salt', 32);
  return Buffer.from(key).toString('base64').slice(0, 32);
}

/**
 * POST /api/connected-accounts/oauth
 * Start OAuth flow for Twitter or LinkedIn
 * Credentials are fetched from platform_settings table
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    
    if (action === 'initiate_twitter') {
      const creds = await platformSettings.getTwitterCredentials();
      
      if (!creds.client_id || !creds.client_secret) {
        return NextResponse.json({ 
          error: 'Twitter app not configured. Please configure in platform settings.' 
        }, { status: 400 });
      }

      const state = randomBytes(32).toString('hex');
      const codeVerifier = randomBytes(32).toString('base64url');
      const redirectUri = platformSettings.getRedirectUri('twitter');
      
      const authUrl = `https://twitter.com/i/oauth2/authorize?` + new URLSearchParams({
        response_type: 'code',
        client_id: creds.client_id,
        redirect_uri: redirectUri,
        scope: 'tweet.read tweet.write users.read offline.access',
        state: state,
        code_challenge: codeVerifier,
        code_challenge_method: 'S256',
      });

      await sql`
        INSERT INTO oauth_states (state, code_verifier, user_email, platform, created_at)
        VALUES (${state}, ${codeVerifier}, ${session.user.email}, 'twitter', NOW())
        ON CONFLICT (state) DO UPDATE SET code_verifier = EXCLUDED.code_verifier
      `;

      return NextResponse.json({ authUrl, state });
    }

    if (action === 'initiate_linkedin') {
      const creds = await platformSettings.getLinkedInCredentials();
      
      if (!creds.client_id || !creds.client_secret) {
        return NextResponse.json({ 
          error: 'LinkedIn app not configured. Please configure in platform settings.' 
        }, { status: 400 });
      }

      const state = randomBytes(32).toString('hex');
      const redirectUri = platformSettings.getRedirectUri('linkedin');
      
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
        response_type: 'code',
        client_id: creds.client_id,
        redirect_uri: redirectUri,
        scope: 'r_liteprofile w_member_social',
        state: state,
      });

      await sql`
        INSERT INTO oauth_states (state, user_email, platform, created_at)
        VALUES (${state}, ${session.user.email}, 'linkedin', NOW())
        ON CONFLICT (state) DO UPDATE SET user_email = EXCLUDED.user_email
      `;

      return NextResponse.json({ authUrl, state });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('OAuth initiate error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}