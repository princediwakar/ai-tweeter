import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId, daysOfWeek, timeSlot } = await request.json();

    if (!scheduleId) {
      return NextResponse.json({ error: 'Missing scheduleId' }, { status: 400 });
    }

    // Verify ownership
    const verification = await sql`
      SELECT id FROM account_schedules 
      WHERE id = ${scheduleId} AND user_id = ${userId}
    `;

    if (verification.rows.length === 0) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // Update schedule
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (daysOfWeek !== undefined) {
      updates.push(`days_of_week = $${i++}::jsonb`);
      values.push(JSON.stringify(daysOfWeek));
    }

    if (timeSlot !== undefined) {
      updates.push(`posting_times = $${i++}::jsonb`);
      values.push(JSON.stringify([timeSlot])); // We only support one time slot for now
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(scheduleId);
      
      await sql.query(
        `UPDATE account_schedules SET ${updates.join(', ')} WHERE id = $${i}`,
        values
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('Failed to update schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
