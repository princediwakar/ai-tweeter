// app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { accountService } from '@/lib/accountService';
import { authOptions } from '@/lib/auth';

/**
 * Enhanced Multi-Account Management API
 * Inspired by the YouTube system's clean account management architecture
 * Provides CRUD operations for Twitter accounts with encryption and validation
 */

/**
 * GET /api/accounts
 * Retrieve all active accounts for the current user with enhanced metadata (credentials excluded for security)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const accounts = await accountService.getAccountsByUserId(userId);
    
    // Return enhanced account information without sensitive credentials
    const safeAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      platform: account.platform || 'twitter',
      account_username: account.account_username || (account as any).twitter_handle,
      twitter_handle: account.account_username || (account as any).twitter_handle,
      status: account.status,
      personas: account.personas || [],
      branding: account.branding,
      created_at: account.created_at,
      updated_at: account.updated_at,
      profile_image_url: account.profile_image_url,
      is_active: account.is_active ?? account.status === 'active',
      linkedin_enabled: account.linkedin_enabled,
      // Health indicators without exposing credentials
      credentials_configured: !!(account.access_token || (account as any).twitter_access_token),
      persona_count: account.personas?.length || 0
    }));

    return NextResponse.json({
      success: true,
      accounts: safeAccounts,
      count: safeAccounts.length,
      active_accounts: safeAccounts.filter(acc => acc.status === 'active').length
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch accounts' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounts
 * Create a new Twitter account with enhanced validation and encryption
 * Automatically assigns the account to the current user as owner
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userId = userResult.rows[0].id;

    const body = await request.json();
    
    // Validate required fields
    if (!body.id || !body.name || !body.twitter_handle) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: id, name, twitter_handle'
      }, { status: 400 });
    }
    
    // Credentials are optional - accounts can be created first and connected later via OAuth

    // Normalize Twitter handle format
    let twitterHandle = body.twitter_handle.toString().trim();
    if (!twitterHandle.startsWith('@')) {
      twitterHandle = `@${twitterHandle}`;
    }

    // Set up account data with enhanced branding configuration
    const accountData = {
      id: body.id,
      user_id: userId,
      name: body.name,
      twitter_handle: twitterHandle,
      status: (body.status || 'active') as 'active' | 'inactive' | 'suspended',
      twitter_api_key: body.twitter_api_key,
      twitter_api_secret: body.twitter_api_secret,
      twitter_access_token: body.twitter_access_token,
      twitter_access_token_secret: body.twitter_access_token_secret,
      twitter_oauth2_client_id: body.twitter_oauth2_client_id,
      twitter_oauth2_client_secret: body.twitter_oauth2_client_secret,
      personas: body.personas || [],
      branding: {
        theme: body.branding?.theme || 'professional',
        audience: body.branding?.audience || 'general',
        tone: body.branding?.tone || 'helpful',
        cta_frequency: body.branding?.cta_frequency || 0.1,
        cta_message: body.branding?.cta_message || ''
      }
    };

    // Create account with built-in validation
    const account = await accountService.createAccount(accountData);

    // Set the current user as the owner of this account
    await accountService.setAccountOwner(account.id, userId);

    // Return safe account data (no credentials)
    const safeAccount = {
      id: account.id,
      name: account.name,
      twitter_handle: account.twitter_handle,
      status: account.status,
      personas: account.personas,
      branding: account.branding,
      created_at: account.created_at,
      updated_at: account.updated_at
    };

    return NextResponse.json({
      success: true,
      account: safeAccount,
      message: `Account created successfully: ${account.name}`
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating account:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Account with this ID already exists' 
        }, { status: 409 });
      }
      
      if (error.message.includes('validation failed') || error.message.includes('credential')) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create account' 
    }, { status: 500 });
  }
}