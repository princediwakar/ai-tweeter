// app/api/oauth/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initiateTwitterOAuth } from '@/lib/twitter-oauth';
import { initiateLinkedInOAuth } from '@/lib/linkedin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // 1. Verify the user is authenticated via NextAuth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');
  const accountId = searchParams.get('accountId') || 'pending';

  try {
    const cookieStore = await cookies();

    if (platform === 'twitter') {
      const { authUrl, codeVerifier } = await initiateTwitterOAuth(accountId);
      
      // Store the PKCE verifier securely for the callback
      cookieStore.set('twitter_oauth_code_verifier', codeVerifier, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 60 * 10, // 10 minutes
        path: '/'
      });
      
      return NextResponse.redirect(authUrl);
    }

    if (platform === 'linkedin') {
      const { authUrl, state } = await initiateLinkedInOAuth(accountId);
      
      // Store state for CSRF protection
      cookieStore.set('linkedin_oauth_state', state, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 60 * 10,
        path: '/'
      });

      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  } catch (error) {
    console.error(`Failed to initiate ${platform} OAuth:`, error);
    return NextResponse.redirect(new URL('/onboarding?connected=error', request.url));
  }
}