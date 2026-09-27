import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { knowledgeSourceService } from '@/lib/brandEngine/KnowledgeSourceService';
import { brandProfileService } from '@/lib/brandEngine/BrandProfileService';

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await props.params;

    // Verify ownership
    const source = await knowledgeSourceService.getById(id);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const profile = await brandProfileService.getById(source.brand_profile_id);
    if (!profile || profile.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await knowledgeSourceService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting knowledge source:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
