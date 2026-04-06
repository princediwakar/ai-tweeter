import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserIdFromRequest } from '@/lib/auth';
import { initiateTwitterOAuth } from '@/lib/twitter-oauth';

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
    
    // Generate OAuth URL and PKCE verifier
    const { authUrl, state, codeVerifier } = await initiateTwitterOAuth(accountId);

    // Securely store PKCE verifier and state in cookies
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600, // 10 minutes
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
