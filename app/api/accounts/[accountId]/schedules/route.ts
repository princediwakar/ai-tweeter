// app/api/accounts/[accountId]/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { scheduleService } from '@/lib/scheduleService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper function actually being used now
async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const result = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
  return result.rows[0]?.id || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // FIXED: Using helper
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    const accountResult = await sql`
      SELECT id FROM connected_accounts 
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (accountResult.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedules = await scheduleService.getSchedulesByAccount(accountId);
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // FIXED: Using helper
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    const accountResult = await sql`
      SELECT id FROM connected_accounts 
      WHERE id = ${accountId} AND user_id = ${userId}
    `;

    if (accountResult.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const schedule = await scheduleService.createSchedule({
      ...body,
      connected_account_id: accountId,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}