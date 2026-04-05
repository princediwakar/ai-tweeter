import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

interface DashboardData {
  accounts: any[];
  personas: any[];
  tweets: {
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  defaultAccountId: string | null;
  defaultPersonaId: string | null;
}

function getPersonaEmoji(name: string): string {
  if (name.includes('Vocabulary')) return '🏆';
  if (name.includes('Business')) return '📈';
  if (name.includes('Cricket')) return '🏏';
  if (name.includes('Signal')) return '💡';
  if (name.includes('Pattern')) return '🔍';
  if (name.includes('LinkedIn')) return '📊';
  return '🗣️';
}

function formatAccount(account: any): any {
  return {
    id: account.id,
    name: account.name,
    platform: account.platform || 'twitter',
    account_username: account.account_username || account.twitter_handle,
    twitter_handle: account.account_username || account.twitter_handle,
    status: account.status,
    personas: account.personas || [],
    branding: account.branding,
    created_at: account.created_at,
    updated_at: account.updated_at,
    profile_image_url: account.profile_image_url,
    credentials_configured: !!(account.access_token || account.twitter_access_token),
    persona_count: account.personas?.length || 0
  };
}

function formatPersona(persona: any): any {
  return {
    id: persona.id,
    name: persona.name,
    emoji: getPersonaEmoji(persona.name),
    description: persona.description || '',
    connected_account_id: persona.connected_account_id,
    is_active: persona.is_active
  };
}

function formatTweet(row: any): any {
  return {
    id: row.id,
    connected_account_id: row.connected_account_id,
    content: row.content,
    hashtags: row.hashtags || [],
    persona: row.persona,
    postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
    twitterId: row.twitter_id,
    twitterUrl: row.twitter_url,
    errorMessage: row.error_message,
    status: row.status,
    createdAt: new Date(row.created_at),
    posted_at: row.posted_at,
    twitter_id: row.twitter_id,
    twitter_url: row.twitter_url,
    error_message: row.error_message,
    image_url: row.image_url,
    image_status: row.image_status,
    card_data: row.card_data,
    created_at: row.created_at,
    thread_id: row.thread_id,
    thread_sequence: row.thread_sequence,
    parent_twitter_id: row.parent_twitter_id,
    content_type: row.content_type || 'single_tweet',
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<DashboardData>> {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ) as any;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const accountId = searchParams.get('account_id') || null;

    // Parallel queries - single round-trip to DB
    let tweetsResult: { rows: unknown[] };
    let totalResult: { rows: { count: string }[] };

    if (accountId) {
      [tweetsResult, totalResult] = await Promise.all([
        sql<any>`
          SELECT * FROM tweets
          WHERE connected_account_id = ${accountId}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `,
        sql<any>`
          SELECT COUNT(*) as count FROM tweets
          WHERE connected_account_id = ${accountId}
        `
      ]);
    } else {
      [tweetsResult, totalResult] = await Promise.all([
        sql<any>`
          SELECT * FROM tweets
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `,
        sql<any>`
          SELECT COUNT(*) as count FROM tweets
        `
      ]);
    }

    const [accountsResult, personasResult] = await Promise.all([
      sql<any>`
        SELECT * FROM connected_accounts 
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `,
      sql<any>`
        SELECT p.* FROM personas p
        INNER JOIN connected_accounts ca ON p.connected_account_id = ca.id
        WHERE ca.user_id = ${userId}
        ORDER BY p.created_at DESC
      `
    ]);

    const accounts = accountsResult.rows.map(formatAccount);
    const personas = personasResult.rows
      .filter(p => p.is_active)
      .map(formatPersona);
    const tweets = tweetsResult.rows.map(formatTweet);
    const total = parseInt(totalResult.rows[0].count);

    // Determine defaults
    let defaultAccountId: string | null = null;
    let defaultPersonaId: string | null = null;

    if (accounts.length > 0) {
      const activeAccount = accounts.find(a => a.status === 'active') || accounts[0];
      defaultAccountId = activeAccount.id;

      // Filter personas for this account
      const accountPersonas = personas.filter(p => p.connected_account_id === defaultAccountId);
      if (accountPersonas.length > 0) {
        defaultPersonaId = accountPersonas[0].id;
      }
    }

    const totalPages = Math.ceil(total / limit);

    const response: DashboardData = {
      accounts,
      personas: accountId 
        ? personas.filter(p => p.connected_account_id === accountId)
        : personas,
      tweets: {
        data: tweets,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      defaultAccountId,
      defaultPersonaId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    ) as any;
  }
}