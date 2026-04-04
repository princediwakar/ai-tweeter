import { NextRequest, NextResponse } from 'next/server';
import { scheduleService } from '@/lib/scheduleService';
import { getUserIdFromRequest } from '@/lib/auth';
import { accountService } from '@/lib/accountService';

/**
 * @deprecated Use /api/schedules instead (new SaaS API)
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

    const schedules = await scheduleService.getSchedulesByAccount(accountId);
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
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
    const schedule = await scheduleService.createSchedule({
      ...body,
      account_id: accountId,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}