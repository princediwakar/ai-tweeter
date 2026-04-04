import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { buildTwitterCredentialsFromAccount, validateTwitterCredentials, refreshTwitterCredentialsIfNeeded } from '@/lib/twitter';
import { validateLinkedInCredentials, refreshAccessToken as refreshLinkedInToken, shouldRefreshToken as shouldRefreshLinkedIn } from '@/lib/linkedin';

/**
 * GET /api/accounts/[accountId]/health
 * Checks if the Twitter connection is still valid.
 * Automatically attempts to refresh the token if it's near expiration.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { accountId } = await params;
    const account = await connectedAccountsService.getConnectedAccountByAccountId(accountId);

    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // PLATFORM-SPECIFIC HEALTH CHECK
    if (account.platform === 'linkedin') {
      const credentials = {
        accessToken: account.access_token!,
        refreshToken: account.refresh_token || undefined,
        expiresAt: account.token_expires_at ? new Date(account.token_expires_at) : undefined
      };

      // Refresh LinkedIn if needed
      if (credentials.refreshToken && credentials.expiresAt && shouldRefreshLinkedIn(credentials.expiresAt)) {
        try {
          const refreshed = await refreshLinkedInToken(credentials.refreshToken);
          await connectedAccountsService.updateConnectedAccountToken(
            accountId,
            refreshed.accessToken,
            refreshed.refreshToken,
            refreshed.expiresAt
          );
          credentials.accessToken = refreshed.accessToken;
        } catch (e) {
          console.error('LinkedIn refresh failed in health check:', e);
        }
      }

      const validation = await validateLinkedInCredentials(credentials);
      return NextResponse.json({
        success: true,
        isHealthy: validation.valid,
        profile: validation.profile ? {
          username: validation.profile.name || validation.profile.sub,
          name: validation.profile.name || 'LinkedIn User',
          id: validation.profile.sub
        } : null,
        error: validation.valid ? null : (validation.error || 'Credential validation failed')
      });
    }

    // TWITTER HEALTH CHECK (Default)
    let twitterCreds = buildTwitterCredentialsFromAccount(account as any);
    const originalToken = twitterCreds.oauth2AccessToken;

    // Proactively refresh if needed
    twitterCreds = await refreshTwitterCredentialsIfNeeded(account as any, twitterCreds);

    // If token changed, update it in the database
    if (twitterCreds.oauth2AccessToken && twitterCreds.oauth2AccessToken !== originalToken && twitterCreds.oauth2RefreshToken && twitterCreds.oauth2ExpiresAt) {
      console.log(`♻️ Health check triggered Twitter token refresh for ${accountId}`);
      await connectedAccountsService.updateConnectedAccountToken(
        accountId,
        twitterCreds.oauth2AccessToken,
        twitterCreds.oauth2RefreshToken,
        twitterCreds.oauth2ExpiresAt
      );
    }

    // Validate against Twitter API
    const validation = await validateTwitterCredentials(twitterCreds);
    
    return NextResponse.json({
      success: true,
      isHealthy: validation.valid,
      profile: validation.userInfo,
      error: validation.valid ? null : 'Credential validation failed'
    });

  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({
      success: false,
      isHealthy: false,
      error: 'Internal health check failure'
    }, { status: 500 });
  }
}