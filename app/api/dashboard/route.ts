import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    // 1. Get All Brand Profiles for Switcher
    const allBrandsRes = await sql`
      SELECT id, name, industry FROM brand_profiles
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    const allBrands = allBrandsRes.rows;

    let brandProfileRes;
    if (brandId) {
      brandProfileRes = await sql`
        SELECT * FROM brand_profiles
        WHERE user_id = ${userId} AND id = ${brandId}
        LIMIT 1
      `;
    } else {
      brandProfileRes = await sql`
        SELECT * FROM brand_profiles
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
    }
    const brandProfile = brandProfileRes.rows[0] || null;

    let pillars: any[] = [];
    let recentPosts: any[] = [];
    let upcomingPosts: any[] = [];
    let accounts: any[] = [];
    let schedule = null;

    if (brandProfile) {
      // 2. Get Content Pillars
      const pillarsRes = await sql`
        SELECT * FROM content_pillars
        WHERE brand_profile_id = ${brandProfile.id}
        ORDER BY proportion DESC
      `;
      pillars = pillarsRes.rows;

      // 3. Get Recent Posts
      const recentPostsRes = await sql`
        SELECT p.*, cp.name as pillar_name 
        FROM posts p
        LEFT JOIN content_pillars cp ON p.pillar_id = cp.id
        WHERE p.brand_profile_id = ${brandProfile.id} AND p.status = 'posted'
        ORDER BY p.created_at DESC
        LIMIT 5
      `;
      recentPosts = recentPostsRes.rows;

      // 4. Get Upcoming Calendar Posts
      const upcomingPostsRes = await sql`
        SELECT c.*, p.content, p.status as post_status, cp.name as pillar_name
        FROM content_calendar c
        LEFT JOIN posts p ON p.calendar_id = c.id
        LEFT JOIN content_pillars cp ON c.pillar_id = cp.id
        WHERE c.brand_profile_id = ${brandProfile.id} AND c.planned_date >= CURRENT_DATE
        ORDER BY c.planned_date ASC
        LIMIT 10
      `;
      upcomingPosts = upcomingPostsRes.rows;
      
      // 5. Get Connected Accounts & Schedules for this brand
      const accountsRes = await sql`
        SELECT * FROM connected_accounts 
        WHERE user_id = ${userId} AND (brand_profile_id = ${brandProfile.id} OR brand_profile_id IS NULL)
      `;
      accounts = accountsRes.rows;

      const schedulesRes = await sql`
        SELECT * FROM account_schedules
        WHERE user_id = ${userId} AND (brand_profile_id = ${brandProfile.id} OR brand_profile_id IS NULL)
        LIMIT 1
      `;
      schedule = schedulesRes.rows[0] || null;
    }

    return NextResponse.json({
      brandProfile,
      allBrands,
      pillars,
      recentPosts,
      upcomingPosts,
      accounts,
      schedule
    });
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}