import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';
import { AnalyzedBrand } from '@/lib/services/brandAnalyzer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { brandProfile, sourceUrl }: { brandProfile: AnalyzedBrand, sourceUrl: string } = await request.json();

    if (!brandProfile || !brandProfile.name) {
      return NextResponse.json({ error: 'Invalid brand profile' }, { status: 400 });
    }

    // Insert brand_profile
    const brandProfileRes = await sql`
      INSERT INTO brand_profiles (user_id, name, description, industry, tone_of_voice, target_audience, core_values, created_at, updated_at)
      VALUES (
        ${userId}, 
        ${brandProfile.name}, 
        ${brandProfile.description}, 
        ${brandProfile.archetype}, 
        ${JSON.stringify(brandProfile.tone_of_voice)}, 
        ${JSON.stringify(brandProfile.target_audience)}, 
        ${JSON.stringify(brandProfile.core_values)}, 
        NOW(), NOW()
      )
      RETURNING id
    `;
    const brandProfileId = brandProfileRes.rows[0].id;

    // Insert content_pillars
    if (brandProfile.pillars && brandProfile.pillars.length > 0) {
      for (const pillar of brandProfile.pillars) {
        await sql`
          INSERT INTO content_pillars (brand_profile_id, name, description, keywords, proportion, created_at, updated_at)
          VALUES (
            ${brandProfileId}, 
            ${pillar.name}, 
            ${pillar.description}, 
            ${JSON.stringify(pillar.keywords)}, 
            ${pillar.proportion}, 
            NOW(), NOW()
          )
        `;
      }
    }

    // Insert source into blog_sources so we have it for future scraping
    if (sourceUrl) {
      await sql`
        INSERT INTO blog_sources (user_id, name, url, source_type, is_active, created_at, updated_at)
        VALUES (${userId}, 'Primary Scrape Source', ${sourceUrl}, 'website', true, NOW(), NOW())
      `;
    }

    return NextResponse.json({ success: true, brandProfileId });
  } catch (error: any) {
    console.error('Finalize brand error:', error);
    return NextResponse.json({ error: error.message || 'Failed to finalize brand' }, { status: 500 });
  }
}
