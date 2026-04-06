// app/api/accounts/[accountId]/personas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { personaService, CreatePersonaInput } from '@/lib/personaService';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { accountId } = await params;
    const accountCheck = await sql`SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}`;
    if (accountCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const personas = await personaService.getPersonasByAccount(accountId);
    const scheduleRows = await sql`SELECT * FROM account_schedules WHERE connected_account_id = ${accountId}`;
    
    const scheduleMap = new Map<string, typeof scheduleRows.rows[0][]>();
    scheduleRows.rows.forEach((row: typeof scheduleRows.rows[0]) => {
      if (row.persona_id) {
        if (!scheduleMap.has(row.persona_id)) scheduleMap.set(row.persona_id, []);
        scheduleMap.get(row.persona_id)!.push(row);
      }
    });

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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { accountId } = await params;
    const accountCheck = await sql`SELECT id FROM connected_accounts WHERE id = ${accountId} AND user_id = ${userId}`;
    if (accountCheck.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    // RUTHLESS VALIDATION
    const safeData: Partial<CreatePersonaInput> = {};
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
      safeData.config = body.config; // Assume DB merging handles default structures safely
    }

    if (!safeData.name) {
      return NextResponse.json({ error: 'Persona name is required' }, { status: 400 });
    }

    const persona = await personaService.createPersona({
      ...(safeData as CreatePersonaInput),
      connected_account_id: accountId,
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}