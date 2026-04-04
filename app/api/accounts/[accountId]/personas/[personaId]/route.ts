import { NextRequest, NextResponse } from 'next/server';
import { customPersonaService } from '@/lib/customPersonaService';
import { getUserIdFromRequest } from '@/lib/auth';
import { accountService } from '@/lib/accountService';

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
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, personaId } = await params;
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const persona = await customPersonaService.getPersona(personaId);
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
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const persona = await customPersonaService.getPersona(personaId);
    if (!persona || persona.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await customPersonaService.updatePersona({
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
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const persona = await customPersonaService.getPersona(personaId);
    if (!persona || persona.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await customPersonaService.deletePersona(personaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}