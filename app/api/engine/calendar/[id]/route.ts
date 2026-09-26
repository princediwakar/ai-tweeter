import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserIdFromRequest } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const calendarId = resolvedParams.id;
    
    if (!calendarId) {
      return NextResponse.json({ error: 'Missing calendar ID' }, { status: 400 });
    }

    // Verify ownership (the calendar entry belongs to a brand_profile that belongs to the user)
    const verification = await sql`
      SELECT c.id 
      FROM content_calendar c
      JOIN brand_profiles b ON c.brand_profile_id = b.id
      WHERE c.id = ${calendarId} AND b.user_id = ${userId}
    `;

    if (verification.rows.length === 0) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // Delete associated posts first
    await sql`DELETE FROM posts WHERE calendar_id = ${calendarId}`;
    
    // Delete the calendar entry
    await sql`DELETE FROM content_calendar WHERE id = ${calendarId}`;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to delete calendar entry:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const calendarId = resolvedParams.id;
    
    if (!calendarId) {
      return NextResponse.json({ error: 'Missing calendar ID' }, { status: 400 });
    }

    const body = await request.json();
    const { content, planned_date } = body;

    // Verify ownership
    const verification = await sql`
      SELECT c.id, c.brand_profile_id 
      FROM content_calendar c
      JOIN brand_profiles b ON c.brand_profile_id = b.id
      WHERE c.id = ${calendarId} AND b.user_id = ${userId}
    `;

    if (verification.rows.length === 0) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // Update the content if provided
    if (content !== undefined) {
      await sql`
        UPDATE posts 
        SET content = ${content}, updated_at = NOW()
        WHERE calendar_id = ${calendarId}
      `;
    }

    // Update the date if provided
    if (planned_date !== undefined) {
      await sql`
        UPDATE content_calendar 
        SET planned_date = ${planned_date}, updated_at = NOW()
        WHERE id = ${calendarId}
      `;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to update calendar entry:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
