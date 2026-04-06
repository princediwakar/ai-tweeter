import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { topics, frequency, postTime } = body;

    // Validate
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: 'At least one topic is required' }, { status: 400 });
    }

    const safeFrequency = Number(frequency) || 3;
    const safePostTime = postTime || 'morning';

    await sql`
      UPDATE users 
      SET 
        onboarding_completed = true,
        onboarding_step = 5,
        onboarding_topics = ${topics as unknown as string},
        onboarding_post_frequency = ${safeFrequency},
        onboarding_post_time = ${safePostTime},
        updated_at = NOW()
      WHERE email = ${session.user.email}
    `;

    return NextResponse.json({ success: true, message: 'Onboarding complete!' });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
  }
}
