import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { sqlWithRetry } from './db';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-key-change-me';

// --- TOKEN CACHING (Performance for high-frequency decryption) ---
interface TokenCacheEntry {
  decrypted: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; 
const MAX_CACHE_SIZE = 100;

function getCachedToken(key: string): string | null {
  const entry = tokenCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) tokenCache.delete(key);
    return null;
  }
  return entry.decrypted;
}

function setCachedToken(key: string, decrypted: string): void {
  if (tokenCache.size >= MAX_CACHE_SIZE) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey) tokenCache.delete(firstKey);
  }
  tokenCache.set(key, { decrypted, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
}

// --- ENCRYPTION ENGINE ---
export function encrypt(text: string | null): string | null {
  if (!text) return null;
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string | null): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText || '';
  try {
    const cacheKey = `decrypt:${encryptedText.substring(0, 50)}`;
    const cached = getCachedToken(cacheKey);
    if (cached) return cached;

    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    setCachedToken(cacheKey, decrypted);
    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
}

// --- TYPES ---
export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  twitter_handle?: string | null;
  name: string | null;
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  last_used_at: string | null;
  // Twitter Legacy (v1.1)
  twitter_api_key?: string | null;
  twitter_api_secret?: string | null;
  twitter_access_token?: string | null;
  twitter_access_token_secret?: string | null;
  // Cloudinary (Image handling)
  cloudinary_cloud_name?: string | null;
  cloudinary_api_key?: string | null;
  cloudinary_api_secret?: string | null;
  // LinkedIn / Twitter OAuth 2.0 Specifics
  linkedin_enabled?: boolean;
  linkedin_user_id?: string | null;
  linkedin_access_token?: string | null;
  linkedin_refresh_token?: string | null;
  linkedin_org_id?: string | null;
  linkedin_token_expires_at?: string | null;
  twitter_oauth2_enabled?: boolean;
  personas?: string[];
  branding?: Record<string, any>;
  profile_image_url?: string | null;
}

// Internal Database Row Mapping
interface ConnectedAccountRow {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  account_name: string | null;
  name: string | null;
  platform_user_id: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  status: string;
  connected_at: string | null;
  updated_at: string | null;
  last_used_at: string | null;
  twitter_api_key_encrypted: string | null;
  twitter_api_secret_encrypted: string | null;
  twitter_access_token_encrypted: string | null;
  twitter_access_token_secret_encrypted: string | null;
  cloudinary_cloud_name_encrypted: string | null;
  cloudinary_api_key_encrypted: string | null;
  cloudinary_api_secret_encrypted: string | null;
  linkedin_enabled: boolean;
  linkedin_user_id: string | null;
  linkedin_access_token: string | null;
  linkedin_refresh_token: string | null;
  linkedin_org_id: string | null;
  linkedin_token_expires_at: string | null;
  twitter_oauth2_enabled: boolean;
  personas: string[];
  branding: any;
  profile_image_url: string | null;
}

function mapRowToConnectedAccount(row: ConnectedAccountRow): ConnectedAccount {
  return {
    id: row.id,
    user_id: row.user_id,
    platform: row.platform,
    account_username: row.account_username,
    name: row.name || row.account_name,
    platform_user_id: row.platform_user_id,
    access_token: decrypt(row.access_token_encrypted),
    refresh_token: decrypt(row.refresh_token_encrypted),
    token_expires_at: row.token_expires_at,
    is_active: row.is_active,
    status: row.status,
    created_at: row.connected_at,
    updated_at: row.updated_at,
    last_used_at: row.last_used_at,
    // Twitter Legacy
    twitter_api_key: decrypt(row.twitter_api_key_encrypted),
    twitter_api_secret: decrypt(row.twitter_api_secret_encrypted),
    twitter_access_token: decrypt(row.twitter_access_token_encrypted),
    twitter_access_token_secret: decrypt(row.twitter_access_token_secret_encrypted),
    // Cloudinary
    cloudinary_cloud_name: decrypt(row.cloudinary_cloud_name_encrypted),
    cloudinary_api_key: decrypt(row.cloudinary_api_key_encrypted),
    cloudinary_api_secret: decrypt(row.cloudinary_api_secret_encrypted),
    // Platform features
    linkedin_enabled: row.linkedin_enabled,
    linkedin_user_id: decrypt(row.linkedin_user_id),
    linkedin_access_token: decrypt(row.linkedin_access_token),
    linkedin_refresh_token: decrypt(row.linkedin_refresh_token),
    linkedin_org_id: row.linkedin_org_id,
    linkedin_token_expires_at: row.linkedin_token_expires_at,
    twitter_oauth2_enabled: row.twitter_oauth2_enabled,
    personas: row.personas || [],
    branding: row.branding || {},
    profile_image_url: row.profile_image_url,
  };
}

