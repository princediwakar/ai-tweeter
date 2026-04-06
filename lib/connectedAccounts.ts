// lib/connectedAccounts.ts
import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { sqlWithRetry } from './db';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default';

interface TokenCacheEntry {
  decrypted: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const MAX_CACHE_SIZE = 100;

function getCachedToken(key: string): string | null {
  const entry = tokenCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(key);
    return null;
  }
  return entry.decrypted;
}

function setCachedToken(key: string, decrypted: string): void {
  if (tokenCache.size >= MAX_CACHE_SIZE) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey) tokenCache.delete(firstKey);
  }
  tokenCache.set(key, {
    decrypted,
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  });
}

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string | null): string {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    
    const cacheKey = `decrypt:${encryptedText.substring(0, 50)}`;
    const cached = getCachedToken(cacheKey);
    if (cached) return cached;
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    setCachedToken(cacheKey, decrypted);
    return decrypted;
  } catch {
    return encryptedText;
  }
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  twitter_handle: string; // Alias for backward compatibility
  account_name: string | null;
  name: string | null;
  platform_user_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  status: string;
  connected_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_used_at: string | null;
  // Twitter legacy credentials
  twitter_api_key?: string | null;
  twitter_api_secret?: string | null;
  twitter_access_token?: string | null;
  twitter_access_token_secret?: string | null;
  personas?: string[];
  branding?: Record<string, unknown>;
  profile_image_url?: string | null;
  // Cloudinary
  cloudinary_cloud_name?: string | null;
  cloudinary_api_key?: string | null;
  cloudinary_api_secret?: string | null;
  // LinkedIn OAuth
  linkedin_enabled?: boolean;
  linkedin_user_id?: string;
  linkedin_org_id?: string;
  linkedin_token_expires_at?: string;
  linkedin_access_token?: string;
  linkedin_refresh_token?: string;
  // Twitter OAuth 2.0
  twitter_oauth2_enabled?: boolean;
  twitter_oauth2_access_token?: string;
  twitter_oauth2_refresh_token?: string;
  twitter_oauth2_token_expires_at?: string;
}

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
  last_used_at: string | null;
  // Twitter API credentials (legacy)
  twitter_api_key_encrypted: string | null;
  twitter_api_secret_encrypted: string | null;
  twitter_access_token_encrypted: string | null;
  twitter_access_token_secret_encrypted: string | null;
  personas: string[];
  branding: Record<string, unknown>;
  profile_image_url: string | null;
  // Cloudinary
  cloudinary_cloud_name_encrypted: string | null;
  cloudinary_api_key_encrypted: string | null;
  cloudinary_api_secret_encrypted: string | null;
  // LinkedIn OAuth (platform-specific or separate columns)
  linkedin_enabled: boolean;
  linkedin_user_id: string | null;
  linkedin_org_id: string | null;
  linkedin_access_token_encrypted: string | null;
  linkedin_refresh_token_encrypted: string | null;
  linkedin_token_expires_at: string | null;
  // Twitter OAuth 2.0
  twitter_oauth2_enabled: boolean;
  twitter_oauth2_access_token_encrypted: string | null;
  twitter_oauth2_refresh_token_encrypted: string | null;
  twitter_oauth2_token_expires_at: string | null;
}

