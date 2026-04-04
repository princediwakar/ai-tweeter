import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    const schedules = await sql`
      SELECT s.id, s.name, s.description, s.cron_expression, s.timezone, s.use_trending, s.include_hashtags, s.bulk_count, s.is_active, s.last_run_at, s.next_run_at, s.created_at,
        c.account_username, c.platform
      FROM schedules s
      LEFT JOIN connected_accounts c ON s.connected_account_id = c.id
      WHERE s.user_id = ${userId}
      ORDER BY s.created_at DESC
    `;

    return NextResponse.json({ schedules: schedules.rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, connected_account_id, persona_id, cron_expression, timezone, use_trending, include_hashtags, bulk_count } = body;

    if (!name || !connected_account_id) {
      return NextResponse.json({ error: 'Name and account are required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    const result = await sql`
      INSERT INTO schedules (user_id, name, description, connected_account_id, persona_id, cron_expression, timezone, use_trending, include_hashtags, bulk_count)
      VALUES (${userId}, ${name}, ${description}, ${connected_account_id}, ${persona_id}, ${cron_expression || '0 * * * *'}, ${timezone || 'UTC'}, ${use_trending || false}, ${include_hashtags || true}, ${bulk_count || 1})
      RETURNING id, name, is_active, cron_expression, created_at
    `;

    return NextResponse.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, connected_account_id, persona_id, cron_expression, timezone, use_trending, include_hashtags, bulk_count, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (connected_account_id !== undefined) { updates.push(`connected_account_id = $${paramIndex++}`); values.push(connected_account_id); }
    if (persona_id !== undefined) { updates.push(`persona_id = $${paramIndex++}`); values.push(persona_id); }
    if (cron_expression !== undefined) { updates.push(`cron_expression = $${paramIndex++}`); values.push(cron_expression); }
    if (timezone !== undefined) { updates.push(`timezone = $${paramIndex++}`); values.push(timezone); }
    if (use_trending !== undefined) { updates.push(`use_trending = $${paramIndex++}`); values.push(use_trending); }
    if (include_hashtags !== undefined) { updates.push(`include_hashtags = $${paramIndex++}`); values.push(include_hashtags); }
    if (bulk_count !== undefined) { updates.push(`bulk_count = $${paramIndex++}`); values.push(bulk_count); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id, userId);
    const result = await sql.query(
      `UPDATE schedules SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    await sql`DELETE FROM schedules WHERE id = ${scheduleId} AND user_id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
