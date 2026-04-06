// app/api/personas/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { personaDesigner } from '@/lib/services/personaDesigner';
import { autoVerifyAndFilterRss, suggestRssSources } from '@/lib/services/rssVerifier';

// CRITICAL: Prevent Vercel from killing this function during slow AI/RSS network calls.
// Maximum allowed for Pro tier is 300 (5 mins), Hobby is 10. Adjust based on your Vercel plan.
export const maxDuration = 60; 

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, connected_account_id, platform: platformFromBody, verifyRss = true } = await request.json();

    // RUTHLESS VALIDATION: Protect your AI token usage
    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Please describe what kind of content you want to post (at least 10 characters)' }, { status: 400 });
    }
    if (prompt.length > 2000) {
      return NextResponse.json({ error: 'Prompt is too long. Please keep it under 2000 characters.' }, { status: 400 });
    }

    if (!connected_account_id) {
      return NextResponse.json({ error: 'Connected account ID is required' }, { status: 400 });
    }

    // Verify the connected account belongs to the user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const accountCheck = await sql`
      SELECT id, platform, account_name FROM connected_accounts WHERE id = ${connected_account_id} AND user_id = ${userId}
    `;
    
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid connected account' }, { status: 403 });
    }

    const platform = (platformFromBody || accountCheck.rows[0].platform || 'twitter').toLowerCase() as 'twitter' | 'linkedin';
    
    console.log(`🎨 Designing new 7-layer persona for ${platform} based on prompt: "${prompt.substring(0, 50)}..."`);
    
    // Step 1: AI designs persona
    let generatedPersona = await personaDesigner.design(prompt, platform);

    // Step 2: Auto-verify RSS sources and handle fallbacks correctly
    let rssVerification: { valid: string[]; invalid: { url: string; error: string }[] } = { valid: [], invalid: [] };
    let finalRssSources: string[] = generatedPersona.rss_sources || [];

    if (verifyRss) {
      // If AI gave us sources, try verifying them first
      if (finalRssSources.length > 0) {
        console.log(`🔍 Verifying ${finalRssSources.length} RSS sources from AI...`);
        rssVerification = await autoVerifyAndFilterRss(finalRssSources);
        finalRssSources = rssVerification.valid;
      }

      // FIXED LOGIC TRAP: If AI gave 0 sources initially, OR if all AI sources failed verification
      if (finalRssSources.length === 0) {
        const suggestions = suggestRssSources(prompt);
        console.log(`🔍 No valid RSS found yet. Got ${suggestions.length} suggestions from knowledge base.`);
        
        if (suggestions.length > 0) {
          // Verify the fallback suggestions
          const fallbackVerification = await autoVerifyAndFilterRss(suggestions);
          finalRssSources = fallbackVerification.valid;
          
          // Append fallback invalid results to the overall verification object for transparency
          rssVerification.invalid = [...rssVerification.invalid, ...fallbackVerification.invalid];
        }
      }
      
      console.log(`✅ RSS verification complete: ${finalRssSources.length} valid, ${rssVerification.invalid.length} invalid`);
    }

    // Return generated data with verified RSS
    return NextResponse.json({ 
      generated: {
        ...generatedPersona,
        rss_sources: finalRssSources,
      },
      rssVerification,
      message: finalRssSources.length > 0 
        ? `Persona designed with ${finalRssSources.length} verified RSS sources!`
        : 'Persona designed. Note: No valid RSS sources found - please add manually.'
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating persona:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate persona' 
    }, { status: 500 });
  }
}