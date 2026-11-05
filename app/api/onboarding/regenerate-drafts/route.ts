import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { regenerateSampleDrafts } from '@/lib/services/brandAnalyzer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandProfile } = await request.json();
    if (!brandProfile) {
      return NextResponse.json({ error: 'Missing brandProfile' }, { status: 400 });
    }

    const samplePosts = await regenerateSampleDrafts(brandProfile);
    return NextResponse.json({ samplePosts });
  } catch (error: any) {
    console.error('Error regenerating drafts:', error);
    return NextResponse.json({ error: error.message || 'Failed to regenerate drafts' }, { status: 500 });
  }
}
