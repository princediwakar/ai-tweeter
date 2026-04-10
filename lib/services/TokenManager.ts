// lib/services/TokenManager.ts
// Unified Token Manager - single source of truth for token validation and refresh
// Ensures valid tokens for any platform, handling auto-refresh transparently

import { connectedAccountsService } from '../connectedAccounts';
import { platformSettings } from '../platformSettings';
import { refreshAccessToken as refreshTwitterToken, shouldRefreshToken as shouldRefreshTwitterToken } from '../twitter-oauth';
import { refreshAccessToken as refreshLinkedInToken, shouldRefreshToken as shouldRefreshLinkedInToken } from '../linkedin';
import { buildTwitterCredentialsFromAccount, validateTwitterCredentials, type TwitterCredentials } from '../twitter';
import { logger } from '../logger';

export interface PlatformCredentials {
  platform: 'twitter' | 'linkedin';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  profile?: {
    id: string;
    username: string;
    name?: string;
  };
  error?: string;
}

class TokenManager {
  /**
   * Ensure a valid token for an account, auto-refreshing if needed
   * Returns ready-to-use credentials for API calls
   */
  async ensureValidToken(accountId: string): Promise<PlatformCredentials> {
    const account = await connectedAccountsService.getById(accountId);
    
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const platform = account.platform;
    
    if (platform === 'twitter') {
      return this.ensureValidTwitterToken(accountId, account);
    } else if (platform === 'linkedin') {
      return this.ensureValidLinkedInToken(accountId, account);
    }
    
    throw new Error(`Unknown platform: ${platform}`);
  }

  /**
   * Refresh token for a specific platform
   */
  async refreshToken(accountId: string): Promise<void> {
    const account = await connectedAccountsService.getById(accountId);
    
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const platform = account.platform;
    
    if (platform === 'twitter') {
      await this.refreshTwitterToken(accountId, account);
    } else if (platform === 'linkedin') {
      await this.refreshLinkedInToken(accountId, account);
    }
  }

  /**
   * Validate token without refreshing
   */
  async validateToken(accountId: string): Promise<ValidationResult> {
    const account = await connectedAccountsService.getById(accountId);
    
    if (!account) {
      return { valid: false, error: 'Account not found' };
    }

    const platform = account.platform;
    
    if (platform === 'twitter') {
      return this.validateTwitterToken(account);
    } else if (platform === 'linkedin') {
      return this.validateLinkedInToken(account);
    }
    
    return { valid: false, error: `Unknown platform: ${platform}` };
  }

  // --- Private Methods ---

  private async ensureValidTwitterToken(accountId: string, account: any): Promise<PlatformCredentials> {
    const accessToken = account.access_token;
    const refreshToken = account.refresh_token;
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : undefined;

    // Check if we need to refresh
    if (refreshToken && expiresAt && shouldRefreshTwitterToken(expiresAt)) {
      try {
        logger.info(`Refreshing Twitter token for account ${accountId}`, 'token-manager');
        const { accessToken: newAccess, refreshToken: newRefresh, expiresAt: newExpires } = 
          await refreshTwitterToken(refreshToken);
        
        await connectedAccountsService.updateToken(accountId, newAccess, newRefresh, newExpires);
        
        return {
          platform: 'twitter',
          accessToken: newAccess,
          refreshToken: newRefresh,
          expiresAt: newExpires,
        };
      } catch (error) {
        logger.error(`Twitter token refresh failed for ${accountId}`, 'token-manager', error as Error);
        throw new Error('Failed to refresh Twitter token');
      }
    }

    // Token is valid (or we have no refresh token)
    return {
      platform: 'twitter',
      accessToken: accessToken || '',
      refreshToken,
      expiresAt,
    };
  }

  private async ensureValidLinkedInToken(accountId: string, account: any): Promise<PlatformCredentials> {
    const accessToken = account.access_token;
    const refreshToken = account.refresh_token;
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : undefined;

    // Check if we need to refresh
    if (refreshToken && expiresAt && shouldRefreshLinkedInToken(expiresAt)) {
      try {
        logger.info(`Refreshing LinkedIn token for account ${accountId}`, 'token-manager');
        const { accessToken: newAccess, refreshToken: newRefresh, expiresAt: newExpires } = 
          await refreshLinkedInToken(refreshToken);
        
        await connectedAccountsService.updateToken(accountId, newAccess, newRefresh, newExpires);
        
        return {
          platform: 'linkedin',
          accessToken: newAccess,
          refreshToken: newRefresh,
          expiresAt: newExpires,
        };
      } catch (error) {
        logger.error(`LinkedIn token refresh failed for ${accountId}`, 'token-manager', error as Error);
        throw new Error('Failed to refresh LinkedIn token');
      }
    }

    return {
      platform: 'linkedin',
      accessToken: accessToken || '',
      refreshToken,
      expiresAt,
    };
  }

  private async refreshTwitterToken(accountId: string, account: any): Promise<void> {
    const refreshToken = account.refresh_token;
    
    if (!refreshToken) {
      throw new Error('No refresh token available for Twitter');
    }

    const { accessToken, refreshToken: newRefresh, expiresAt } = await refreshTwitterToken(refreshToken);
    
    await connectedAccountsService.updateToken(accountId, accessToken, newRefresh, expiresAt);
    logger.info(`Twitter token refreshed successfully`, 'token-manager');
  }

  private async refreshLinkedInToken(accountId: string, account: any): Promise<void> {
    const refreshToken = account.refresh_token;
    
    if (!refreshToken) {
      throw new Error('No refresh token available for LinkedIn');
    }

    const { accessToken, refreshToken: newRefresh, expiresAt } = await refreshLinkedInToken(refreshToken);
    
    await connectedAccountsService.updateToken(accountId, accessToken, newRefresh, expiresAt);
    logger.info(`LinkedIn token refreshed successfully`, 'token-manager');
  }

  private async validateTwitterToken(account: any): Promise<ValidationResult> {
    try {
      const creds = buildTwitterCredentialsFromAccount(account);
      
      const result = await validateTwitterCredentials(creds);
      
      if (result.valid && result.userInfo) {
        return {
          valid: true,
          profile: {
            id: result.userInfo.id,
            username: result.userInfo.username,
            name: result.userInfo.name,
          },
        };
      }
      
      return { valid: false, error: 'Twitter token validation failed' };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async validateLinkedInToken(account: any): Promise<ValidationResult> {
    try {
      const { validateLinkedInCredentials } = await import('../linkedin');
      
      const credentials = {
        accessToken: account.access_token || '',
        refreshToken: account.refresh_token,
        expiresAt: account.token_expires_at ? new Date(account.token_expires_at) : undefined,
      };
      
      const result = await validateLinkedInCredentials(credentials);
      
      if (result.valid && result.profile) {
        return {
          valid: true,
          profile: {
            id: result.profile.sub,
            username: result.profile.name || result.profile.sub,
            name: result.profile.name,
          },
        };
      }
      
      return { valid: false, error: result.error || 'Token validation failed' };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
export default tokenManager;