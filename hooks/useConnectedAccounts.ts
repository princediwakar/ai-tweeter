// hooks/useConnectedAccounts.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { ConnectedAccount } from '@/lib/types';

export function useConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/connected-accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const connectAccount = useCallback(async (platform: 'twitter' | 'linkedin', data: {
    account_username: string;
    account_name?: string;
    platform_user_id?: string;
    access_token: string;
    refresh_token?: string;
    token_expires_at?: string;
  }) => {
    try {
      const response = await fetch('/api/connected-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, ...data }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to connect account');
      }
      
      const result = await response.json();
      toast.success(`Connected ${platform} account!`);
      await fetchAccounts();
      return result.account;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect');
      throw err;
    }
  }, [fetchAccounts]);

  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(`/api/connected-accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      
      // FIXED: Catch specific API errors
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to disconnect account');
      }

      toast.success('Account disconnected');
      await fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect');
      // FIXED: Throw error back to caller
      throw err;
    }
  }, [fetchAccounts]);

  const twitterAccounts = accounts.filter(a => a.platform === 'twitter' && a.is_active);
  const linkedinAccounts = accounts.filter(a => a.platform === 'linkedin' && a.is_active);

  return {
    accounts,
    twitterAccounts,
    linkedinAccounts,
    loading,
    error,
    fetchAccounts,
    connectAccount,
    disconnectAccount,
  };
}