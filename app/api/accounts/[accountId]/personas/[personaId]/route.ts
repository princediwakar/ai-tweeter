import { NextRequest, NextResponse } from 'next/server';
import { personaService } from '@/lib/personaService';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

interface RouteParams {
  accountId: string;
  personaId: string;
}

/**
 * @deprecated Use /api/personas instead (new SaaS API)
 * This endpoint is for backward compatibility with the old account-based system.
 * The accountId parameter is treated as connected_account_id.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, personaId } = await params;

    // Verify that the connected account belongs to the user
    const accountCheck = await sql`
      SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const persona = await personaService.getPersona(personaId);
    if (!persona || persona.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ persona });
  } catch (error) {
    console.error('Error fetching persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, personaId } = await params;

    // Verify that the connected account belongs to the user
    const accountCheck = await sql`
      SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const persona = await personaService.getPersona(personaId);
    if (!persona || persona.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await personaService.updatePersona({
      id: personaId,
      ...body,
    });

    return NextResponse.json({ persona: updated });
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, personaId } = await params;

    // Verify that the connected account belongs to the user
    const accountCheck = await sql`
      SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const persona = await personaService.getPersona(personaId);
    if (!persona || persona.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await personaService.deletePersona(personaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}