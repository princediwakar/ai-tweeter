import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { tasks } from "@trigger.dev/sdk";
import { generateAccountContent } from '@/trigger/generate-content'; 
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId } = await request.json();
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
    }

    // Find all connected accounts for this brand
    const accountsResult = await sql`
      SELECT id, platform FROM connected_accounts 
      WHERE user_id = ${userId} AND brand_profile_id = ${brandId} AND is_active = true
    `;
    const accounts = accountsResult.rows;

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No connected accounts found for this brand' }, { status: 404 });
    }

    // --- POPULATE CONTENT CALENDAR ---
    // Fetch schedule
    const scheduleRes = await sql`
      SELECT days_of_week FROM account_schedules 
      WHERE user_id = ${userId} AND brand_profile_id = ${brandId} AND is_active = true
      LIMIT 1
    `;
    
    if (scheduleRes.rows.length > 0) {
      const daysOfWeek: number[] = scheduleRes.rows[0].days_of_week || [1, 3, 5];
      
      // Fetch pillars for random selection
      const pillarsRes = await sql`SELECT id FROM content_pillars WHERE brand_profile_id = ${brandId}`;
      const pillars = pillarsRes.rows;
      
      if (pillars.length > 0) {
        // Generate calendar for next 14 days
        for (let i = 0; i < 14; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          const dow = date.getDay();
          
          if (daysOfWeek.includes(dow)) {
            const dateStr = date.toISOString().split('T')[0];
            
            // Check if entry already exists
            const existingRes = await sql`SELECT id FROM content_calendar WHERE brand_profile_id = ${brandId} AND planned_date = ${dateStr}`;
            
            if (existingRes.rows.length === 0) {
              const randomPillar = pillars[Math.floor(Math.random() * pillars.length)];
              const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
              const plannedPlatform = randomAccount.platform || 'twitter';
              
              await sql`
                INSERT INTO content_calendar (
                  brand_profile_id, planned_date, planned_platform, pillar_id, status, created_at, updated_at
                ) VALUES (
                  ${brandId}, ${dateStr}, ${plannedPlatform}, ${randomPillar.id}, 'planned', NOW(), NOW()
                )
              `;
            }
          }
        }
      }
    }
    // --- END POPULATE CONTENT CALENDAR ---

    // Force trigger generation for each account
    for (const account of accounts) {
      await tasks.trigger<typeof generateAccountContent>("generate-account-content", {
        accountId: account.id,
        debugMode: true // Force generate regardless of schedule
      });
    }

    return NextResponse.json({
      success: true,
      message: `Dispatched ${accounts.length} jobs to Trigger.dev.`,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Force generate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to force generate' }, { status: 500 });
  }
}
