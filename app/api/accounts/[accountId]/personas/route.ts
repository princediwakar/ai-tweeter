import { NextRequest, NextResponse } from 'next/server';
import { personaService } from '@/lib/personaService';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

/**
 * @deprecated Use /api/personas instead (new SaaS API)
 * This endpoint is for backward compatibility with the old account-based system.
 * The accountId parameter is treated as connected_account_id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    // Verify that the connected account belongs to the user
    const accountCheck = await sql`
      SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const personas = await personaService.getPersonasByAccount(accountId);
    return NextResponse.json({ personas });
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    // Verify that the connected account belongs to the user
    const accountCheck = await sql`
      SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const persona = await personaService.createPersona({
      ...body,
      connected_account_id: accountId,
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}