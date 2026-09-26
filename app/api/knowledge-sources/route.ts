import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { knowledgeSourceService } from '@/lib/brandEngine/KnowledgeSourceService';
import { brandProfileService } from '@/lib/brandEngine/BrandProfileService';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { brand_profile_id, url } = body;

    if (!brand_profile_id || !url) {
      return NextResponse.json({ error: 'Missing brand_profile_id or url' }, { status: 400 });
    }

    // Verify ownership
    const profile = await brandProfileService.getById(brand_profile_id);
    if (!profile || profile.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const source = await knowledgeSourceService.create({
      brand_profile_id,
      url,
      source_type: 'website', // Default for now
    });

    // Automatically trigger scraping for the new source
    const { tasks } = await import("@trigger.dev/sdk");
    await tasks.trigger("crawl-brand-knowledge", {
      brandProfileId: brand_profile_id,
      // We don't need to pass url since we just created it above, but we can pass it just in case
      // wait, crawlBrandKnowledge creates the source if url is passed.
      // So let's NOT pass url, just brandProfileId to scrape pending sources.
    });

    return NextResponse.json({ success: true, source });
  } catch (error: any) {
    console.error('Error creating knowledge source:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
