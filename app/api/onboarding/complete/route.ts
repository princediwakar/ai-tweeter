import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const client = await sql.connect();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { frequency, postTime } = body;

    const safeFrequency = Number(frequency) || 3;
    const safePostTime = postTime || 'morning';

    // 1. Determine Days of Week
    let daysOfWeek = [1, 3, 5]; // 3x / week (Mon, Wed, Fri) default
    if (safeFrequency === 1) daysOfWeek = [3]; 
    else if (safeFrequency === 5) daysOfWeek = [1, 2, 3, 4, 5]; 
    else if (safeFrequency === 7) daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; 

    // 2. Determine Posting Times
    let timeSlot = '08:00';
    if (safePostTime === 'afternoon') {
      timeSlot = '13:00';
    } else if (safePostTime === 'evening') {
      timeSlot = '18:00';
    }

    // Start transaction
    await client.query('BEGIN');

    // Get the most recent brand profile for this user
    const brandResult = await client.query('SELECT id FROM brand_profiles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
    const brandProfileId = brandResult.rows[0]?.id;

    if (brandProfileId) {
      // Assign any active connected accounts for this user to this brand profile
      await client.query('UPDATE connected_accounts SET brand_profile_id = $1 WHERE user_id = $2', [brandProfileId, userId]);
    }

    // Get all active connected accounts for the user
    const accountsResult = await client.query(
      'SELECT id, platform FROM connected_accounts WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    const accounts = accountsResult.rows;

    if (brandProfileId) {
      for (const acc of accounts) {
        if (acc.platform === 'twitter') {
          await client.query('UPDATE brand_profiles SET twitter_account_id = $1 WHERE id = $2', [acc.id, brandProfileId]);
        } else if (acc.platform === 'linkedin') {
          await client.query('UPDATE brand_profiles SET linkedin_account_id = $1 WHERE id = $2', [acc.id, brandProfileId]);
        }
      }
    }

    if (accounts.length === 0 && brandProfileId) {
      // Create a schedule for the brand profile even before accounts are connected
      const existing = await client.query('SELECT id FROM account_schedules WHERE user_id = $1 AND brand_profile_id = $2', [userId, brandProfileId]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO account_schedules (
            user_id, brand_profile_id, timezone, is_active,
            posting_times, days_of_week, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW())
        `, [
          userId, brandProfileId, 'Asia/Kolkata', true,
          JSON.stringify([timeSlot]), 
          JSON.stringify(daysOfWeek)
        ]);
      }
    } else {
      for (const acc of accounts) {
        // Upsert schedule for this account and brand
        const existing = await client.query('SELECT id FROM account_schedules WHERE user_id = $1 AND connected_account_id = $2', [userId, acc.id]);
        if (existing.rows.length > 0) {
          await client.query(`
            UPDATE account_schedules 
            SET brand_profile_id = $1, posting_times = $2::jsonb, days_of_week = $3::jsonb, is_active = true, updated_at = NOW()
            WHERE id = $4
          `, [brandProfileId, JSON.stringify([timeSlot]), JSON.stringify(daysOfWeek), existing.rows[0].id]);
        } else {
          await client.query(`
            INSERT INTO account_schedules (
              user_id, connected_account_id, brand_profile_id, timezone, is_active,
              posting_times, days_of_week, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW(), NOW())
          `, [
            userId, acc.id, brandProfileId, 'Asia/Kolkata', true,
            JSON.stringify([timeSlot]), 
            JSON.stringify(daysOfWeek)
          ]);
        }
      }
    }
    
    // --- POPULATE CONTENT CALENDAR FOR NEW BRAND ---
    if (brandProfileId && accounts.length > 0) {
      const pillarsRes = await client.query('SELECT id FROM content_pillars WHERE brand_profile_id = $1', [brandProfileId]);
      const pillars = pillarsRes.rows;
      
      if (pillars.length > 0) {
        // Generate calendar for just the first post
        const date = new Date();
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
        
        for (const acc of accounts) {
          const plannedPlatform = acc.platform || 'twitter';
          const existingRes = await client.query('SELECT id FROM content_calendar WHERE brand_profile_id = $1 AND planned_date = $2 AND planned_platform = $3', [brandProfileId, dateStr, plannedPlatform]);
          
          if (existingRes.rows.length === 0) {
            const randomPillar = pillars[Math.floor(Math.random() * pillars.length)];
            
            await client.query(`
              INSERT INTO content_calendar (
                brand_profile_id, planned_date, planned_platform, pillar_id, status, created_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, 'planned', NOW(), NOW()
              )
            `, [brandProfileId, dateStr, plannedPlatform, randomPillar.id]);
          }
        }
      }
    }

    // Commit transaction before triggering tasks
    await client.query('COMMIT');

    // --- TRIGGER CONTENT GENERATION ---
    // Import Trigger.dev tasks dynamically to avoid top-level issues if any
    const { tasks } = await import("@trigger.dev/sdk");
    const { generateAccountContent } = await import("@/trigger/generate-content");
    
    for (const acc of accounts) {
      try {
        await tasks.trigger<typeof generateAccountContent>("generate-account-content", {
          accountId: acc.id,
          debugMode: true // Force generate regardless of schedule
        });
      } catch (err) {
        console.error(`Failed to trigger generation for account ${acc.id}:`, err);
      }
    }

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