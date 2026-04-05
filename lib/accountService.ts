// lib/accountService.ts
// DEPRECATED: This now delegates to connectedAccountsService
// All functionality is in lib/connectedAccounts.ts

import { connectedAccountsService, type ConnectedAccount } from './connectedAccounts';

// Re-export types for backward compatibility
export type { ConnectedAccount as Account, ConnectedAccount as AccountWithCredentials };

export const accountService = {
  async getAllAccounts(): Promise<ConnectedAccount[]> {
    return connectedAccountsService.getAll();
  },

  async getAccount(id: string): Promise<ConnectedAccount | null> {
    return connectedAccountsService.getById(id);
  },

  async getAccountForUser(userId: string, accountId: string): Promise<ConnectedAccount | null> {
    const account = await connectedAccountsService.getById(accountId);
    if (account && account.user_id === userId) {
      return account;
    }
    return null;
  },

  async getAccountByTwitterHandle(twitterHandle: string): Promise<ConnectedAccount | null> {
    return connectedAccountsService.getByTwitterHandle(twitterHandle);
  },

  async getAccountsByUserId(userId: string): Promise<ConnectedAccount[]> {
    return connectedAccountsService.getByUserId(userId);
  },

  async createAccount(data: {
    id: string;
    user_id: string;
    name: string;
    twitter_handle: string;
    status?: 'active' | 'inactive' | 'suspended';
    twitter_api_key?: string;
    twitter_api_secret?: string;
    twitter_access_token?: string;
    twitter_access_token_secret?: string;
    personas?: string[];
    branding?: Record<string, unknown>;
  }): Promise<ConnectedAccount> {
    return connectedAccountsService.create({
      id: data.id,
      user_id: data.user_id,
      platform: 'twitter',
      account_username: data.twitter_handle.replace(/^@/, ''),
      account_name: data.name,
      name: data.name,
      status: data.status || 'active',
      personas: data.personas,
      branding: data.branding,
    });
  },

  async updateAccount(id: string, data: Partial<{
    name: string;
    status: 'active' | 'inactive' | 'suspended';
    twitter_handle: string;
    twitter_api_key: string;
    twitter_api_secret: string;
    twitter_access_token: string;
    twitter_access_token_secret: string;
    personas: string[];
    branding: Record<string, unknown>;
  }>): Promise<ConnectedAccount | null> {
    return connectedAccountsService.update(id, data);
  },

  async deleteAccount(id: string): Promise<void> {
    return connectedAccountsService.delete(id);
  },

  async setAccountOwner(accountId: string, userId: string): Promise<void> {
    console.log('setAccountOwner called - now handled via user_id in connected_accounts');
  },

  async getAccountHealth(accountId: string): Promise<{
    isHealthy: boolean;
    account?: ConnectedAccount;
    twitterConnectionValid?: boolean;
    error?: string;
  }> {
    const account = await connectedAccountsService.getById(accountId);
    if (!account) {
      return { isHealthy: false, error: 'Account not found' };
    }
    const hasCredentials = !!(account.twitter_api_key && account.twitter_api_secret && 
                          account.twitter_access_token && account.twitter_access_token_secret);
    return {
      isHealthy: hasCredentials,
      account,
      twitterConnectionValid: hasCredentials,
      error: hasCredentials ? undefined : 'No credentials configured'
    };
  },
};

export default accountService;
