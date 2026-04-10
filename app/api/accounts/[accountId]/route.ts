// app/api/accounts/[accountId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    const account = await connectedAccountsService.getForUser(userId, accountId);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Don't expose sensitive credentials
    const safeAccount = {
      id: account.id,
      name: account.name,
      account_username: account.account_username,
      platform: account.platform,
      status: account.status,
      connected_at: account.connected_at,
      updated_at: account.updated_at
    };

    return NextResponse.json({ account: safeAccount });
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    const body = await request.json();
    const {
      name,
      status
    } = body;

    // Check if account exists and user has access
    const existingAccount = await connectedAccountsService.getForUser(userId, accountId);
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare updates object
    const updates: Record<string, string | object> = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;

    // Update account with optional credential validation
    await connectedAccountsService.update(accountId, updates);

    return NextResponse.json({
      message: 'Account updated successfully'
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Get current user ID
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { accountId } = await params;
    // Check if account exists and user has access
    const existingAccount = await connectedAccountsService.getForUser(userId, accountId);
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    await connectedAccountsService.delete(accountId);

    return NextResponse.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}