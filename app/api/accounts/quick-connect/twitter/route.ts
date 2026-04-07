import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserIdFromRequest } from '@/lib/auth';
import { initiateTwitterOAuth } from '@/lib/twitter-oauth';
import { sql } from '@vercel/postgres';

/**
 * POST /api/accounts/quick-connect/twitter
 * Initiates the automated Twitter connection flow.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { accountId = 'pending' } = (await request.json().catch(() => ({}))) || {};
    
    // Get user email for oauth_states table
    const userResult = await sql`SELECT email FROM users WHERE id = ${userId}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userEmail = userResult.rows[0].email;
    
    // Generate OAuth URL and PKCE verifier
    const { authUrl, state, codeVerifier } = await initiateTwitterOAuth(accountId);

    // Store state and code_verifier in oauth_states table for callback to find
    await sql`
      INSERT INTO oauth_states (state, code_verifier, user_email, platform, created_at)
      VALUES (${state}, ${codeVerifier}, ${userEmail}, 'twitter', NOW())
      ON CONFLICT (state) DO UPDATE SET code_verifier = EXCLUDED.code_verifier, user_email = EXCLUDED.user_email
    `;

    // Also store in cookies as backup
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600,
      path: '/'
    };

    cookieStore.set('twitter_oauth_state', state, cookieOptions);
    cookieStore.set('twitter_oauth_code_verifier', codeVerifier, cookieOptions);

    console.log(`🚀 Quick Connect (Twitter) initiated for user ${userId}`);
    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error('Twitter Quick Connect Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to initiate Twitter connection' 
    }, { status: 500 });
  }
}
