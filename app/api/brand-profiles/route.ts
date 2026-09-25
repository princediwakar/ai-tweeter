import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { brandProfileService } from '@/lib/brandEngine/BrandProfileService';
import { tasks } from '@trigger.dev/sdk/v3';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profiles = await brandProfileService.getByUser(user.id);
    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error('Error fetching brand profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { brand_name, brand_url } = body;

    if (!brand_name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const newProfile = await brandProfileService.create({
      user_id: user.id,
      brand_name,
      brand_url: brand_url || null,
      brand_voice: 'Professional yet approachable', // Default
      brand_mission: '',
      never_say: ['Synergy', 'Disrupt'],
      never_topics: ['Politics', 'Religion']
    });

    if (brand_url) {
      // Trigger the background task to crawl and enrich
      await tasks.trigger("crawl-brand-knowledge", {
        brandProfileId: newProfile.id,
        url: brand_url
      });
      
      // Update status to crawling
      await brandProfileService.update({ id: newProfile.id, onboarding_status: 'crawling' });
      newProfile.onboarding_status = 'crawling';
    }

    return NextResponse.json(newProfile);
  } catch (error: any) {
    console.error('Error creating brand profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
