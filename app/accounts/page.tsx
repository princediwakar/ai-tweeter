'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Twitter, 
  Linkedin, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  Settings,
  Trash2
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
  credentials_configured?: boolean;
}

interface HealthStatus {
  isHealthy: boolean;
  error?: string;
  loading: boolean;
}

function AccountsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [healthStatus, setHealthStatus] = useState<Record<string, HealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [quickConnecting, setQuickConnecting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const handle = searchParams.get('handle');
    if (connected === 'success') {
      toast.success(`Success! @${handle} is now connected.`, {
        icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />
      });
      router.replace('/accounts');
    } else if (connected === 'error') {
      const message = searchParams.get('message') || 'Failed to connect';
      toast.error(message);
      router.replace('/accounts');
    }
  }, [searchParams, router]);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      setAccounts(data.accounts || []);
      
      data.accounts?.forEach((acc: Account) => checkHealth(acc.id));
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkHealth = async (accountId: string) => {
    setHealthStatus(prev => ({ ...prev, [accountId]: { isHealthy: true, loading: true } }));
    try {
      const response = await fetch(`/api/accounts/${accountId}/health`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Non-JSON response');
      }
      
      const data = await response.json();
      setHealthStatus(prev => ({ 
        ...prev, 
        [accountId]: { 
          isHealthy: data.isHealthy, 
          error: data.error, 
          loading: false 
        } 
      }));
    } catch (error) {
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
    } catch (error) {
      console.error(`${platform} connection error:`, error);
      toast.error(`${platform} connection failed.`);
      setQuickConnecting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to remove this account? This will disconnect all automated systems for this identity.')) {
      return;
    }

    setDeletingId(accountId);
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Account removed successfully');
        setAccounts(prev => prev.filter(a => a.id !== accountId));
      } else {
        const data = await response.json();
        toast.error('Failed to remove account: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove account');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  if (loading) {
    return (
      <NavigationLayout>
        <AccountsLoader />
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="max-w-3xl mx-auto space-y-10 px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Social Infrastructure
            </h1>
            <p className="text-zinc-400 text-sm font-medium">
              Automated account management and health monitoring.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleConnect('twitter')}
              disabled={quickConnecting}
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
            >
              {quickConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Twitter className="h-4 w-4 mr-2 fill-current" />}
              Twitter
            </Button>
            <Button
              onClick={() => handleConnect('linkedin')}
              disabled={quickConnecting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              {quickConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Linkedin className="h-4 w-4 mr-2 fill-current" />}
              LinkedIn
            </Button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-[#050505] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center border border-white/5 transform rotate-3">
                <Zap className="h-8 w-8 text-zinc-600" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Initialize Your Social Layer</h2>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
              Automate your social presence with zero forms. Use One-Click OAuth to connect your accounts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={() => handleConnect('twitter')}
                disabled={quickConnecting || !!deletingId}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold h-12 px-8 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-sky-500/20"
              >
                <Twitter className="h-5 w-5" />
                Restore Twitter
              </Button>
              <Button 
                onClick={() => handleConnect('linkedin')}
                disabled={quickConnecting || !!deletingId}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
              >
                <Linkedin className="h-5 w-5" />
                Restore LinkedIn
              </Button>
            </div>
            <p className="mt-6 text-zinc-600 text-xs font-mono">
              Account failed connection or was accidentally removed? Click above to re-provision in seconds.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {accounts.map(account => (
              <AccountCard 
                key={account.id} 
                account={account}
                health={healthStatus[account.id]}
                onRefresh={() => checkHealth(account.id)}
                onDelete={() => handleDelete(account.id)}
                isDeleting={deletingId === account.id}
              />
            ))}
            
            <div className="flex items-center justify-center gap-8 pt-4">
              <button 
                onClick={() => handleConnect('twitter')}
                disabled={quickConnecting}
                className="flex items-center gap-2 text-zinc-500 hover:text-sky-400 transition-colors text-sm font-medium"
              >
                <Twitter className="h-4 w-4" />
                Add Twitter
              </button>
              <button 
                onClick={() => handleConnect('linkedin')}
                disabled={quickConnecting}
                className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors text-sm font-medium"
              >
                <Linkedin className="h-4 w-4" />
                Add LinkedIn
              </button>
            </div>
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}

function AccountCard({ 
  account, 
  health,
  onRefresh,
  onDelete,
  isDeleting
}: { 
  account: Account; 
  health?: HealthStatus;
  onRefresh: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const isHealthy = health?.isHealthy;
  const isLoading = health?.loading;

  return (
    <div className="group relative bg-[#0D0D0D] border border-white/5 hover:border-white/10 transition-all rounded-xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`absolute -inset-1 rounded-full blur-sm transition-opacity ${
              isHealthy ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`} />
            {account.profile_image_url ? (
              <img 
                src={account.profile_image_url} 
                alt={account.name}
                className="w-14 h-14 rounded-full border border-white/10 relative z-10"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10 relative z-10">
                {account.platform === 'linkedin' ? (
                  <Linkedin className="h-6 w-6 text-blue-600/50" />
                ) : (
                  <Twitter className="h-6 w-6 text-zinc-700" />
                )}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-[#0D0D0D] z-20 ${
              isLoading ? 'bg-zinc-600' : isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white leading-tight">
                {account.name}
              </h3>
              <a 
                href={account.platform === 'linkedin' 
                  ? `https://www.linkedin.com/in/${account.account_username}`
                  : `https://x.com/${account.account_username}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-zinc-500 hover:text-sky-400 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-zinc-500 text-sm font-medium">
              {account.platform === 'linkedin' ? 'LinkedIn Member' : `@${account.account_username}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className={`text-xs font-bold uppercase tracking-widest ${
              isLoading ? 'text-zinc-600' : isHealthy ? 'text-emerald-500/80' : 'text-rose-500/80'
            }`}>
              {isLoading ? 'Scanning...' : isHealthy ? 'Operational' : 'Reconnect Required'}
            </div>
            <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
              ID: {account.id.split('-')[0].toUpperCase()}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-9 w-9 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-rose-500" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {health?.error && !isHealthy && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
          <p className="text-xs text-rose-400 font-medium">{health.error}</p>
        </div>
      )}
    </div>
  );
}

function AccountsLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-2 border-sky-500/20 rounded-full" />
        <div className="absolute inset-0 border-t-2 border-sky-500 rounded-full animate-spin" />
      </div>
      <p className="mt-6 text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
        Synchronizing...
      </p>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsLoader />}>
      <AccountsContent />
    </Suspense>
  );
}