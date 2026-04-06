// app/api/accounts/[accountId]/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { buildTwitterCredentialsFromAccount, validateTwitterCredentials, refreshTwitterCredentialsIfNeeded } from '@/lib/twitter';
import { validateLinkedInCredentials, refreshAccessToken as refreshLinkedInToken, shouldRefreshToken as shouldRefreshLinkedIn } from '@/lib/linkedin';
import { logger } from '@/lib/logger';

/**
 * GET /api/connected-accounts/[accountId]/health
 * Verifies if the integration tokens are still active.
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
    
    // FIXED: Using unified getAccount method from our restored service
    const account = await connectedAccountsService.getAccount(accountId);

    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 });
    }

    // --- PLATFORM: LINKEDIN ---
    if (account.platform === 'linkedin') {
      const credentials = {
        accessToken: account.access_token!,
        refreshToken: account.refresh_token || undefined,
        expiresAt: account.token_expires_at ? new Date(account.token_expires_at) : undefined
      };

      // Proactive Refresh
      if (credentials.refreshToken && credentials.expiresAt && shouldRefreshLinkedIn(credentials.expiresAt)) {
        try {
          const refreshed = await refreshLinkedInToken(credentials.refreshToken);
          // FIXED: Using unified updateToken method
          await connectedAccountsService.updateToken(
            accountId,
            refreshed.accessToken,
            refreshed.refreshToken,
            refreshed.expiresAt
          );
          credentials.accessToken = refreshed.accessToken;
        } catch (e) {
          logger.error('LinkedIn refresh failed during health check', 'health-check', e as Error);
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
        error: validation.valid ? null : (validation.error || 'LinkedIn session expired')
      });
    }

    // --- PLATFORM: TWITTER ---
    // FIXED: Use explicit casting to 'any' only where the helper expects the legacy object shape
    let twitterCreds = buildTwitterCredentialsFromAccount(account as any);
    const originalToken = twitterCreds.oauth2AccessToken;

    twitterCreds = await refreshTwitterCredentialsIfNeeded(account as any, twitterCreds);

    // Sync token back to DB if refreshed
    if (
      twitterCreds.oauth2AccessToken && 
      twitterCreds.oauth2AccessToken !== originalToken && 
      twitterCreds.oauth2RefreshToken && 
      twitterCreds.oauth2ExpiresAt
    ) {
      logger.info(`♻️ Auto-refreshed Twitter tokens for ${accountId}`, 'health-check');
      await connectedAccountsService.updateToken(
        accountId,
        twitterCreds.oauth2AccessToken,
        twitterCreds.oauth2RefreshToken,
        twitterCreds.oauth2ExpiresAt
      );
    }

    const validation = await validateTwitterCredentials(twitterCreds);
    
    return NextResponse.json({
      success: true,
      isHealthy: validation.valid,
      profile: validation.userInfo,
      error: validation.valid ? null : 'Twitter session expired'
    });

  } catch (error) {
    logger.error('Health check fatal error', 'api-health-check', error as Error);
    return NextResponse.json({
      success: false,
      isHealthy: false,
      error: 'Failed to verify account health'
    }, { status: 500 });
  }
}