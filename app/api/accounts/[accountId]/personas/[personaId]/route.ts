// app/api/accounts/[accountId]/personas/[personaId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { personaService, UpdatePersonaInput } from '@/lib/personaService';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

interface RouteParams {
  accountId: string;
  personaId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { accountId, personaId } = await params;
    const accountCheck = await sql`SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}`;
    if (accountCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { accountId, personaId } = await params;
    const accountCheck = await sql`SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}`;
    if (accountCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const persona = await personaService.getPersona(personaId);
    if (!persona || persona.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();

    // RUTHLESS VALIDATION
    const safeData: Partial<UpdatePersonaInput> = {};
    if (typeof body.name === 'string') safeData.name = body.name;
    if (typeof body.description === 'string') safeData.description = body.description;
    if (typeof body.tone === 'string') safeData.tone = body.tone;
    if (typeof body.min_length === 'number') safeData.min_length = body.min_length;
    if (typeof body.max_length === 'number') safeData.max_length = body.max_length;
    if (typeof body.is_active === 'boolean') safeData.is_active = body.is_active;
    if (typeof body.is_default === 'boolean') safeData.is_default = body.is_default;
    
    if (Array.isArray(body.topics) && body.topics.every((t: any) => typeof t === 'string')) {
      safeData.topics = body.topics;
    }
    if (Array.isArray(body.rss_sources) && body.rss_sources.every((r: any) => typeof r === 'string')) {
      safeData.rss_sources = body.rss_sources;
    }
    if (body.config && typeof body.config === 'object') {
      safeData.config = body.config;
    }

    if (Object.keys(safeData).length === 0) {
      return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 });
    }

    const updated = await personaService.updatePersona({
      id: personaId,
      ...safeData,
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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { accountId, personaId } = await params;
    const accountCheck = await sql`SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}`;
    if (accountCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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