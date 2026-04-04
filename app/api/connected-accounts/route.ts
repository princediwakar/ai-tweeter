import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    // Get connected accounts
    const accounts = await sql`
      SELECT id, platform, account_username, account_name, is_active, connected_at, last_used_at
      FROM connected_accounts
      WHERE user_id = ${userId}
      ORDER BY connected_at DESC
    `;

    return NextResponse.json({ accounts: accounts.rows });
  } catch (error) {
    console.error('Error fetching connected accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, account_username, account_name, platform_user_id, access_token, refresh_token, token_expires_at } = body;

    if (!platform || !account_username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    // Simple encryption (in production, use proper encryption)
    const encrypt = (text: string) => Buffer.from(text).toString('base64');
    const decrypt = (text: string) => Buffer.from(text, 'base64').toString('utf8');

    // Upsert connected account
    const result = await sql`
      INSERT INTO connected_accounts (user_id, platform, account_username, account_name, platform_user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at)
      VALUES (${userId}, ${platform}, ${account_username}, ${account_name}, ${platform_user_id}, ${encrypt(access_token)}, ${encrypt(refresh_token)}, ${token_expires_at})
      ON CONFLICT (user_id, platform, account_username) 
      DO UPDATE SET 
        account_name = EXCLUDED.account_name,
        platform_user_id = EXCLUDED.platform_user_id,
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        is_active = true,
        last_used_at = NOW()
      RETURNING id, platform, account_username, account_name, is_active, connected_at
    `;

    return NextResponse.json({ 
      success: true, 
      account: result.rows[0] 
    });
  } catch (error) {
    console.error('Error connecting account:', error);
    return NextResponse.json({ error: 'Failed to connect account' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Get user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    // Soft delete - just set inactive
    await sql`
      UPDATE connected_accounts 
      SET is_active = false 
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
