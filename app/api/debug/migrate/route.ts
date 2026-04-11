import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    // Add user_id column to personas if it doesn't exist
    await sql`
      ALTER TABLE personas ADD COLUMN IF NOT EXISTS user_id UUID
    `;

    // Add persona_id column to account_schedules if it doesn't exist  
    await sql`
      ALTER TABLE account_schedules ADD COLUMN IF NOT EXISTS persona_id UUID
    `;

    return NextResponse.json({ success: true, message: 'Migration complete' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}