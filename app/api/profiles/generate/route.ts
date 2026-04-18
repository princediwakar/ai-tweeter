// app/api/profiles/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { personaDesigner } from '@/lib/services/personaDesigner';
import { sourceDiscoverer } from '@/lib/services/sourceDiscoverer';
import { PREDEFINED_PERSONAS } from '@/lib/predefinedPersonas';

export const maxDuration = 60; 

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, connected_account_id, platform: platformFromBody, predefined_key, include_rss = false } = await request.json();

    if (!predefined_key && (!prompt || prompt.trim().length < 10)) {
      return NextResponse.json({ error: 'Please describe what kind of content you want to post (at least 10 characters)' }, { status: 400 });
    }
    if (prompt && prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt is too long. Please keep it under 5000 characters.' }, { status: 400 });
    }

    if (!connected_account_id) {
      return NextResponse.json({ error: 'Connected account ID is required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const accountCheck = await sql`
      SELECT id, platform, account_username FROM connected_accounts WHERE id = ${connected_account_id} AND user_id = ${userId}
    `;
    
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid connected account' }, { status: 403 });
    }

    const platform = (platformFromBody || accountCheck.rows[0].platform || 'twitter').toLowerCase() as 'twitter' | 'linkedin';

    if (predefined_key && PREDEFINED_PERSONAS[predefined_key]) {
      console.log(`✨ [Persona Generation] Using predefined persona: ${predefined_key}`);
      const preset = PREDEFINED_PERSONAS[predefined_key];
      return NextResponse.json({
        generated: {
          ...preset,
          min_length: platform === "linkedin" ? 600 : 140,
          max_length: platform === "linkedin" ? 2200 : 280,
        },
        message: `Using predefined persona template.`
      }, { status: 200 });
    }
    
    console.log(`🎨 [Phase 1] Designing psychological DNA for ${platform}...`);
    const generatedPersona = await personaDesigner.design(prompt || '', platform);

    let finalSources: string[] = [];
    if (include_rss) {
      console.log(`🔍 [Phase 2] Discovering RSS sources from curated blog_sources...`);
      const discoveredUrls = await sourceDiscoverer.discoverSources(generatedPersona);
      
      // SHIELD: Cap the maximum domains at 5 so we don't blow up extraction costs later
      finalSources = discoveredUrls.slice(0, 5);

      if (finalSources.length === 0) {
        console.log(`⚠️ No RSS sources found for this persona. Consider adding more sources to blog_sources table.`);
      }

      console.log(`✅ Pipeline complete: Persona wired to ${finalSources.length} RSS sources.`);
    } else {
      console.log(`✅ Pipeline complete: Skipping RSS discovery as requested.`);
    }

    // Return generated data 
    // NOTE: We keep using the 'rss_sources' key in the JSON so we don't break your database schema
    return NextResponse.json({ 
      generated: {
        ...generatedPersona,
        rss_sources: finalSources,
      },
      message: `Persona designed and wired to ${finalSources.length} trusted domains.`
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating persona:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate persona' 
    }, { status: 500 });
  }
}