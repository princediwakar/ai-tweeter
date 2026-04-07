import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';
import { personaService } from '@/lib/personaService';
import { scheduleService } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';

interface PersonaData {
  accountId: string;
  persona: {
    name: string;
    description: string;
    tone: string;
    topics: string[];
    rss_sources: string[];
    min_length: number;
    max_length: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { personas, frequency, postTime } = body;

    if (!personas || !Array.isArray(personas) || personas.length === 0) {
      return NextResponse.json({ error: 'At least one persona is required' }, { status: 400 });
    }

    const safeFrequency = Number(frequency) || 3;
    const safePostTime = postTime || 'morning';

    await sql`
      UPDATE users 
      SET 
        onboarding_completed = true,
        onboarding_step = 6,
        onboarding_post_frequency = ${safeFrequency},
        onboarding_post_time = ${safePostTime},
        updated_at = NOW()
      WHERE email = ${session.user.email}
    `;

    for (const p of personas as PersonaData[]) {
      await personaService.createPersona({
        connected_account_id: p.accountId,
        name: p.persona.name,
        description: p.persona.description,
        tone: p.persona.tone,
        topics: p.persona.topics,
        rss_sources: p.persona.rss_sources,
        min_length: p.persona.min_length,
        max_length: p.persona.max_length,
        is_active: true,
      });
    }

    // Create default schedules for each unique connected account
    const uniqueAccountIds = Array.from(new Set(personas.map((p: PersonaData) => p.accountId)));
    
    let startTime = 540; // 9:00 AM
    let endTime = 600;   // 10:00 AM
    let scheduleName = 'Morning Schedule';

    if (safePostTime === 'afternoon') {
      startTime = 840; // 2:00 PM
      endTime = 900;   // 3:00 PM
      scheduleName = 'Afternoon Schedule';
    } else if (safePostTime === 'evening') {
      startTime = 1140; // 7:00 PM
      endTime = 1200;   // 8:00 PM
      scheduleName = 'Evening Schedule';
    }

    // Determine days of week based on frequency
    let daysOfWeek = [1, 3, 5]; // 3x / week (Mon, Wed, Fri)
    if (safeFrequency === 1) daysOfWeek = [3]; // 1x / week (Wed)
    else if (safeFrequency === 5) daysOfWeek = [1, 2, 3, 4, 5]; // 5x / week (Mon-Fri)
    else if (safeFrequency === 7) daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // Daily

    for (const accountId of uniqueAccountIds) {
      await scheduleService.createSchedule({
        connected_account_id: accountId,
        name: scheduleName,
        days_of_week: daysOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      });
    }

    return NextResponse.json({ success: true, message: 'Onboarding complete!' });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
  }
}
