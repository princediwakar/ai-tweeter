// app/api/onboarding/generate-personas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sql } from '@vercel/postgres';
import { authOptions } from '@/lib/auth';
import { generatePersona } from '@/lib/personaGeneration';
import { connectedAccountsService } from '@/lib/connectedAccounts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { prompt, connectedAccountId, platform, regenerationCount } = body;

    if (!connectedAccountId || !platform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const account = await connectedAccountsService.getById(connectedAccountId);
    if (!account || account.user_id !== userId) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 403 });
    }

    const personaResult = await generatePersona({
      prompt: prompt || '',
      connectedAccountId,
      platform: platform as 'twitter' | 'linkedin',
      regenerationCount: regenerationCount || 0,
    });

    return NextResponse.json({ persona: personaResult });
  } catch (error) {
    console.error('Generate personas error:', error);
    return NextResponse.json({ error: 'Failed to generate personas' }, { status: 500 });
  }
}
