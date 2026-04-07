// components/dashboard/AccountSelector.tsx
'use client';

import { Users, RefreshCw, Plus, Twitter, Linkedin, Server } from 'lucide-react';
import Link from 'next/link';

interface Account {
  id: string;
  name: string | null;
  account_username: string;
  status?: string;
  platform?: string;
}

interface ModernAccountSelectorProps {
  accounts: Account[];
  selectedAccount: string;
  onSwitchAccount: (accountId: string) => void;
  onRefresh: () => void;
  stats?: { ready: number; posted: number }; // Merged from your Header.tsx
}

export function ModernAccountSelector({
  accounts,
  selectedAccount,
  onSwitchAccount,
  onRefresh,
  stats = { ready: 0, posted: 0 }
}: ModernAccountSelectorProps) {
  
  const currentAccount = accounts.find(a => a.id === selectedAccount);
  
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl">
            <Server className="h-5 w-5 text-zinc-900" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 block">
              Active Routing Node
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedAccount}
                onChange={(e) => onSwitchAccount(e.target.value)}
                className="bg-transparent text-lg font-semibold text-zinc-900 focus:outline-none cursor-pointer"
              >
                {accounts.length === 0 && <option value="">No nodes connected</option>}
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {(account.name || account.account_username)} ({account.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Queue Stats from Header */}
          <div className="hidden md:flex items-center gap-4 border-r border-zinc-200 pr-6">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-zinc-900 leading-none">{stats.ready}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Queued</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-zinc-900 leading-none">{stats.posted}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Deployed</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors border border-transparent hover:border-zinc-200"
              title="Refresh connection"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link 
              href="/accounts"
              className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors border border-transparent hover:border-zinc-200"
              title="Add new account"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Account Status */}
      {currentAccount && (
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-zinc-500 font-medium">Connected</span>
          </div>
          <div className="w-px h-3 bg-zinc-200" />
          <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
            {currentAccount.platform === 'twitter' ? <Twitter size={12} /> : <Linkedin size={12} />}
            <span className="capitalize">{currentAccount.platform}</span>
          </div>
          <div className="ml-auto">
            <Link href="/accounts" className="text-zinc-900 font-semibold hover:underline">
              Node Settings →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}