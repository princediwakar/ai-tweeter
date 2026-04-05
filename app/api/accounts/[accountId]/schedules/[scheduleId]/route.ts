import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { scheduleService } from '@/lib/scheduleService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const result = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  return result.rows[0]?.id || null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; scheduleId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, scheduleId } = await params;

    const accountResult = await sql`
      SELECT id FROM connected_accounts 
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (accountResult.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    await scheduleService.updateSchedule({ id: scheduleId, ...body });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; scheduleId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, scheduleId } = await params;

    const accountResult = await sql`
      SELECT id FROM connected_accounts 
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (accountResult.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await scheduleService.deleteSchedule(scheduleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
