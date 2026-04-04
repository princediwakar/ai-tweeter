import { NextRequest, NextResponse } from 'next/server';
import { scheduleService } from '@/lib/scheduleService';
import { getUserIdFromRequest } from '@/lib/auth';
import { accountService } from '@/lib/accountService';

interface RouteParams {
  accountId: string;
  scheduleId: string;
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

    const { accountId, scheduleId } = await params;
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.owner_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await scheduleService.getSchedule(scheduleId);
    if (!schedule || schedule.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
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

    const { accountId, scheduleId } = await params;
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await scheduleService.getSchedule(scheduleId);
    if (!schedule || schedule.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await scheduleService.updateSchedule({
      id: scheduleId,
      ...body,
    });

    return NextResponse.json({ schedule: updated });
  } catch (error) {
    console.error('Error updating schedule:', error);
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

    const { accountId, scheduleId } = await params;
    const account = await accountService.getAccount(accountId);
    
    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = await scheduleService.getSchedule(scheduleId);
    if (!schedule || schedule.connected_account_id !== accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await scheduleService.deleteSchedule(scheduleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}