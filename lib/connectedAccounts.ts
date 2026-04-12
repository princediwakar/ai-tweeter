// lib/connectedAccounts.ts - Service for connected accounts (credentials merged into main table)
import { sql } from '@vercel/postgres';
import { sqlWithRetry } from './db';
import { encrypt, decrypt } from './security/crypto';
import type { ConnectedAccount, ConnectedAccountWithCredentials } from './types';

// Re-export types for convenience
export type { ConnectedAccount, ConnectedAccountWithCredentials };

// =============================================================================
// DATABASE ROW TYPES (matching exact DB schema - now includes credentials)
// =============================================================================

interface ConnectedAccountRow {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  name: string | null;
  platform_user_id: string | null;
  is_active: boolean;
  status: string;
  connected_at: string | null;
  updated_at: string | null;
  // Credential columns (merged from account_credentials)
  auth_type: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

function mapRowToConnectedAccount(row: ConnectedAccountRow): ConnectedAccount {
  return {
    id: row.id,
    user_id: row.user_id,
    platform: row.platform,
    account_username: row.account_username,
    name: row.name,
    platform_user_id: row.platform_user_id,
    is_active: row.is_active,
    status: row.status,
    connected_at: row.connected_at ? new Date(row.connected_at) : null,
    updated_at: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function mapRowToCredentials(row: ConnectedAccountRow): ConnectedAccountWithCredentials {
  return {
    ...mapRowToConnectedAccount(row),
    credentials: [{
      id: row.id,
      connected_account_id: row.id,
      auth_type: (row.auth_type as 'oauth1' | 'oauth2' | 'api_key') || 'oauth2',
      access_token: row.access_token_encrypted ? decrypt(row.access_token_encrypted) : null,
      refresh_token: row.refresh_token_encrypted ? decrypt(row.refresh_token_encrypted) : null,
      token_expires_at: row.token_expires_at ? new Date(row.token_expires_at) : null,
      api_key: row.api_key_encrypted ? decrypt(row.api_key_encrypted) : null,
      api_secret: row.api_secret_encrypted ? decrypt(row.api_secret_encrypted) : null,
      is_active: row.is_active,
      created_at: row.connected_at ? new Date(row.connected_at) : new Date(),
      updated_at: row.updated_at ? new Date(row.updated_at) : new Date(),
    }],
  };
}

// =============================================================================
// SERVICE METHODS
// =============================================================================

export const connectedAccountsService = {
  /**
   * Get account by Twitter handle
   */
  async getByTwitterHandle(twitterHandle: string): Promise<ConnectedAccount | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE account_username = ${twitterHandle} LIMIT 1
    `;
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  /**
   * Get account with credentials (from merged columns)
   */
  async getWithCredentials(id: string): Promise<ConnectedAccountWithCredentials | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts WHERE id = ${id}
    `;
    
    if (!rows[0]) return null;
    
    // Only return credentials if they exist
    if (!rows[0].access_token_encrypted) {
      return mapRowToConnectedAccount(rows[0]) as ConnectedAccountWithCredentials;
    }
    
    return mapRowToCredentials(rows[0]);
  },

  /**
   * Get active credentials for an account (for posting)
   */
  async getActiveCredentials(accountId: string): Promise<ConnectedAccountWithCredentials['credentials']> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE id = ${accountId} AND is_active = true
    `;
    
    if (!rows[0]?.access_token_encrypted) return [];
    
    return [{
      id: rows[0].id,
      connected_account_id: rows[0].id,
      auth_type: (rows[0].auth_type as 'oauth1' | 'oauth2' | 'api_key') || 'oauth2',
      access_token: decrypt(rows[0].access_token_encrypted),
      refresh_token: rows[0].refresh_token_encrypted ? decrypt(rows[0].refresh_token_encrypted) : null,
      token_expires_at: rows[0].token_expires_at ? new Date(rows[0].token_expires_at) : null,
      api_key: rows[0].api_key_encrypted ? decrypt(rows[0].api_key_encrypted) : null,
      api_secret: rows[0].api_secret_encrypted ? decrypt(rows[0].api_secret_encrypted) : null,
      is_active: rows[0].is_active,
      created_at: rows[0].connected_at ? new Date(rows[0].connected_at) : new Date(),
      updated_at: rows[0].updated_at ? new Date(rows[0].updated_at) : new Date(),
    }];
  },

  /**
   * Create or update account with credentials
   */
  async upsert(data: {
    id?: string;
    user_id: string;
    platform: 'twitter' | 'linkedin';
    account_username: string;
    name?: string;
    platform_user_id?: string;
    access_token?: string;
    refresh_token?: string;
    token_expires_at?: string;
    auth_type?: 'oauth1' | 'oauth2' | 'api_key';
  }): Promise<ConnectedAccountWithCredentials> {
    const accountId = data.id || crypto.randomUUID();
    const authType = data.auth_type || 'oauth2';
    
    // Upsert connected_account with credentials in single query
    const { rows } = await sql`
      INSERT INTO connected_accounts (
        id, user_id, platform, account_username, name, platform_user_id,
        is_active, status, connected_at, updated_at,
        auth_type, access_token_encrypted, refresh_token_encrypted, token_expires_at
      ) VALUES (
        ${accountId}, ${data.user_id}, ${data.platform}, ${data.account_username}, 
        ${data.name || null}, ${data.platform_user_id || null},
        true, 'active', NOW(), NOW(),
        ${authType}, ${data.access_token ? encrypt(data.access_token) : null}, 
        ${data.refresh_token ? encrypt(data.refresh_token) : null}, ${data.token_expires_at || null}
      )
      ON CONFLICT (user_id, platform, account_username) DO UPDATE SET
        name = EXCLUDED.name,
        platform_user_id = EXCLUDED.platform_user_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW(),
        auth_type = EXCLUDED.auth_type,
        access_token_encrypted = COALESCE(EXCLUDED.access_token_encrypted, connected_accounts.access_token_encrypted),
        refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, connected_accounts.refresh_token_encrypted),
        token_expires_at = COALESCE(EXCLUDED.token_expires_at, connected_accounts.token_expires_at)
      RETURNING *
    `;
    
    return mapRowToCredentials(rows[0] as ConnectedAccountRow);
  },

  /**
   * Get account for user
   */
  async getForUser(userId: string, accountId: string): Promise<ConnectedAccount | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE user_id = ${userId} AND id = ${accountId}
    `;
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  /**
   * Get all accounts for user
   */
  async getByUserId(userId: string): Promise<ConnectedAccount[]> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts WHERE user_id = ${userId}
    `;
    return rows.map(mapRowToConnectedAccount);
  },

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<ConnectedAccount | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts WHERE id = ${id}
    `;
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  /**
   * Get account with credentials by ID
   */
  async getByIdWithCredentials(id: string): Promise<ConnectedAccountWithCredentials | null> {
    return this.getWithCredentials(id);
  },

  /**
   * Create new account (without credentials)
   */
  async create(data: {
    id?: string;
    user_id: string;
    platform: 'twitter' | 'linkedin';
    account_username: string;
    name?: string;
    access_token?: string;
  }): Promise<ConnectedAccount> {
    const id = data.id || crypto.randomUUID();
    
    const { rows } = await sql`
      INSERT INTO connected_accounts (
        id, user_id, platform, account_username, name,
        is_active, status, connected_at, updated_at
      ) VALUES (
        ${id}, ${data.user_id}, ${data.platform}, ${data.account_username}, ${data.name || null},
        true, 'active', NOW(), NOW()
      ) RETURNING *
    `;
    
    return mapRowToConnectedAccount(rows[0] as ConnectedAccountRow);
  },

  /**
   * Update account fields
   */
  async update(id: string, data: Partial<ConnectedAccount>): Promise<ConnectedAccount | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'status', 'is_active', 'platform_user_id'];
    for (const field of allowedFields) {
      if (data[field as keyof ConnectedAccount] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(data[field as keyof ConnectedAccount]);
      }
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const query = `UPDATE connected_accounts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await sqlWithRetry.query<ConnectedAccountRow>(query, values);
    
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  /**
   * Delete account (no more cascade to credentials table)
   */
  async delete(id: string): Promise<void> {
    await sql`DELETE FROM generation_slots WHERE connected_account_id = ${id}`;
    await sql`DELETE FROM account_schedules WHERE connected_account_id = ${id}`;
    await sql`DELETE FROM connected_accounts WHERE id = ${id}`;
  },

  /**
   * Update tokens for an account (merged into connected_accounts)
   */
  async updateToken(
    accountId: string, 
    accessToken: string, 
    refreshToken: string | null, 
    expiresAt: Date | string,
    authType: 'oauth1' | 'oauth2' | 'api_key' = 'oauth2'
  ): Promise<void> {
    const expires = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();
    
    await sql`
      UPDATE connected_accounts SET
        auth_type = ${authType},
        access_token_encrypted = ${encrypt(accessToken)},
        refresh_token_encrypted = ${encrypt(refreshToken)},
        token_expires_at = ${expires},
        updated_at = NOW()
      WHERE id = ${accountId}
    `;
  },

  /**
   * Add/update credential for an account (merged into connected_accounts)
   */
  async addCredential(
    accountId: string,
    authType: 'oauth1' | 'oauth2' | 'api_key',
    credentials: {
      access_token?: string;
      refresh_token?: string;
      token_expires_at?: string;
      api_key?: string;
      api_secret?: string;
    }
  ): Promise<void> {
    await sql`
      UPDATE connected_accounts SET
        auth_type = ${authType},
        access_token_encrypted = ${encrypt(credentials.access_token || null)},
        refresh_token_encrypted = ${encrypt(credentials.refresh_token || null)},
        token_expires_at = ${credentials.token_expires_at || null},
        api_key_encrypted = ${encrypt(credentials.api_key || null)},
        api_secret_encrypted = ${encrypt(credentials.api_secret || null)},
        updated_at = NOW()
      WHERE id = ${accountId}
    `;
  },

  /**
   * Deactivate credential (set is_active to false)
   */
  async deactivateCredential(accountId: string): Promise<void> {
    await sql`
      UPDATE connected_accounts 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${accountId}
    `;
  },
};

// Export decrypt/encrypt utilities
export const decryptToken = decrypt;
export const encryptToken = encrypt;

export default connectedAccountsService;