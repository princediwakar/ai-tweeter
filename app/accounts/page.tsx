'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Twitter, 
  Linkedin, 
  Zap, 
  AlertCircle, 
  RefreshCw, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import NavigationLayout from '@/components/NavigationLayout';

interface Account {
  id: string;
  name: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  status: string;
  profile_image_url?: string;
}

interface HealthStatus {
  isHealthy: boolean;
  error?: string;
  loading: boolean;
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <AccountsContent />
    </Suspense>
  );
}

function AccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [quickConnecting, setQuickConnecting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const handle = searchParams.get('handle');
    if (connected === 'success') {
      toast.success(`Success! @${handle} is now connected.`);
      router.replace('/accounts');
    } else if (connected === 'error') {
      const message = searchParams.get('message') || 'Failed to connect';
      toast.error(message);
      router.replace('/accounts');
    }
  }, [searchParams, router]);

  const fetchAccounts = useCallback(async () => {
    setInitialLoading(true);
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setAccounts(data.accounts || []);
      
      if (data.accounts?.length > 0) {
        const healthChecks = data.accounts.map((acc: Account) => 
          checkHealth(acc.id)
        );
        await Promise.all(healthChecks);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const checkHealth = async (accountId: string) => {
    setHealthStatus(prev => ({ ...prev, [accountId]: { isHealthy: true, loading: true } }));
    try {
      const response = await fetch(`/api/accounts/${accountId}/health`);
      const data = await response.json();
      setHealthStatus(prev => ({ 
        ...prev, 
        [accountId]: { 
          isHealthy: data.isHealthy, 
          error: data.error, 
          loading: false 
        } 
      }));
    } catch {
      setHealthStatus(prev => ({ 
        ...prev, 
        [accountId]: { isHealthy: false, error: 'Health check failed', loading: false } 
      }));
    }
  };

  const handleConnect = async (platform: 'twitter' | 'linkedin') => {
    setQuickConnecting(true);
    try {
      const response = await fetch(`/api/accounts/quick-connect/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'pending' })
      });
      
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(`Failed to start ${platform} connection: ` + (data.error || 'Unknown error'));
        setQuickConnecting(false);
      }
    } catch {
      toast.error(`${platform} connection failed.`);
      setQuickConnecting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this account?')) return;

    setDeletingId(accountId);
    try {
      const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
      
      if (response.ok) {
        toast.success('Account removed successfully');
        setAccounts(prev => prev.filter(a => a.id !== accountId));
      } else {
        const data = await response.json();
        toast.error('Failed to remove account: ' + (data.error || 'Unknown error'));
      }
    } catch {
      toast.error('Failed to remove account');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  if (initialLoading) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Accounts</h1>
            <p className="text-gray-500 text-sm">Manage connected social accounts</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => handleConnect('twitter')} disabled={quickConnecting} size="sm">
              {quickConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Twitter className="h-4 w-4 mr-2" />}
              Connect Twitter
            </Button>
            <Button onClick={() => handleConnect('linkedin')} disabled={quickConnecting} size="sm" variant="outline">
              {quickConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Linkedin className="h-4 w-4 mr-2" />}
              Connect LinkedIn
            </Button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Connected</h2>
            <p className="text-gray-500 text-sm mb-6">Connect a social account to get started</p>
            <Button onClick={() => handleConnect('twitter')} disabled={quickConnecting}>
              <Twitter className="h-4 w-4 mr-2" />
              Connect Twitter
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map(account => {
              const health = healthStatus[account.id];
              const isHealthy = health?.isHealthy;
              const isLoadingHealth = health?.loading;
              
              return (
                <div key={account.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${isLoadingHealth ? 'bg-gray-300' : isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">
                      {account.platform}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => checkHealth(account.id)} disabled={isLoadingHealth}>
                      <RefreshCw className={`h-4 w-4 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(account.id)} disabled={deletingId === account.id}>
                      {deletingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}