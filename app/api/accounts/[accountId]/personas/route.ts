import { NextRequest, NextResponse } from 'next/server';
import { customPersonaService } from '@/lib/customPersonaService';
import { getUserIdFromRequest } from '@/lib/auth';
import { accountService } from '@/lib/accountService';

/**
 * @deprecated Use /api/personas instead (new SaaS API)
 * This endpoint is for backward compatibility with the old account-based system.
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
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const personas = await customPersonaService.getPersonasByAccount(accountId);
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
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const persona = await customPersonaService.createPersona({
      ...body,
      account_id: accountId,
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}