import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initiateLinkedInOAuth } from '@/lib/linkedin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId = 'pending' } = (await request.json().catch(() => ({}))) || {};

    // 1. Generate LinkedIn Auth URL with secure state
    const { authUrl, state } = await initiateLinkedInOAuth(accountId);

    // 2. Store state in a secure, HTTP-only cookie for verification on callback
    // (Ensure SameSite=Lax for OAuth redirects)
    const cookieStore = await cookies();
    cookieStore.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    console.log(`🚀 Automated LinkedIn Connect initiated for user ${session.user.id}`);
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('LinkedIn Quick Connect Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