// --- SERVICE METHODS ---
export const connectedAccountsService = {
  async getByTwitterHandle(twitterHandle: string): Promise<ConnectedAccount | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`SELECT * FROM connected_accounts WHERE account_username = ${twitterHandle} LIMIT 1`;
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  async upsert(data: Partial<ConnectedAccountRow> & { access_token?: string; refresh_token?: string }): Promise<ConnectedAccount> {
    const id = data.id || crypto.randomUUID();
    const { rows } = await sql`
      INSERT INTO connected_accounts (
        id, user_id, platform, account_username, name, platform_user_id,
        access_token_encrypted, refresh_token_encrypted, token_expires_at,
        status, is_active, connected_at, updated_at, linkedin_enabled, twitter_oauth2_enabled, linkedin_org_id
      ) VALUES (
        ${id}, ${data.user_id}, ${data.platform}, ${data.account_username}, ${data.name}, ${data.platform_user_id},
        ${encrypt(data.access_token || null)}, ${encrypt(data.refresh_token || null)}, ${data.token_expires_at},
        ${data.status || 'active'}, true, NOW(), NOW(), ${data.linkedin_enabled || false}, ${data.twitter_oauth2_enabled || false}, ${data.linkedin_org_id || null}
      )
      ON CONFLICT (user_id, platform, account_username) DO UPDATE SET
        name = EXCLUDED.name,
        platform_user_id = EXCLUDED.platform_user_id,
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `;
    return mapRowToConnectedAccount(rows[0] as ConnectedAccountRow);
  },

  async getForUser(userId: string, accountId: string): Promise<ConnectedAccount | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`SELECT * FROM connected_accounts WHERE user_id = ${userId} AND id = ${accountId}`;
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  async getByUserId(userId: string): Promise<ConnectedAccount[]> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`SELECT * FROM connected_accounts WHERE user_id = ${userId}`;
    return rows.map(mapRowToConnectedAccount);
  },

  async getById(id: string): Promise<ConnectedAccount | null> {
    return this.getAccount(id);
  },

  async getAccount(id: string): Promise<ConnectedAccount | null> {
    const { rows } = await sqlWithRetry<ConnectedAccountRow>`SELECT * FROM connected_accounts WHERE id = ${id}`;
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  async create(data: Partial<ConnectedAccountRow> & { access_token?: string }): Promise<ConnectedAccount> {
    const id = data.id || crypto.randomUUID();
    const { rows } = await sql`
      INSERT INTO connected_accounts (
        id, user_id, platform, account_username, name, 
        access_token_encrypted, status, is_active, connected_at, updated_at
      ) VALUES (
        ${id}, ${data.user_id}, ${data.platform}, ${data.account_username}, ${data.name},
        ${encrypt(data.access_token || null)}, ${data.status || 'active'}, true, NOW(), NOW()
      ) RETURNING *
    `;
    return mapRowToConnectedAccount(rows[0] as ConnectedAccountRow);
  },

  async update(id: string, data: any): Promise<ConnectedAccount | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Direct mapping for unencrypted fields
    const plainFields = ['name', 'status', 'is_active', 'profile_image_url', 'token_expires_at', 'linkedin_enabled', 'twitter_oauth2_enabled', 'linkedin_org_id'];
    for (const field of plainFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    // Encrypted field mapping
    const secretFields: Record<string, string> = {
      access_token: 'access_token_encrypted',
      refresh_token: 'refresh_token_encrypted',
      twitter_api_key: 'twitter_api_key_encrypted',
      twitter_api_secret: 'twitter_api_secret_encrypted',
      twitter_access_token: 'twitter_access_token_encrypted',
      twitter_access_token_secret: 'twitter_access_token_secret_encrypted',
      cloudinary_cloud_name: 'cloudinary_cloud_name_encrypted',
      cloudinary_api_key: 'cloudinary_api_key_encrypted',
      cloudinary_api_secret: 'cloudinary_api_secret_encrypted'
    };

    for (const [key, column] of Object.entries(secretFields)) {
      if (data[key] !== undefined) {
        updates.push(`${column} = $${paramIndex++}`);
        values.push(encrypt(data[key]));
      }
    }

    if (updates.length === 0) return this.getAccount(id);

    values.push(id);
    const query = `UPDATE connected_accounts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await sqlWithRetry.query<ConnectedAccountRow>(query, values);
    
    return rows[0] ? mapRowToConnectedAccount(rows[0]) : null;
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM connected_accounts WHERE id = ${id}`;
  },

  async updateToken(id: string, accessToken: string, refreshToken: string | null, expiresAt: Date | string): Promise<void> {
    const expires = typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString();
    await sql`
      UPDATE connected_accounts 
      SET access_token_encrypted = ${encrypt(accessToken)},
          refresh_token_encrypted = ${encrypt(refreshToken)},
          token_expires_at = ${expires},
          last_used_at = NOW(),
          updated_at = NOW()
      WHERE id = ${id}
    `;
  }
};

// Unified Export Strategy
export const decryptToken = decrypt;
export const encryptToken = encrypt;
export default connectedAccountsService;