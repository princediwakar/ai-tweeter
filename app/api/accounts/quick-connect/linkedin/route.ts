import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initiateLinkedInOAuth } from '@/lib/linkedin';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId = 'pending' } = (await request.json().catch(() => ({}))) || {};

    // 1. Generate LinkedIn Auth URL with secure state
    const { authUrl, state } = await initiateLinkedInOAuth(accountId);

    // 2. Store state in oauth_states table for callback to find
    await sql`
      INSERT INTO oauth_states (state, user_email, platform, created_at)
      VALUES (${state}, ${session.user.email}, 'linkedin', NOW())
      ON CONFLICT (state) DO UPDATE SET user_email = EXCLUDED.user_email
    `;

    // 3. Also store in cookie as backup
    const cookieStore = await cookies();
    cookieStore.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    console.log(`🚀 Automated LinkedIn Connect initiated for user ${session.user.email}`);
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('LinkedIn Quick Connect Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
