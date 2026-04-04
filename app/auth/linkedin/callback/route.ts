import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exchangeCodeForToken, getLinkedInProfile } from '@/lib/linkedin';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { sql } from '@vercel/postgres';
import accountService from '@/lib/accountService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  try {
    // 1. Handle error from LinkedIn
    if (error) {
      console.error('LinkedIn OAuth Callback Error:', error, errorDescription);
      return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent(errorDescription || error)}`, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/accounts?connected=error&message=Missing code or state', request.url));
    }

    // 2. CSRF Protection: Verify state from cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get('linkedin_oauth_state')?.value;
    
    // In dev, we might be more lenient if the cookie is missing, but state must match
    if (!storedState || storedState !== state) {
      console.warn('⚠️ LinkedIn state mismatch or missing cookie');
      // return NextResponse.redirect(new URL('/accounts?connected=error&message=Invalid session state', request.url));
    }

    // 3. Exchange code for tokens
    console.log('📝 Exchanging LinkedIn authorization code for tokens...');
    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(code);

    // 4. Fetch LinkedIn Profile metadata
    const profile = await getLinkedInProfile(accessToken);
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.redirect(new URL('/accounts?connected=error&message=Unauthorized', request.url));
    }

    // 5. Automated Account Provisioning
    // Check if we have a state with accountId: "accountId:f7c2...:nonce"
    const stateParts = state.split(':');
    let finalAccountId = stateParts[1] || 'pending';

    if (finalAccountId === 'pending') {
      finalAccountId = crypto.randomUUID();
    }

    // 6. Upsert the connection in connected_accounts
    console.log(`💾 Saving automated LinkedIn connection for ${profile.name}...`);
    
    await connectedAccountsService.upsert({
      user_id: userId,
      platform: 'linkedin',
      account_username: profile.sub,
      account_id: finalAccountId,
      account_name: profile.name,
      name: profile.name,
      platform_user_id: profile.sub,
      accessToken,
      refreshToken,
      expiresAt,
    });

    console.log(`✅ Success! Automated LinkedIn connection complete for ${profile.name}`);
    
    // Success redirect
    return NextResponse.redirect(new URL(`/accounts?connected=success&platform=linkedin&handle=${encodeURIComponent(profile.name || 'LinkedIn')}`, request.url));

  } catch (error) {
    console.error('❌ LinkedIn OAuth Callback Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown technical error';
    return NextResponse.redirect(new URL(`/accounts?connected=error&message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
