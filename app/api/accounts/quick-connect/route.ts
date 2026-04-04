import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initiateTwitterOAuth } from '@/lib/twitter-oauth';
import { getUserIdFromRequest } from '@/lib/auth';

/**
 * POST /api/accounts/quick-connect
 * One-click Twitter OAuth initiation.
 * No forms, no pre-filled handles. Just pure automation.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate OAuth details. We use "pending" as a placeholder accountId.
    // The callback will recognize this and create a proper account entry.
    const { authUrl, state, codeVerifier } = await initiateTwitterOAuth('pending');

    const cookieStore = await cookies();
    cookieStore.set('twitter_oauth_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30,
    });

    console.log(`🚀 Quick Connect initiated for user ${userId}`);

    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error in Quick Connect initiation:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
