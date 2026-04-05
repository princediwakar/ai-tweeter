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
    
    // Fetch schedules for this account
    const scheduleRows = await sql`
      SELECT * FROM account_schedules WHERE connected_account_id = ${accountId}
    `;
    
    // Map schedules by persona_id
    const scheduleMap = new Map<string, typeof scheduleRows.rows[0][]>();
    scheduleRows.rows.forEach((row: typeof scheduleRows.rows[0]) => {
      if (row.persona_id) {
        if (!scheduleMap.has(row.persona_id)) {
          scheduleMap.set(row.persona_id, []);
        }
        scheduleMap.get(row.persona_id)!.push(row);
      }
    });

    // Attach schedules to each persona
    const personasWithSchedules = personas.map(persona => ({
      ...persona,
      schedules: (scheduleMap.get(persona.id) || []).map(schedule => ({
        id: schedule.id,
        days_of_week: schedule.days_of_week,
        start_time: schedule.start_time,
        is_active: schedule.is_active,
      })),
    }));

    return NextResponse.json({ personas: personasWithSchedules });
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