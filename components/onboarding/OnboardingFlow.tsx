// components/onboarding/OnboardingFlow.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Twitter, Zap, ShieldCheck, Settings, Power } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  account_username: string;
  status: string;
  twitter_oauth2_enabled: boolean;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const accountsRes = await fetch('/api/accounts');
      
      if (!accountsRes.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const accountsData = await accountsRes.json();
      setAccounts(accountsData.accounts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    setConnecting(true);
    // Redirect to your actual OAuth flow
    router.push('/accounts');
  };

  if (loading) {
    return <SystemInitialization />;
  }

  if (accounts.length === 0) {
    return <AccountConnection onConnect={handleConnect} connecting={connecting} />;
  }

  return <EngineOverview accounts={accounts} onAddMore={handleConnect} />;
}

// ----------------------------------------------------------------------
// 1. Loading State: Professional, calm, system-focused
// ----------------------------------------------------------------------
function SystemInitialization() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="space-y-6 flex flex-col items-center">
        <div className="relative flex items-center justify-center w-16 h-16 bg-zinc-100 rounded-2xl border border-zinc-200">
          <Loader2 className="h-6 w-6 text-zinc-900 animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium text-zinc-900">Setting up your brand studio</h3>
          <p className="text-sm text-zinc-500">Preparing your brand growth tools...</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Empty State: High trust, clear value proposition, frictionless
// ----------------------------------------------------------------------
function AccountConnection({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="p-8 sm:p-12 text-center space-y-8">
          
          <div className="w-16 h-16 mx-auto bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Twitter className="h-8 w-8 text-white" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Connect your first social channel
            </h1>
            <p className="text-zinc-500 leading-relaxed">
              AutoGrowth AI helps you build your brand by creating authentic content for your channels.
            </p>
          </div>

          <div className="pt-4 pb-8 max-w-sm mx-auto">
            <button
              onClick={onConnect}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white rounded-xl font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1DA1F2] disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Twitter className="h-5 w-5" />
                  Connect Twitter Account
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-zinc-100 text-left">
            <div className="space-y-2">
              <ShieldCheck className="h-5 w-5 text-zinc-900" />
              <h4 className="text-sm font-semibold text-zinc-900">Secure</h4>
              <p className="text-xs text-zinc-500">Secure OAuth 2.0 integration keeps your accounts safe.</p>
            </div>
            <div className="space-y-2">
              <Zap className="h-5 w-5 text-zinc-900" />
              <h4 className="text-sm font-semibold text-zinc-900">Smart</h4>
              <p className="text-xs text-zinc-500">Content that sounds like you, not a bot.</p>
            </div>
            <div className="space-y-2">
              <Power className="h-5 w-5 text-zinc-900" />
              <h4 className="text-sm font-semibold text-zinc-900">You control it</h4>
              <p className="text-xs text-zinc-500">Pause, adjust, or disconnect anytime.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Active Dashboard: Metrics, status, professional control center
// ----------------------------------------------------------------------
function EngineOverview({ accounts, onAddMore }: { accounts: Account[]; onAddMore: () => void }) {
  const activeAccounts = accounts.filter(a => a.twitter_oauth2_enabled).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Brand Studio</h1>
          <p className="text-sm text-zinc-500">Your brand's content at a glance</p>
        </div>
        <button
          onClick={onAddMore}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <Twitter className="h-4 w-4" />
          Add channel
        </button>
      </div>

      {/* Main Status Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-sm font-medium text-zinc-700">All systems go</span>
          </div>
          <span className="text-xs text-zinc-500 font-mono">{activeAccounts} CHANNELS ACTIVE</span>
        </div>
        
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Metric 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-500">Total Engagements</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-zinc-900">
                  {activeAccounts > 0 ? 'Calibrating...' : '0'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">Past 24 hours</p>
            </div>

            {/* Metric 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-500">Network Growth</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-zinc-900">
                  {activeAccounts > 0 ? 'Calibrating...' : '0'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">Past 24 hours</p>
            </div>

            {/* AI Status */}
            <div className="space-y-2 md:border-l md:border-zinc-100 md:pl-8">
              <h3 className="text-sm font-medium text-zinc-500">Status</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <Zap className="h-5 w-5 text-zinc-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Getting started</div>
                  <div className="text-xs text-zinc-500">Building your content strategy</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Connected Channels</h2>
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                  <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900">{account.name || 'Twitter Account'}</h4>
                  <p className="text-xs text-zinc-500">@{account.account_username || 'username'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {account.twitter_oauth2_enabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Inactive
                  </span>
                )}
                <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-lg hover:bg-zinc-50">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}