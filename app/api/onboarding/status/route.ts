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

    const result = await sql`
      SELECT 
        onboarding_completed,
        onboarding_step,
        onboarding_topics,
        onboarding_post_frequency,
        onboarding_post_time
      FROM users 
      WHERE email = ${session.user.email}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      completed: user.onboarding_completed ?? false,
      step: user.onboarding_step ?? 1,
      topics: user.onboarding_topics ?? [],
      frequency: user.onboarding_post_frequency ?? 3,
      postTime: user.onboarding_post_time ?? 'morning',
    });
  } catch (error) {
    // If columns don't exist yet (migration not run), return not-completed
    console.error('Onboarding status error:', error);
    return NextResponse.json({ completed: false, step: 1, topics: [], frequency: 3, postTime: 'morning' });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { step } = body;

    if (step !== undefined) {
      await sql`
        UPDATE users 
        SET onboarding_step = ${step}, updated_at = NOW()
        WHERE email = ${session.user.email}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding step update error:', error);
    return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
  }
}
