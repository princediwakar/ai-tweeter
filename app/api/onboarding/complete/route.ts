import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';
import { personaService } from '@/lib/personaService';
import { scheduleService } from '@/lib/scheduleService';

export const dynamic = 'force-dynamic';

interface PersonaData {
  accountId: string;
  platform: string; // Make sure you are passing this from the frontend
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

    // 1. Update User State
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

    // 2. Determine Days of Week
    let daysOfWeek = [1, 3, 5]; // 3x / week (Mon, Wed, Fri) default
    if (safeFrequency === 1) daysOfWeek = [3]; 
    else if (safeFrequency === 5) daysOfWeek = [1, 2, 3, 4, 5]; 
    else if (safeFrequency === 7) daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; 

    // 3. Determine Time Boundaries (in minutes from midnight)
    let minTime = 480; // 8:00 AM
    let maxTime = 600; // 10:00 AM
    let scheduleNamePrefix = 'Morning';

    if (safePostTime === 'afternoon') {
      minTime = 720; // 12:00 PM
      maxTime = 840; // 2:00 PM
      scheduleNamePrefix = 'Afternoon';
    } else if (safePostTime === 'evening') {
      minTime = 1020; // 5:00 PM
      maxTime = 1140; // 7:00 PM
      scheduleNamePrefix = 'Evening';
    }

    // 4. Create Personas and their specific Schedules synchronously
    for (const p of personas as PersonaData[]) {
      // Create Persona
      const newPersona = await personaService.createPersona({
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

      // Generate a specific random minute within the boundary for THIS specific persona
      const randomSpecificTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

      // Create Schedule tied directly to the newly created persona ID
      await scheduleService.createSchedule({
        connected_account_id: p.accountId,
        persona_id: newPersona.id, // THE CRITICAL MISSING LINK
        name: `${scheduleNamePrefix} Schedule - ${p.persona.name}`,
        days_of_week: daysOfWeek,
        start_time: randomSpecificTime,
        end_time: randomSpecificTime + 5, // 5 minute window for cron job to pick it up
        is_active: true,
      });
    }

    return NextResponse.json({ success: true, message: 'Onboarding complete!' });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
  }
}