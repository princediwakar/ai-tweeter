// lib/platformSettings.ts
import { sqlWithRetry } from './db';
import { encrypt, decrypt } from './security/crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default';

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
        FROM global_integrations 
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
        FROM global_integrations 
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
        FROM global_integrations 
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
      UPDATE global_integrations SET
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
      UPDATE global_integrations SET
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
      UPDATE global_integrations SET
        cloud_name = ${credentials.cloud_name},
        api_key_encrypted = ${credentials.api_key ? encrypt(credentials.api_key) : null},
        api_secret_encrypted = ${credentials.api_secret ? encrypt(credentials.api_secret) : null},
        updated_at = NOW()
      WHERE setting_key = 'cloudinary'
    `;
    this.cache.delete('cloudinary');
  }

  getRedirectUri(platform: 'twitter' | 'linkedin'): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    if (platform === 'twitter') {
      return `${baseUrl}/api/connected-accounts/twitter-callback`;
    }
    return `${baseUrl}/api/connected-accounts/linkedin-callback`;
  }

  getNextAuthRedirectUri(platform: 'twitter' | 'linkedin'): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    if (platform === 'twitter') {
      return `${baseUrl}/api/auth/callback/twitter`;
    }
    return `${baseUrl}/api/auth/callback/linkedin`;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const platformSettings = new PlatformSettingsService();
export default platformSettings;