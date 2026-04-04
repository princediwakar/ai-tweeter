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

    const personas = await sql`
      SELECT id, name, description, base_persona, config, min_length, max_length, tone, topics, is_active, created_at, updated_at
      FROM personas
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ personas: personas.rows });
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Failed to fetch personas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, base_persona, config, min_length, max_length, tone, topics } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    const result = await sql`
      INSERT INTO personas (user_id, name, description, base_persona, config, min_length, max_length, tone, topics)
      VALUES (${userId}, ${name}, ${description}, ${base_persona}, ${JSON.stringify(config || {})}, ${min_length || 200}, ${max_length || 280}, ${tone}, ${topics || null})
      RETURNING id, name, description, base_persona, is_active, created_at
    `;

    return NextResponse.json({ success: true, persona: result.rows[0] });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Failed to create persona' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, base_persona, config, min_length, max_length, tone, topics, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Persona ID required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (base_persona !== undefined) { updates.push(`base_persona = $${paramIndex++}`); values.push(base_persona); }
    if (config !== undefined) { updates.push(`config = $${paramIndex++}`); values.push(JSON.stringify(config)); }
    if (min_length !== undefined) { updates.push(`min_length = $${paramIndex++}`); values.push(min_length); }
    if (max_length !== undefined) { updates.push(`max_length = $${paramIndex++}`); values.push(max_length); }
    if (tone !== undefined) { updates.push(`tone = $${paramIndex++}`); values.push(tone); }
    if (topics !== undefined) { updates.push(`topics = $${paramIndex++}`); values.push(topics); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id, userId);
    const result = await sql.query(
      `UPDATE personas SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({ success: true, persona: result.rows[0] });
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('id');

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0].id;

    await sql`DELETE FROM personas WHERE id = ${personaId} AND user_id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 });
  }
}
