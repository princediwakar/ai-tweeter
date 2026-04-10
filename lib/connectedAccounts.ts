// lib/connectedAccounts.ts - Service for connected accounts with normalized credentials
import { sql } from '@vercel/postgres';
import { sqlWithRetry } from './db';
import { encrypt, decrypt } from './security/crypto';
import type { ConnectedAccount, AccountCredential, AccountCredentialDecrypted, ConnectedAccountWithCredentials } from './types';

// Re-export types for convenience
export type { ConnectedAccount, ConnectedAccountWithCredentials, AccountCredential, AccountCredentialDecrypted };

// =============================================================================
// DATABASE ROW TYPES (matching exact DB schema)
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
}

interface AccountCredentialRow {
  id: string;
  connected_account_id: string;
  auth_type: 'oauth1' | 'oauth2' | 'api_key';
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

function mapRowToCredential(row: AccountCredentialRow): AccountCredentialDecrypted {
  return {
    id: row.id,
    connected_account_id: row.connected_account_id,
    auth_type: row.auth_type,
    access_token: decrypt(row.access_token_encrypted),
    refresh_token: decrypt(row.refresh_token_encrypted),
    token_expires_at: row.token_expires_at ? new Date(row.token_expires_at) : null,
    api_key: decrypt(row.api_key_encrypted),
    api_secret: decrypt(row.api_secret_encrypted),
    is_active: row.is_active,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
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
   * Get account with credentials (joined from account_credentials table)
   */
  async getWithCredentials(id: string): Promise<ConnectedAccountWithCredentials | null> {
    const { rows: accountRows } = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts WHERE id = ${id}
    `;
    
    if (!accountRows[0]) return null;
    
    const { rows: credentialRows } = await sqlWithRetry<AccountCredentialRow>`
      SELECT * FROM account_credentials 
      WHERE connected_account_id = ${id} AND is_active = true
    `;
    
    return {
      ...mapRowToConnectedAccount(accountRows[0]),
      credentials: credentialRows.map(mapRowToCredential),
    };
  },

  /**
   * Get active credentials for an account (for posting)
   */
  async getActiveCredentials(accountId: string): Promise<AccountCredentialDecrypted[]> {
    const { rows } = await sqlWithRetry<AccountCredentialRow>`
      SELECT * FROM account_credentials 
      WHERE connected_account_id = ${accountId} AND is_active = true
    `;
    return rows.map(mapRowToCredential);
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
    const now = new Date().toISOString();
    
    // Upsert connected_account
    const { rows: accountRows } = await sql`
      INSERT INTO connected_accounts (
        id, user_id, platform, account_username, name, platform_user_id,
        is_active, status, connected_at, updated_at
      ) VALUES (
        ${accountId}, ${data.user_id}, ${data.platform}, ${data.account_username}, 
        ${data.name || null}, ${data.platform_user_id || null},
        true, 'active', NOW(), NOW()
      )
      ON CONFLICT (user_id, platform, account_username) DO UPDATE SET
        name = EXCLUDED.name,
        platform_user_id = EXCLUDED.platform_user_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `;
    
    // Upsert credentials if provided
    const authType = data.auth_type || 'oauth2';
    if (data.access_token) {
      await sql`
        INSERT INTO account_credentials (
          connected_account_id, auth_type, access_token_encrypted, 
          refresh_token_encrypted, token_expires_at, is_active, created_at, updated_at
        ) VALUES (
          ${accountId}, ${authType}, ${encrypt(data.access_token)}, 
          ${encrypt(data.refresh_token || null)}, ${data.token_expires_at || null},
          true, NOW(), NOW()
        )
        ON CONFLICT (connected_account_id, auth_type) DO UPDATE SET
          access_token_encrypted = EXCLUDED.access_token_encrypted,
          refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
          token_expires_at = EXCLUDED.token_expires_at,
          updated_at = NOW()
      `;
    }
    
    // Return with credentials
    return this.getWithCredentials(accountId) as Promise<ConnectedAccountWithCredentials>;
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
   * Delete account (cascades to credentials)
   */
  async delete(id: string): Promise<void> {
    await sql`DELETE FROM connected_accounts WHERE id = ${id}`;
  },

  /**
   * Update tokens for an account
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
      INSERT INTO account_credentials (
        connected_account_id, auth_type, access_token_encrypted, 
        refresh_token_encrypted, token_expires_at, is_active, created_at, updated_at
      ) VALUES (
        ${accountId}, ${authType}, ${encrypt(accessToken)}, 
        ${encrypt(refreshToken)}, ${expires}, true, NOW(), NOW()
      )
      ON CONFLICT (connected_account_id, auth_type) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW()
    `;
  },

  /**
   * Add credential to an account
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
      INSERT INTO account_credentials (
        connected_account_id, auth_type, access_token_encrypted, 
        refresh_token_encrypted, token_expires_at, api_key_encrypted, api_secret_encrypted,
        is_active, created_at, updated_at
      ) VALUES (
        ${accountId}, ${authType}, 
        ${encrypt(credentials.access_token || null)}, 
        ${encrypt(credentials.refresh_token || null)}, 
        ${credentials.token_expires_at || null},
        ${encrypt(credentials.api_key || null)},
        ${encrypt(credentials.api_secret || null)},
        true, NOW(), NOW()
      )
      ON CONFLICT (connected_account_id, auth_type) DO UPDATE SET
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        api_key_encrypted = EXCLUDED.api_key_encrypted,
        api_secret_encrypted = EXCLUDED.api_secret_encrypted,
        updated_at = NOW()
    `;
  },

  /**
   * Deactivate credential
   */
  async deactivateCredential(accountId: string, authType: 'oauth1' | 'oauth2' | 'api_key'): Promise<void> {
    await sql`
      UPDATE account_credentials 
      SET is_active = false, updated_at = NOW()
      WHERE connected_account_id = ${accountId} AND auth_type = ${authType}
    `;
  },
};

// Export decrypt/encrypt utilities
export const decryptToken = decrypt;
export const encryptToken = encrypt;

export default connectedAccountsService;