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

    // Get the brand profile to find connected accounts
    const brandProfileRes = await sql`
      SELECT twitter_account_id, linkedin_account_id FROM brand_profiles 
      WHERE user_id = ${userId} AND id = ${brandId}
    `;
    const brandProfile = brandProfileRes.rows[0];

    if (!brandProfile) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const accountIds = [brandProfile.twitter_account_id, brandProfile.linkedin_account_id].filter(Boolean);

    if (accountIds.length === 0) {
      return NextResponse.json({ error: 'No connected accounts found for this brand' }, { status: 404 });
    }

    // Find all connected accounts for this brand
    const accountsResult = await sql`
      SELECT id, platform FROM connected_accounts 
      WHERE user_id = ${userId} AND id = ANY(${accountIds as any}) AND is_active = true
    `;
    const accounts = accountsResult.rows;

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No active connected accounts found for this brand' }, { status: 404 });
    }

    // --- POPULATE CONTENT CALENDAR ---
    // Fetch schedule
    const scheduleRes = await sql`
      SELECT days_of_week FROM account_schedules 
      WHERE user_id = ${userId} AND brand_profile_id = ${brandId} AND is_active = true
      LIMIT 1
    `;
    // Generate calendar for just the first post
    const date = new Date();
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    
    // Fetch pillars for random selection
    const pillarsRes = await sql`SELECT id FROM content_pillars WHERE brand_profile_id = ${brandId}`;
    const pillars = pillarsRes.rows;
    
    if (pillars.length > 0) {
      for (const account of accounts) {
        const plannedPlatform = account.platform || 'twitter';
        
        // Find the latest planned date for this platform
        const latestRes = await sql`
          SELECT MAX(planned_date) as max_date 
          FROM content_calendar 
          WHERE brand_profile_id = ${brandId} AND planned_platform = ${plannedPlatform}
        `;
        
        let nextDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        
        if (latestRes.rows[0]?.max_date) {
          const maxDate = new Date(latestRes.rows[0].max_date);
          const maxDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maxDate);
          
          if (maxDateStr >= nextDateStr) {
            maxDate.setDate(maxDate.getDate() + 1);
            nextDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(maxDate);
          }
        }
        
        const randomPillar = pillars[Math.floor(Math.random() * pillars.length)];
        
        await sql`
          INSERT INTO content_calendar (
            brand_profile_id, planned_date, planned_platform, pillar_id, status, created_at, updated_at
          ) VALUES (
            ${brandId}, ${nextDateStr}, ${plannedPlatform}, ${randomPillar.id}, 'planned', NOW(), NOW()
          )
        `;
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
