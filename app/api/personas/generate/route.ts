import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { personaDesigner } from '@/lib/services/personaDesigner';

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
    
    const generatedPersona = await personaDesigner.design(prompt, platform);

    // Return generated data without saving - frontend will confirm to save
    return NextResponse.json({ 
      generated: generatedPersona,
      message: 'Persona designed successfully with 7-Layer DNA! Review and save.'
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating persona:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate persona' 
    }, { status: 500 });
  }
}