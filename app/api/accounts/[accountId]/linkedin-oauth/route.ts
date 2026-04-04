import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/accountService';
import { initiateLinkedInOAuth } from '@/lib/linkedin';
import { getUserIdFromRequest } from '@/lib/auth';

/**
 * GET /api/accounts/[accountId]/linkedin-oauth
 * Get LinkedIn OAuth connection status for an account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    const account = await accountService.getAccountForUser(userId, accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    const linkedinStatus = {
      enabled: account.linkedin_enabled || false,
      userId: account.linkedin_user_id,
      orgId: account.linkedin_org_id,
      tokenExpiresAt: account.linkedin_token_expires_at,
      needsRefresh: account.linkedin_token_expires_at
        ? account.linkedin_token_expires_at < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : false,
    };

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        twitter_handle: account.twitter_handle,
      },
      linkedin: linkedinStatus,
    });
  } catch (error) {
    console.error('Error fetching LinkedIn OAuth status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LinkedIn OAuth status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts/[accountId]/linkedin-oauth
 * Initiate LinkedIn OAuth connection flow
 * Returns the authorization URL to redirect the user to LinkedIn
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    const account = await accountService.getAccountForUser(userId, accountId);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Generate LinkedIn OAuth authorization URL with state parameter
    const { authUrl, state } = initiateLinkedInOAuth(account.id);

    console.log(`🔗 LinkedIn OAuth initiated for account: ${account.name} (@${account.twitter_handle})`);
    console.log(`📋 State parameter: ${state}`);
    console.log(`🔗 Auth URL: ${authUrl}`);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      account: {
        id: account.id,
        name: account.name,
        twitter_handle: account.twitter_handle,
      },
      message: 'LinkedIn OAuth flow initiated. Redirect user to the authUrl.',
    });
  } catch (error) {
    console.error('Error initiating LinkedIn OAuth:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate LinkedIn OAuth flow' },
      { status: 500 }
    );
  }
}