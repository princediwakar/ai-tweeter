'use client';

import { useState } from 'react';
import { 
  Users, 
  RefreshCw, 
  Plus,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Account {
  id: string;
  name: string | null;
  twitter_handle: string;
  status: string;
}

interface ModernAccountSelectorProps {
  accounts: Account[];
  selectedAccount: string;
  onSwitchAccount: (accountId: string) => void;
  onRefresh: () => void;
}

export function ModernAccountSelector({
  accounts,
  selectedAccount,
  onSwitchAccount,
  onRefresh
}: ModernAccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentAccount = accounts.find(a => a.id === selectedAccount);
  
  return (
    <div className="bg-card border-2 border-border rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Active Account</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedAccount}
                onChange={(e) => onSwitchAccount(e.target.value)}
                className="bg-transparent text-lg font-bold text-foreground focus:outline-none cursor-pointer"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} (@{account.twitter_handle})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Refresh accounts"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <Link 
            href="/accounts"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Add new account"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
      
      {/* Account Status */}
      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-muted-foreground">Twitter</span>
          <span className="text-foreground font-medium">Connected</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-muted-foreground">LinkedIn</span>
          <span className="text-foreground font-medium">Not connected</span>
        </div>
        <div className="ml-auto">
          <Link 
            href="/accounts" 
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            Manage accounts →
          </Link>
        </div>
      </div>
    </div>
  );
}