import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { personaService } from '@/lib/personaService';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get connected accounts for the user
    const connectedAccounts = await sql`
      SELECT id FROM connected_accounts WHERE user_id = ${userId}
    `;
    const accountIds: string[] = connectedAccounts.rows.map(row => row.id);

    if (accountIds.length === 0) {
      return NextResponse.json({ personas: [] });
    }

    // Fetch personas for these accounts using a different approach
    const placeholders = accountIds.map((_, i) => `$${i + 1}`).join(', ');
    const query = `SELECT * FROM personas WHERE connected_account_id IN (${placeholders}) ORDER BY created_at DESC`;
    const personas = await sql.query(query, accountIds);

    return NextResponse.json({ personas: personas.rows });
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Failed to fetch personas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      connected_account_id,
      name,
      description,
      rss_sources,
      config,
      min_length,
      max_length,
      tone,
      topics,
      is_active,
      is_default
    } = body;

    // Sanitize inputs to fit database constraints
    const sanitizedName = name ? String(name).slice(0, 255) : '';
    const sanitizedTone = tone ? String(tone).slice(0, 50) : undefined;
    const sanitizedTopics = Array.isArray(topics) ? topics.map((t: string) => String(t).slice(0, 100)).slice(0, 20) : undefined;

    if (!sanitizedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!connected_account_id) {
      return NextResponse.json({ error: 'Connected account ID is required' }, { status: 400 });
    }

    // Verify that the connected account belongs to the user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const accountCheck = await sql`
      SELECT id FROM connected_accounts WHERE id = ${connected_account_id} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid connected account' }, { status: 403 });
    }

    const persona = await personaService.createPersona({
      connected_account_id,
      name: sanitizedName,
      description,
      rss_sources,
      config,
      min_length,
      max_length,
      tone: sanitizedTone,
      topics: sanitizedTopics,
      is_active,
      is_default
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Failed to create persona' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      connected_account_id,
      name,
      description,
      rss_sources,
      config,
      min_length,
      max_length,
      tone,
      topics,
      is_active,
      is_default
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Persona ID required' }, { status: 400 });
    }

    // Verify the persona belongs to a connected account owned by the user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const personaCheck = await sql`
      SELECT p.id FROM personas p
      INNER JOIN connected_accounts ca ON p.connected_account_id = ca.id
      WHERE p.id = ${id} AND ca.user_id = ${userId}
    `;
    if (personaCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Persona not found or access denied' }, { status: 403 });
    }

    // If changing connected_account_id, verify the new account belongs to user
    if (connected_account_id) {
      const accountCheck = await sql`
        SELECT id FROM connected_accounts WHERE id = ${connected_account_id} AND user_id = ${userId}
      `;
      if (accountCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid connected account' }, { status: 403 });
      }
    }

    // Sanitize inputs
    const sanitizedName = name ? String(name).slice(0, 255) : undefined;
    const sanitizedTone = tone ? String(tone).slice(0, 50) : undefined;
    const sanitizedTopics = Array.isArray(topics) ? topics.map((t: string) => String(t).slice(0, 100)).slice(0, 20) : undefined;

    const updatedPersona = await personaService.updatePersona({
      id,
      connected_account_id,
      name: sanitizedName,
      description,
      rss_sources,
      config,
      min_length,
      max_length,
      tone: sanitizedTone,
      topics: sanitizedTopics,
      is_active,
      is_default
    });

    if (!updatedPersona) {
      return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
    }

    return NextResponse.json({ persona: updatedPersona });
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('id');

    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID required' }, { status: 400 });
    }

    // Verify the persona belongs to a connected account owned by the user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const personaCheck = await sql`
      SELECT p.id FROM personas p
      INNER JOIN connected_accounts ca ON p.connected_account_id = ca.id
      WHERE p.id = ${personaId} AND ca.user_id = ${userId}
    `;
    if (personaCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Persona not found or access denied' }, { status: 403 });
    }

    await personaService.deletePersona(personaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 });
  }
}