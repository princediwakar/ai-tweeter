import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeWebsiteDeep } from '@/lib/scraper';
import { analyzeBrandFromContent } from '@/lib/services/brandAnalyzer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    console.log(`[Magic Onboarding] Scraping ${url}...`);
    const scrapedData = await scrapeWebsiteDeep(url);

    if (!scrapedData || !scrapedData.content) {
      return NextResponse.json({ error: 'Could not extract content from the provided URL. Please try another one.' }, { status: 422 });
    }

    console.log(`[Magic Onboarding] Analyzing content via LLM...`);
    const analyzedBrand = await analyzeBrandFromContent(url, scrapedData.content);

    return NextResponse.json({ 
      brand: analyzedBrand,
      scrapedTitle: scrapedData.title 
    });
  } catch (error: any) {
    console.error('Analyze brand error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze brand' }, { status: 500 });
  }
}
