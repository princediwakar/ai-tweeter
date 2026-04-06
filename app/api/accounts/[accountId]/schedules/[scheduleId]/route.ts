// app/api/accounts/[accountId]/schedules/[scheduleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { scheduleService, CreateScheduleInput } from '@/lib/scheduleService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function to keep controllers lean
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

    // Verify ownership before allowing updates
    const accountResult = await sql`
      SELECT id FROM connected_accounts 
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (accountResult.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // STRICT VALIDATION: Only extract known, safe fields of the correct type.
    const safeUpdateData: Partial<CreateScheduleInput> = {};
    
    if (typeof body.name === 'string') safeUpdateData.name = body.name;
    if (typeof body.timezone === 'string') safeUpdateData.timezone = body.timezone;
    if (typeof body.start_time === 'number') safeUpdateData.start_time = body.start_time;
    if (typeof body.end_time === 'number') safeUpdateData.end_time = body.end_time;
    if (typeof body.is_active === 'boolean') safeUpdateData.is_active = body.is_active;
    if (typeof body.persona_id === 'string') safeUpdateData.persona_id = body.persona_id;
    
    // Validate days_of_week array strictly (must be an array of numbers between 0 and 6)
    if (
      Array.isArray(body.days_of_week) && 
      body.days_of_week.every((d: any) => typeof d === 'number' && d >= 0 && d <= 6)
    ) {
      safeUpdateData.days_of_week = body.days_of_week;
    }

    // If payload was completely garbage, reject it
    if (Object.keys(safeUpdateData).length === 0) {
      return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 });
    }

    await scheduleService.updateSchedule({ id: scheduleId, ...safeUpdateData });

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

    // Verify ownership before allowing deletion
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