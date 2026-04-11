// app/api/blog-sources/[id]/route.ts
// PATCH and DELETE for specific blog source

import { NextRequest, NextResponse } from 'next/server';
import { getSourceById, updateSource, deleteSource, type CreateBlogSourceInput } from '@/lib/blogSourceService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const source = await getSourceById(id);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    return NextResponse.json(source);
  } catch (error) {
    console.error('[API] Blog source GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Partial<CreateBlogSourceInput> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.url !== undefined) updates.url = body.url;
    if (body.feed_url !== undefined) updates.feed_url = body.feed_url;
    if (body.category !== undefined) updates.category = body.category;
    if (body.topics !== undefined) updates.topics = body.topics;

    const source = await updateSource(id, updates);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error('[API] Blog source PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const success = await deleteSource(id);
    if (!success) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Blog source DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}