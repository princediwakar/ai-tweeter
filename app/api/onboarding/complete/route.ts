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
      // Assign any unassigned connected accounts to this brand profile
      await client.query('UPDATE connected_accounts SET brand_profile_id = $1 WHERE user_id = $2 AND brand_profile_id IS NULL', [brandProfileId, userId]);
    }

    // Get all connected accounts for the user (we use the ones that just got tied to this brand)
    let queryArgs = [userId];
    let queryStr = 'SELECT id FROM connected_accounts WHERE user_id = $1 AND is_active = true';
    if (brandProfileId) {
      queryStr += ' AND brand_profile_id = $2';
      queryArgs.push(brandProfileId);
    }

    const accountsResult = await client.query(queryStr, queryArgs);
    const accounts = accountsResult.rows;

    for (const acc of accounts) {
      // Create Schedule for each account
      await client.query(`
        INSERT INTO account_schedules (
          user_id, connected_account_id, brand_profile_id, timezone, is_active,
          posting_times, days_of_week, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW(), NOW())
      `, [
        userId, acc.id, brandProfileId, 'UTC', true,
        JSON.stringify([timeSlot]), 
        JSON.stringify(daysOfWeek)
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