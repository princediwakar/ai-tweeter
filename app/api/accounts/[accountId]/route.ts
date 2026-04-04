// app/api/accounts/[accountId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/accountService';
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
    const account = await accountService.getAccountForUser(userId, accountId);

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
      twitter_handle: account.twitter_handle,
      status: account.status,
      created_at: account.created_at,
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
      twitter_handle,
      twitter_api_key,
      twitter_api_secret,
      twitter_access_token,
      twitter_access_token_secret,
      cloudinary_cloud_name,
      cloudinary_api_key,
      cloudinary_api_secret,
      status
    } = body;

    // Check if account exists and user has access
    const existingAccount = await accountService.getAccountForUser(userId, accountId);
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare updates object with decrypted credentials (AccountService expects decrypted values)
    const updates: Record<string, string | string[] | object> = {};
    if (name !== undefined) updates.name = name;
    if (twitter_handle !== undefined) updates.twitter_handle = twitter_handle;
    if (twitter_api_key !== undefined) updates.twitter_api_key = twitter_api_key;
    if (twitter_api_secret !== undefined) updates.twitter_api_secret = twitter_api_secret;
    if (twitter_access_token !== undefined) updates.twitter_access_token = twitter_access_token;
    if (twitter_access_token_secret !== undefined) updates.twitter_access_token_secret = twitter_access_token_secret;
    if (cloudinary_cloud_name !== undefined) updates.cloudinary_cloud_name = cloudinary_cloud_name;
    if (cloudinary_api_key !== undefined) updates.cloudinary_api_key = cloudinary_api_key;
    if (cloudinary_api_secret !== undefined) updates.cloudinary_api_secret = cloudinary_api_secret;
    if (status !== undefined) updates.status = status;

    // Update account with optional credential validation
    await accountService.updateAccount(accountId, updates);

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
    const existingAccount = await accountService.getAccountForUser(userId, accountId);
    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 404 }
      );
    }

    await accountService.deleteAccount(accountId);

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