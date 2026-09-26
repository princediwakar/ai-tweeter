import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get the calendar entry
    const calendarRes = await sql`
      SELECT c.*, b.id as brand_id, b.consecutive_approved_posts, b.autonomy_mode
      FROM content_calendar c
      JOIN brand_profiles b ON c.brand_profile_id = b.id
      WHERE c.id = ${params.id} AND b.user_id = ${userId}
    `;

    if (calendarRes.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const calendar = calendarRes.rows[0];

    // 2. Set the post status to 'ready'
    await sql`
      UPDATE posts 
      SET status = 'ready', updated_at = NOW() 
      WHERE calendar_id = ${params.id}
    `;

    // 3. Update the calendar entry status
    await sql`
      UPDATE content_calendar
      SET status = 'planned', updated_at = NOW()
      WHERE id = ${params.id}
    `;

    // 4. Increment consecutive_approved_posts
    const newConsecutive = (calendar.consecutive_approved_posts || 0) + 1;
    await sql`
      UPDATE brand_profiles
      SET consecutive_approved_posts = ${newConsecutive}, updated_at = NOW()
      WHERE id = ${calendar.brand_id}
    `;

    return NextResponse.json({ 
      success: true, 
      consecutive_approved: newConsecutive 
    });
  } catch (error: any) {
    console.error('[Approve Post API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
