// app/api/profiles/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { personaDesigner } from '@/lib/services/personaDesigner';
import { sourceDiscoverer } from '@/lib/services/sourceDiscoverer';

export const maxDuration = 60; 

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, connected_account_id, platform: platformFromBody } = await request.json();

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Please describe what kind of content you want to post (at least 10 characters)' }, { status: 400 });
    }
    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt is too long. Please keep it under 5000 characters.' }, { status: 400 });
    }

    if (!connected_account_id) {
      return NextResponse.json({ error: 'Connected account ID is required' }, { status: 400 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const accountCheck = await sql`
      SELECT id, platform, account_name FROM connected_accounts WHERE id = ${connected_account_id} AND user_id = ${userId}
    `;
    
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid connected account' }, { status: 403 });
    }

    const platform = (platformFromBody || accountCheck.rows[0].platform || 'twitter').toLowerCase() as 'twitter' | 'linkedin';
    
    console.log(`🎨 [Phase 1] Designing psychological DNA for ${platform}...`);
    const generatedPersona = await personaDesigner.design(prompt, platform);

    console.log(`🔍 [Phase 2] Discovering Trusted Domains via Tavily...`);
    const discoveredUrls = await sourceDiscoverer.discoverSources(generatedPersona);
    
    // SHIELD: Cap the maximum domains at 5 so we don't blow up extraction costs later
    const finalSources = discoveredUrls.slice(0, 5);

    // TOP-UP SAFETY NET: Ensure they always walk away with at least 3 trusted domains
    if (finalSources.length < 3) {
      console.log(`⚠️ Only ${finalSources.length} domains found. Topping up with high-signal fallbacks...`);
      const fallbacks = sourceDiscoverer.getFallbackSources(generatedPersona.topics);
      
      for (const fb of fallbacks) {
        if (finalSources.length >= 3) break; // Stop when we hit 3
        
        // Strip out the /feed or /rss from our old fallbacks to just get the base domain
        try {
          const cleanFb = new URL(fb).origin; 
          if (!finalSources.includes(cleanFb)) {
            finalSources.push(cleanFb);
          }
        } catch (e) {
          // Ignore invalid URL formatting
        }
      }
    }

    console.log(`✅ Pipeline complete: Persona wired to ${finalSources.length} Trusted Domains.`);

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