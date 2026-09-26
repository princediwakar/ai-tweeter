import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine completion based on whether they have schedules set up
    const schedulesResult = await sql`SELECT id FROM account_schedules WHERE user_id = ${userId} LIMIT 1`;
    const hasSchedules = schedulesResult.rows.length > 0;

    // Determine if they generated a profile but haven't scheduled yet
    const profilesResult = await sql`SELECT id FROM brand_profiles WHERE user_id = ${userId} LIMIT 1`;
    const hasProfile = profilesResult.rows.length > 0;

    // Determine if they connected accounts
    const accountsResult = await sql`SELECT id FROM connected_accounts WHERE user_id = ${userId} LIMIT 1`;
    const hasAccounts = accountsResult.rows.length > 0;

    let step = 1;
    if (hasAccounts) step = 3;
    if (hasProfile) step = 5;
    if (hasSchedules) step = 6;

    return NextResponse.json({
      completed: hasSchedules,
      step: step,
      topics: [],
      frequency: 3,
      postTime: 'morning',
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    return NextResponse.json({ completed: false, step: 1, topics: [], frequency: 3, postTime: 'morning' });
  }
}

export async function PATCH(request: NextRequest) {
  // We no longer persist intermediate step numbers in the database
  // because we determine it dynamically based on resources created.
  return NextResponse.json({ success: true });
}
