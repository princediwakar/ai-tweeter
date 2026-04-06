// lib/platformSettings.ts
import { sql } from '@vercel/postgres';
import { sqlWithRetry } from './db';
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

function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

export interface PlatformCredential {
  client_id?: string;
  client_secret?: string;
  api_key?: string;
  api_secret?: string;
  cloud_name?: string;
}

class PlatformSettingsService {
  private cache: Map<string, PlatformCredential> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  async getTwitterCredentials(): Promise<PlatformCredential> {
    if (this.isValidCache('twitter')) {
      return this.cache.get('twitter')!;
    }

    try {
      const result = await sqlWithRetry`
        SELECT client_id_encrypted, client_secret_encrypted, api_key_encrypted, api_secret_encrypted
        FROM platform_settings 
        WHERE setting_key = 'twitter_app' AND is_active = true
      `;

      if (result.rows.length === 0) {
        throw new Error('Twitter app not configured. Please add credentials in platform settings.');
      }

      const row = result.rows[0];
      const creds: PlatformCredential = {
        client_id: row.client_id_encrypted ? decrypt(row.client_id_encrypted) : undefined,
        client_secret: row.client_secret_encrypted ? decrypt(row.client_secret_encrypted) : undefined,
        api_key: row.api_key_encrypted ? decrypt(row.api_key_encrypted) : undefined,
        api_secret: row.api_secret_encrypted ? decrypt(row.api_secret_encrypted) : undefined,
      };

      this.cache.set('twitter', creds);
      this.cacheExpiry.set('twitter', Date.now() + this.cacheTimeout);
      return creds;
    } catch (error) {
      console.error('Error fetching Twitter credentials:', error);
      throw error;
    }
  }

  async getLinkedInCredentials(): Promise<PlatformCredential> {
    if (this.isValidCache('linkedin')) {
      return this.cache.get('linkedin')!;
    }

    try {
      const result = await sqlWithRetry`
        SELECT client_id_encrypted, client_secret_encrypted
        FROM platform_settings 
        WHERE setting_key = 'linkedin_app' AND is_active = true
      `;

      if (result.rows.length === 0) {
        throw new Error('LinkedIn app not configured. Please add credentials in platform settings.');
      }

      const row = result.rows[0];
      const creds: PlatformCredential = {
        client_id: row.client_id_encrypted ? decrypt(row.client_id_encrypted) : undefined,
        client_secret: row.client_secret_encrypted ? decrypt(row.client_secret_encrypted) : undefined,
      };

      this.cache.set('linkedin', creds);
      this.cacheExpiry.set('linkedin', Date.now() + this.cacheTimeout);
      return creds;
    } catch (error) {
      console.error('Error fetching LinkedIn credentials:', error);
      throw error;
    }
  }

  async getCloudinaryCredentials(): Promise<PlatformCredential> {
    if (this.isValidCache('cloudinary')) {
      return this.cache.get('cloudinary')!;
    }

    try {
      const result = await sqlWithRetry`
        SELECT api_key_encrypted, api_secret_encrypted, cloud_name
        FROM platform_settings 
        WHERE setting_key = 'cloudinary' AND is_active = true
      `;

      const row = result.rows[0];
      const creds: PlatformCredential = {
        api_key: row?.api_key_encrypted ? decrypt(row.api_key_encrypted) : undefined,
        api_secret: row?.api_secret_encrypted ? decrypt(row.api_secret_encrypted) : undefined,
        cloud_name: row?.cloud_name,
      };

      this.cache.set('cloudinary', creds);
      this.cacheExpiry.set('cloudinary', Date.now() + this.cacheTimeout);
      return creds;
    } catch (error) {
      console.error('Error fetching Cloudinary credentials:', error);
      return {};
    }
  }

  async updateTwitterCredentials(credentials: {
    client_id?: string;
    client_secret?: string;
    api_key?: string;
    api_secret?: string;
  }): Promise<void> {
    await sqlWithRetry`
      UPDATE platform_settings SET
        client_id_encrypted = ${credentials.client_id ? encrypt(credentials.client_id) : null},
        client_secret_encrypted = ${credentials.client_secret ? encrypt(credentials.client_secret) : null},
        api_key_encrypted = ${credentials.api_key ? encrypt(credentials.api_key) : null},
        api_secret_encrypted = ${credentials.api_secret ? encrypt(credentials.api_secret) : null},
        updated_at = NOW()
      WHERE setting_key = 'twitter_app'
    `;
    this.cache.delete('twitter');
  }

  async updateLinkedInCredentials(credentials: {
    client_id?: string;
    client_secret?: string;
  }): Promise<void> {
    await sqlWithRetry`
      UPDATE platform_settings SET
        client_id_encrypted = ${credentials.client_id ? encrypt(credentials.client_id) : null},
        client_secret_encrypted = ${credentials.client_secret ? encrypt(credentials.client_secret) : null},
        updated_at = NOW()
      WHERE setting_key = 'linkedin_app'
    `;
    this.cache.delete('linkedin');
  }

  async updateCloudinaryCredentials(credentials: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
  }): Promise<void> {
    await sqlWithRetry`
      UPDATE platform_settings SET
        cloud_name = ${credentials.cloud_name},
        api_key_encrypted = ${credentials.api_key ? encrypt(credentials.api_key) : null},
        api_secret_encrypted = ${credentials.api_secret ? encrypt(credentials.api_secret) : null},
        updated_at = NOW()
      WHERE setting_key = 'cloudinary'
    `;
    this.cache.delete('cloudinary');
  }

  getRedirectUri(platform: 'twitter' | 'linkedin'): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (platform === 'twitter') {
      return `${baseUrl}/api/connected-accounts/twitter-callback`;
    }
    return `${baseUrl}/api/connected-accounts/linkedin-callback`;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const platformSettings = new PlatformSettingsService();
export default platformSettings;