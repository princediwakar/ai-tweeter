import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { tasks } from "@trigger.dev/sdk";
import { getUserIdFromRequest } from '@/lib/auth';
import { generateAccountContent } from '@/trigger/generate-content';

export async function POST(
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

    // Verify ownership and get brand profile
    const verification = await sql`
      SELECT c.id, c.brand_profile_id 
      FROM content_calendar c
      JOIN brand_profiles b ON c.brand_profile_id = b.id
      WHERE c.id = ${calendarId} AND b.user_id = ${userId}
    `;

    if (verification.rows.length === 0) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const brandId = verification.rows[0].brand_profile_id;

    // Delete the existing post to put it back into drafting state
    await sql`DELETE FROM posts WHERE calendar_id = ${calendarId}`;
    
    // Ensure the calendar entry itself is marked as 'planned'
    await sql`UPDATE content_calendar SET status = 'planned' WHERE id = ${calendarId}`;

    // Trigger the background task for the connected accounts
    const accountsResult = await sql`
      SELECT id FROM connected_accounts 
      WHERE user_id = ${userId} AND brand_profile_id = ${brandId} AND is_active = true
    `;
    
    for (const account of accountsResult.rows) {
      await tasks.trigger<typeof generateAccountContent>("generate-account-content", {
        accountId: account.id,
        debugMode: true // Force generate regardless of schedule
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to regenerate calendar entry:', error);
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 });
  }
}
