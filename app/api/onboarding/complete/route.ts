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
  const client = await sql.connect();
  
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

    // Start transaction
    await client.query('BEGIN');

    // 1. Update User State (inside transaction)
    await client.query(`
      UPDATE users 
      SET 
        onboarding_completed = true,
        onboarding_step = 6,
        onboarding_post_frequency = $1,
        onboarding_post_time = $2,
        updated_at = NOW()
      WHERE email = $3
    `, [safeFrequency, safePostTime, session.user.email]);

    // 4. Create Personas and their specific Schedules synchronously
    for (const p of personas as PersonaData[]) {
      // Create Persona
      const personaId = crypto.randomUUID();
      const now = new Date().toISOString();
      const baseKey = p.persona.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const key = `${baseKey}-${Date.now()}`;
      
      const tone = p.persona.tone || null;
      let topics = null;
      if (p.persona.topics?.length) {
        topics = `{${p.persona.topics.join(',')}}`;
      }

      // Get user_id from connected_accounts
      const accountResult = await client.query(
        'SELECT user_id FROM connected_accounts WHERE id = $1',
        [p.accountId]
      );
      const userId = accountResult.rows[0]?.user_id;

      await client.query(`
        INSERT INTO personas (
          id, connected_account_id, user_id, key, name, description, rss_sources, config,
          min_length, max_length, tone, topics, is_active, is_default,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, true, false, $13, $14)
      `, [
        personaId, p.accountId, userId, key, p.persona.name,
        p.persona.description || '', JSON.stringify(p.persona.rss_sources || []),
        JSON.stringify({ core_thesis: 'Signal is found in hard data and actual execution, not marketing hype.', the_enemy: 'Vanity metrics and generic corporate posturing.', framing_bias: 'Focus on the unsexy, operational reality behind the flashy headline.', hook_mechanics: 'Open with a blunt statement of fact or a surprising metric.', format_rules: ['Write in the first person.', 'Use short, punchy paragraphs (max 2 sentences).', 'Use plain, conversational English.', 'Never use emojis or hashtags.'], image_probability: 0 }),
        p.persona.min_length || 200, p.persona.max_length || 280,
        tone, topics, now, now
      ]);

      // Generate a specific random minute within the boundary for THIS specific persona
      const randomSpecificTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

      // Create Schedule tied directly to the newly created persona ID
      const scheduleId = crypto.randomUUID();
      await client.query(`
        INSERT INTO account_schedules (
          id, connected_account_id, name, timezone, schedule_config, 
          days_of_week, start_time, end_time, is_active,
          persona_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, true, $9, $10, $11)
      `, [
        scheduleId, p.accountId, `${scheduleNamePrefix} Schedule - ${p.persona.name}`, 
        'UTC', '{}',
        `{${daysOfWeek.join(',')}}`, 
        randomSpecificTime, randomSpecificTime + 5,
        personaId, now, now
      ]);
    }

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json({ success: true, message: 'Onboarding complete!' });
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK').catch(() => {});
    
    console.error('Onboarding complete error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save onboarding data', details: message }, { status: 500 });
  } finally {
    client.release();
  }
}