// app/api/blog-sources/route.ts
// CRUD API for blog sources

import { NextRequest, NextResponse } from 'next/server';
import {
  listBlogSources,
  getSourceById,
  createSource,
  updateSource,
  deleteSource,
  getCategoriesWithCounts,
  type CreateBlogSourceInput,
} from '@/lib/blogSourceService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const category = searchParams.get('category');
  const categories = searchParams.get('categories');

  try {
    if (id) {
      const source = await getSourceById(id);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      return NextResponse.json(source);
    }

    if (categories === 'true') {
      const result = await getCategoriesWithCounts();
      return NextResponse.json(result);
    }

    const result = await listBlogSources({ category: category || undefined });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Blog sources GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    function isValidUrl(str: string): boolean {
      try { new URL(str); return true; } catch { return false; }
    }

    const input: CreateBlogSourceInput = {
      name: body.name,
      url: body.url,
      feed_url: body.feed_url,
      category: body.category,
      topics: body.topics,
    };

    if (!input.name || !input.url || !input.feed_url || !input.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, feed_url, category' },
        { status: 400 }
      );
    }

    if (!isValidUrl(input.url)) {
      return NextResponse.json({ error: 'Invalid blog URL' }, { status: 400 });
    }

    if (!isValidUrl(input.feed_url)) {
      return NextResponse.json({ error: 'Invalid feed URL' }, { status: 400 });
    }

    const source = await createSource(input);
    if (!source) {
      return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
    }

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('[API] Blog sources POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}