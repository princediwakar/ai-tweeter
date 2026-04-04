import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default';

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'`;

    await sql`
      CREATE TABLE IF NOT EXISTS connected_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(20) NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
        account_username VARCHAR(255) NOT NULL,
        account_name VARCHAR(255),
        platform_user_id VARCHAR(255),
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        connected_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP,
        UNIQUE(user_id, platform, account_username)
      )
    `;

    // Check if accounts table exists and what columns it has
    const accountsTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'accounts'
      ) as exists
    `;
    const accountsTableExists = accountsTableCheck.rows[0]?.exists || false;

    let hasTwitterHandle = false;
    let hasUserId = false;
    let hasOwnerId = false;

    if (accountsTableExists) {
      const accountColumns = await sql`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts'
      `;
      const existingCols = new Set(accountColumns.rows.map(r => r.column_name));
      
      // Build dynamic insert based on existing columns
      hasUserId = existingCols.has('user_id');
      hasOwnerId = existingCols.has('owner_id');
      hasTwitterHandle = existingCols.has('twitter_handle');
      const hasPlatformUserId = existingCols.has('platform_user_id');
      const hasAccessToken = existingCols.has('access_token_encrypted');
      const hasRefreshToken = existingCols.has('refresh_token_encrypted');
      const hasTokenExpires = existingCols.has('token_expires_at');
      const hasCreatedAt = existingCols.has('created_at');
      const hasLastUsed = existingCols.has('last_used_at');

      // Get default user ID for accounts without user mapping
      const userResult = await sql`SELECT id FROM users LIMIT 1`;
      const defaultUserId = userResult.rows[0]?.id;

      // Migrate data from accounts table to connected_accounts using available columns
      let insertSQL = `
        INSERT INTO connected_accounts (
          id, user_id, platform, account_username, account_name
      `;
      if (hasPlatformUserId) insertSQL += ', platform_user_id';
      if (hasAccessToken) insertSQL += ', access_token_encrypted';
      if (hasRefreshToken) insertSQL += ', refresh_token_encrypted';
      if (hasTokenExpires) insertSQL += ', token_expires_at';
      insertSQL += ', is_active';
      if (hasCreatedAt) insertSQL += ', connected_at';
      if (hasLastUsed) insertSQL += ', last_used_at';
      
      insertSQL += `)
        SELECT 
          a.id,
          `;
      
      // Determine user_id source based on available columns
      if (hasUserId && hasOwnerId) {
        insertSQL += `COALESCE(a.user_id, u.id)`;
      } else if (hasOwnerId) {
        insertSQL += `u.id`;
      } else if (hasUserId) {
        insertSQL += `a.user_id`;
      } else {
        insertSQL += `'${defaultUserId || 'default'}'`;
      }
      
      insertSQL += `,
          CASE 
            WHEN a.name ILIKE '%linkedin%' THEN 'linkedin'
            ELSE 'twitter'
          END,
          COALESCE(a.twitter_handle, a.name),
          a.name`;
      
      if (hasPlatformUserId) insertSQL += ', a.platform_user_id';
      if (hasAccessToken) insertSQL += ', a.access_token_encrypted';
      if (hasRefreshToken) insertSQL += ', a.refresh_token_encrypted';
      if (hasTokenExpires) insertSQL += ', a.token_expires_at';
      insertSQL += ', true';
      if (hasCreatedAt) insertSQL += ', a.created_at';
      if (hasLastUsed) insertSQL += ', a.last_used_at';
      
      // Build FROM clause based on available columns
      if (hasOwnerId) {
        insertSQL += ` FROM accounts a LEFT JOIN users u ON a.owner_id = u.id`;
      } else {
        insertSQL += ` FROM accounts a`;
      }
      
      insertSQL += ` WHERE true`;
      
      // Only add accounts that don't already exist in connected_accounts
      insertSQL += ` AND NOT EXISTS (
        SELECT 1 FROM connected_accounts ca 
        WHERE ca.account_username = COALESCE(a.twitter_handle, a.name)
      )`;

      await sql.query(insertSQL);
    }

    // Check which tables exist
    const tablesCheck = await sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('threads', 'custom_personas', 'account_schedules', 'user_accounts', 'engagement_log', 'tweets')
    `;
    const existingTables = new Set(tablesCheck.rows.map(r => r.table_name));

    if (existingTables.has('threads')) {
      await sql`ALTER TABLE threads ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL`;
    }
    if (existingTables.has('custom_personas')) {
      await sql`ALTER TABLE custom_personas ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL`;
    }
    if (existingTables.has('account_schedules')) {
      await sql`ALTER TABLE account_schedules ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL`;
    }
    if (existingTables.has('user_accounts')) {
      await sql`ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL`;
    }
    if (existingTables.has('engagement_log')) {
      await sql`ALTER TABLE engagement_log ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL`;
    }
    if (existingTables.has('tweets')) {
      await sql`ALTER TABLE tweets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE tweets ADD COLUMN IF NOT EXISTS connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE tweets ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE tweets ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL`;
    }

    // Migrate data from accounts to connected_accounts and update references
    // Map by matching account_username to twitter_handle OR name
    if (accountsTableExists && hasTwitterHandle) {
      if (existingTables.has('threads')) {
        await sql`
          UPDATE threads t
          SET connected_account_id = ca.id
          FROM accounts a
          JOIN connected_accounts ca ON ca.account_username = COALESCE(a.twitter_handle, a.name)
          WHERE t.account_id = a.id
        `;
      }
      if (existingTables.has('custom_personas')) {
        await sql`
          UPDATE custom_personas cp
          SET connected_account_id = ca.id
          FROM accounts a
          JOIN connected_accounts ca ON ca.account_username = COALESCE(a.twitter_handle, a.name)
          WHERE cp.account_id = a.id
        `;
      }
      if (existingTables.has('account_schedules')) {
        await sql`
          UPDATE account_schedules acs
          SET connected_account_id = ca.id
          FROM accounts a
          JOIN connected_accounts ca ON ca.account_username = COALESCE(a.twitter_handle, a.name)
          WHERE acs.account_id = a.id
        `;
      }
      if (existingTables.has('user_accounts')) {
        await sql`
          UPDATE user_accounts ua
          SET connected_account_id = ca.id
          FROM accounts a
          JOIN connected_accounts ca ON ca.account_username = COALESCE(a.twitter_handle, a.name)
          WHERE ua.account_id = a.id
        `;
      }
      if (existingTables.has('engagement_log')) {
        await sql`
          UPDATE engagement_log el
          SET connected_account_id = ca.id
          FROM accounts a
          JOIN connected_accounts ca ON ca.account_username = COALESCE(a.twitter_handle, a.name)
          WHERE el.account_id = a.id
        `;
      }
      if (existingTables.has('tweets')) {
        await sql`
          UPDATE tweets t
          SET connected_account_id = ca.id
          FROM accounts a
          JOIN connected_accounts ca ON ca.account_username = COALESCE(a.twitter_handle, a.name)
          WHERE t.account_id = a.id
        `;
      }
    }

    // Create indexes on new connected_account_id columns
    if (existingTables.has('threads')) {
      await sql`CREATE INDEX IF NOT EXISTS idx_threads_connected_account ON threads(connected_account_id)`;
    }
    if (existingTables.has('custom_personas')) {
      await sql`CREATE INDEX IF NOT EXISTS idx_custom_personas_connected_account ON custom_personas(connected_account_id)`;
    }
    if (existingTables.has('account_schedules')) {
      await sql`CREATE INDEX IF NOT EXISTS idx_account_schedules_connected_account ON account_schedules(connected_account_id)`;
    }
    if (existingTables.has('user_accounts')) {
      await sql`CREATE INDEX IF NOT EXISTS idx_user_accounts_connected_account ON user_accounts(connected_account_id)`;
    }
    if (existingTables.has('engagement_log')) {
      await sql`CREATE INDEX IF NOT EXISTS idx_engagement_log_connected_account ON engagement_log(connected_account_id)`;
    }

    // Drop the old accounts table (if it exists)
    await sql`DROP TABLE IF EXISTS accounts CASCADE`;

    // Drop old account_id columns that are no longer needed
    if (existingTables.has('threads')) {
      await sql`ALTER TABLE threads DROP COLUMN IF EXISTS account_id`;
    }
    if (existingTables.has('custom_personas')) {
      await sql`ALTER TABLE custom_personas DROP COLUMN IF EXISTS account_id`;
    }
    if (existingTables.has('account_schedules')) {
      await sql`ALTER TABLE account_schedules DROP COLUMN IF EXISTS account_id`;
    }
    if (existingTables.has('user_accounts')) {
      await sql`ALTER TABLE user_accounts DROP COLUMN IF EXISTS account_id`;
    }
    if (existingTables.has('engagement_log')) {
      await sql`ALTER TABLE engagement_log DROP COLUMN IF EXISTS account_id`;
    }
    if (existingTables.has('tweets')) {
      await sql`ALTER TABLE tweets DROP COLUMN IF EXISTS account_id`;
    }

    await sql`CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_personas_user ON personas(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tweets_user ON tweets(user_id)`;

    // Create oauth_states table for OAuth flow
    await sql`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR(255) PRIMARY KEY,
        code_verifier TEXT,
        user_email VARCHAR(255) NOT NULL,
        platform VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const usersCount = await sql`SELECT COUNT(*) as count FROM users`;
    const accountsCount = await sql`SELECT COUNT(*) as count FROM connected_accounts`;
    const settingsCount = await sql`SELECT COUNT(*) as count FROM platform_settings`;
    const personasCount = await sql`SELECT COUNT(*) as count FROM personas`;
    const schedulesCount = await sql`SELECT COUNT(*) as count FROM schedules`;

    return NextResponse.json({
      success: true,
      message: 'SaaS migration completed',
      counts: {
        users: usersCount.rows[0].count,
        connected_accounts: accountsCount.rows[0].count,
        platform_settings: settingsCount.rows[0].count,
        personas: personasCount.rows[0].count,
        schedules: schedulesCount.rows[0].count,
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
