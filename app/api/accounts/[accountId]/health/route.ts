// app/api/accounts/[accountId]/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { tokenManager } from '@/lib/services/TokenManager';
import { logger } from '@/lib/logger';

/**
 * GET /api/connected-accounts/[accountId]/health
 * Verifies if the integration tokens are still active.
 * Uses TokenManager for unified token validation and auto-refresh.
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
    
    const account = await connectedAccountsService.getAccount(accountId);

    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 });
    }

    // Use TokenManager to validate (includes auto-refresh if needed)
    const validation = await tokenManager.validateToken(accountId);
    
    return NextResponse.json({
      success: true,
      isHealthy: validation.valid,
      profile: validation.profile ? {
        username: validation.profile.username,
        name: validation.profile.name,
        id: validation.profile.id
      } : null,
      error: validation.valid ? null : (validation.error || 'Session expired')
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