function mapRowToConnectedAccount(row: ConnectedAccountRow): ConnectedAccount {
  return {
    id: row.id,
    user_id: row.user_id,
    platform: row.platform,
    account_username: row.account_username,
    twitter_handle: row.account_username,
    account_name: row.account_name,
    name: row.name,
    platform_user_id: row.platform_user_id,
    access_token: decrypt(row.access_token_encrypted),
    refresh_token: decrypt(row.refresh_token_encrypted),
    token_expires_at: row.token_expires_at,
    is_active: row.is_active,
    status: row.status || 'active',
    connected_at: row.connected_at,
    created_at: row.connected_at,
    updated_at: row.connected_at,
    last_used_at: row.last_used_at,
    // Twitter legacy credentials
    twitter_api_key: decrypt(row.twitter_api_key_encrypted),
    twitter_api_secret: decrypt(row.twitter_api_secret_encrypted),
    twitter_access_token: decrypt(row.twitter_access_token_encrypted),
    twitter_access_token_secret: decrypt(row.twitter_access_token_secret_encrypted),
    personas: row.personas || [],
    branding: row.branding || {},
    profile_image_url: row.profile_image_url,
    // Cloudinary
    cloudinary_cloud_name: decrypt(row.cloudinary_cloud_name_encrypted),
    cloudinary_api_key: decrypt(row.cloudinary_api_key_encrypted),
    cloudinary_api_secret: decrypt(row.cloudinary_api_secret_encrypted),
    // LinkedIn
    linkedin_enabled: row.linkedin_enabled,
    linkedin_user_id: row.linkedin_user_id || undefined,
    linkedin_org_id: row.linkedin_org_id || undefined,
    linkedin_access_token: decrypt(row.linkedin_access_token_encrypted) || undefined,
    linkedin_refresh_token: decrypt(row.linkedin_refresh_token_encrypted) || undefined,
    linkedin_token_expires_at: row.linkedin_token_expires_at || undefined,
    // Twitter OAuth 2.0
    twitter_oauth2_enabled: row.twitter_oauth2_enabled,
    twitter_oauth2_access_token: decrypt(row.twitter_oauth2_access_token_encrypted) || undefined,
    twitter_oauth2_refresh_token: decrypt(row.twitter_oauth2_refresh_token_encrypted) || undefined,
    twitter_oauth2_token_expires_at: row.twitter_oauth2_token_expires_at || undefined,
  };
}

export const connectedAccountsService = {
  async getAll(): Promise<ConnectedAccount[]> {
    const result = await sqlWithRetry<ConnectedAccountRow>`SELECT * FROM connected_accounts`;
    return result.rows.map((row) => mapRowToConnectedAccount(row));
  },

  async getById(id: string): Promise<ConnectedAccount | null> {
    const result = await sqlWithRetry<ConnectedAccountRow>`SELECT * FROM connected_accounts WHERE id = ${id}`;
    if (result.rows.length === 0) return null;
    return mapRowToConnectedAccount(result.rows[0]);
  },

  async getByUserId(userId: string): Promise<ConnectedAccount[]> {
    const result = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE user_id = ${userId}
    `;
    return result.rows.map(row => mapRowToConnectedAccount(row));
  },

  async getForUser(userId: string, accountId: string): Promise<ConnectedAccount | null> {
    const account = await this.getById(accountId);
    if (account && account.user_id === userId) {
      return account;
    }
    return null;
  },

  async delete(id: string): Promise<void> {
    await sqlWithRetry`DELETE FROM connected_accounts WHERE id = ${id}`;
  },

  async getUserConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    const result = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE user_id = ${userId} AND is_active = true
    `;
    return result.rows.map((row) => mapRowToConnectedAccount(row));
  },

  async getUserTwitterAccount(userId: string): Promise<ConnectedAccount | null> {
    const result = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE user_id = ${userId} AND platform = 'twitter' AND is_active = true
      LIMIT 1
    `;
    if (result.rows.length === 0) return null;
    return mapRowToConnectedAccount(result.rows[0]);
  },

  async getConnectedAccountByAccountId(accountId: string): Promise<ConnectedAccount | null> {
    const result = await sqlWithRetry<ConnectedAccountRow>`
      SELECT * FROM connected_accounts 
      WHERE id = ${accountId} AND is_active = true
      LIMIT 1
    `;
    if (result.rows.length === 0) return null;
    return mapRowToConnectedAccount(result.rows[0]);
  },

  async updateConnectedAccountToken(
    accountId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<void> {
    await sqlWithRetry`
      UPDATE connected_accounts 
      SET access_token_encrypted = ${encrypt(accessToken)},
          refresh_token_encrypted = ${encrypt(refreshToken)},
          token_expires_at = ${expiresAt.toISOString()},
          last_used_at = NOW()
      WHERE id = ${accountId}
    `;
  },
};

export const encryptToken = encrypt;
export const decryptToken = decrypt;
export const getConnectedAccountByAccountId = connectedAccountsService.getConnectedAccountByAccountId;
export const updateConnectedAccountToken = connectedAccountsService.updateConnectedAccountToken;
export { encrypt, decrypt };

export default connectedAccountsService;
