import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * UNIFIED CONNECTED ACCOUNTS API
 * Handles Twitter/LinkedIn integrations for the current user.
 * Ensure this file is located at: ./app/api/connected-accounts/route.ts
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Internal User ID
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    // 2. Fetch all accounts via Service
    const accounts = await connectedAccountsService.getByUserId(userId);
    
    // 3. Return sanitized data (Strip sensitive tokens for the frontend)
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      platform: account.platform,
      account_username: account.account_username,
      status: account.status,
      is_active: account.is_active,
      profile_image_url: account.profile_image_url,
      persona_count: account.personas?.length || 0,
      created_at: account.created_at,
      is_configured: !!(account.access_token || account.twitter_access_token)
    }));

    return NextResponse.json({
      success: true,
      accounts: safeAccounts,
      count: safeAccounts.length
    });
  } catch (error) {
    logger.error('Failed to fetch connected accounts', 'api-accounts-get', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    const body = await request.json();
    
    // Strict Validation
    if (!body.platform || !body.account_username) {
      return NextResponse.json({ error: 'Missing required fields: platform, account_username' }, { status: 400 });
    }

    // Normalize handle (remove @ if present)
    const cleanUsername = body.account_username.replace(/^@/, '');

    // Create via Service (handles encryption and DB insertion)
    const account = await connectedAccountsService.create({
      id: body.id || crypto.randomUUID(),
      user_id: userId,
      platform: body.platform,
      account_username: cleanUsername,
      name: body.name || cleanUsername,
      access_token: body.access_token || null, // Service will encrypt this
      status: 'active'
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        platform: account.platform,
        username: account.account_username
      }
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create account', 'api-accounts-post', error as Error);
    return NextResponse.json({ error: 'Failed to connect account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Security Check: Verify ownership before deletion
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;
    const existing = await connectedAccountsService.getAccount(id);

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 403 });
    }

    await connectedAccountsService.delete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'Account disconnected successfully' 
    });
  } catch (error) {
    logger.error('Failed to delete account', 'api-accounts-delete', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}