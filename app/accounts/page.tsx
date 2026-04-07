// app/accounts/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Twitter, 
  Linkedin, 
  Server, 
  RefreshCw, 
  Trash2,
  Activity
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
    <Suspense fallback={
      <NavigationLayout>
        <div className="flex items-center justify-center h-64">
           <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
        </div>
      </NavigationLayout>
    }>
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
      toast.success(`Connection Established: @${handle}`);
      router.replace('/accounts');
    } else if (connected === 'error') {
      const message = searchParams.get('message') || 'Authentication failed';
      toast.error(`Integration Error: ${message}`);
      router.replace('/accounts');
    }
  }, [searchParams, router]);

  const fetchAccounts = useCallback(async () => {
    setInitialLoading(true);
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch network nodes');
      
      const data = await response.json();
      setAccounts(data.accounts || []);
      
      if (data.accounts?.length > 0) {
        const healthChecks = data.accounts.map((acc: Account) => 
          checkHealth(acc.id)
        );
        await Promise.all(healthChecks);
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
      toast.error('Failed to query routing nodes');
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
        [accountId]: { isHealthy: false, error: 'Ping failed', loading: false } 
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
        toast.error(`OAuth Initialization Failed: ${data.error || 'Unknown parameter'}`);
        setQuickConnecting(false);
      }
    } catch {
      toast.error(`Connection timeout for ${platform} API.`);
      setQuickConnecting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Warning: This will terminate the integration and orphan associated models. Proceed?')) return;

    setDeletingId(accountId);
    try {
      const response = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
      
      if (response.ok) {
        toast.success('Node integration terminated.');
        setAccounts(prev => prev.filter(a => a.id !== accountId));
      } else {
        const data = await response.json();
        toast.error(`Termination failed: ${data.error || 'System error'}`);
      }
    } catch {
      toast.error('Failed to terminate node.');
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
        <div className="w-full max-w-3xl mx-auto space-y-6">
          <div className="space-y-4">
            <div className="h-8 bg-zinc-100 rounded w-48 animate-pulse" />
            <div className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-24 bg-zinc-50 rounded-xl border border-zinc-200 animate-pulse" />
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-5 w-5 text-zinc-900" />
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Routing Nodes</h1>
            </div>
            <p className="text-zinc-500 text-sm">Manage API connections to target distribution networks.</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => handleConnect('twitter')} 
              disabled={quickConnecting} 
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {quickConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Twitter className="h-4 w-4 text-[#1DA1F2]" />}
              Initialize X Node
            </button>
            <button 
              onClick={() => handleConnect('linkedin')} 
              disabled={quickConnecting} 
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
            >
              {quickConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Linkedin className="h-4 w-4 text-[#0A66C2]" />}
              Initialize LinkedIn
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-12 text-center">
            <Activity className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
            <h2 className="text-sm font-medium text-zinc-900">System Offline</h2>
            <p className="text-xs text-zinc-500 mt-1 mb-6">Initialize a routing node to begin deploying content.</p>
            <button 
              onClick={() => handleConnect('twitter')} 
              disabled={quickConnecting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <Twitter className="h-4 w-4" />
              Authorize Primary Node
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map(account => {
              const health = healthStatus[account.id];
              const isHealthy = health?.isHealthy;
              const isLoadingHealth = health?.loading;
              
              return (
                <div key={account.id} className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-zinc-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-3 w-3">
                      {isLoadingHealth ? (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-300"></span>
                      ) : isHealthy ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-900">
                        {(account.name || account.account_username)}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">
                        {account.platform} API 
                        {isHealthy === false && <span className="text-red-500 lowercase normal-case tracking-normal ml-2">— Disconnected</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => checkHealth(account.id)} 
                      disabled={isLoadingHealth}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                      title="Ping Node"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={() => handleDelete(account.id)} 
                      disabled={deletingId === account.id}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Terminate Integration"
                    >
                      {deletingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
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