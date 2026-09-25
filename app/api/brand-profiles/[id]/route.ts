import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { brandProfileService } from '@/lib/brandEngine/BrandProfileService';
import { knowledgeSourceService } from '@/lib/brandEngine/KnowledgeSourceService';
import { contentPillarService } from '@/lib/brandEngine/ContentPillarService';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await brandProfileService.getById(params.id);
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (profile.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch related entities
    const [sources, pillars, arcs] = await Promise.all([
      knowledgeSourceService.getByBrandProfile(profile.id),
      contentPillarService.getByBrandProfile(profile.id),
      sql`SELECT * FROM narrative_arcs WHERE brand_profile_id = ${profile.id} ORDER BY created_at DESC LIMIT 5`
    ]);

    return NextResponse.json({
      ...profile,
      sources,
      pillars,
      arcs: arcs.rows
    });
  } catch (error: any) {
    console.error('Error fetching brand profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await brandProfileService.getById(params.id);
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (profile.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    // Only allow updating safe fields
    const safeUpdates = {
      brand_name: body.brand_name,
      brand_voice: body.brand_voice,
      brand_mission: body.brand_mission,
      never_say: body.never_say,
      never_topics: body.never_topics,
      connected_account_id: body.connected_account_id
    };

    // Filter out undefined
    const updates = Object.fromEntries(Object.entries(safeUpdates).filter(([_, v]) => v !== undefined));

    if (Object.keys(updates).length > 0) {
      await brandProfileService.update({ id: profile.id, ...updates });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating brand profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await brandProfileService.getById(params.id);
    if (!profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (profile.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await sql`DELETE FROM brand_profiles WHERE id = ${params.id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting brand profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
