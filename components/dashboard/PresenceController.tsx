'use client';

import { Check, X, RefreshCw, Twitter, Linkedin } from 'lucide-react';
import { ConnectedAccount } from '@/lib/connectedAccounts';

interface PresenceControllerProps {
  accounts: ConnectedAccount[];
  selectedAccount: ConnectedAccount | null;
  onSwitchAccount: (accountId: string) => void;
  onRefresh: () => void;
}

export function PresenceController({
  accounts,
  selectedAccount,
  onSwitchAccount,
  onRefresh
}: PresenceControllerProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2 overflow-hidden">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => onSwitchAccount(account.id)}
            className={`relative group transition-all duration-300 ${
              selectedAccount?.id === account.id 
                ? 'z-10 scale-110' 
                : 'hover:z-10 hover:scale-105'
            }`}
          >
            <div className={`w-10 h-10 rounded-full border-2 p-0.5 bg-black overflow-hidden transition-colors ${
              selectedAccount?.id === account.id 
                ? 'border-violet-500 shadow-lg shadow-violet-500/20' 
                : 'border-white/10 group-hover:border-white/30'
            }`}>
              {account.profile_image_url ? (
                <img 
                  src={account.profile_image_url} 
                  alt={account.account_username} 
                  className="w-full h-full rounded-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center">
                  {account.platform === 'twitter' ? (
                    <Twitter className="w-4 h-4 text-white/50" />
                  ) : (
                    <Linkedin className="w-4 h-4 text-white/50" />
                  )}
                </div>
              )}
            </div>
            
            {/* Platform Badge */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-black flex items-center justify-center ${
              account.platform === 'twitter' ? 'bg-blue-400' : 'bg-blue-700'
            }`}>
              {account.platform === 'twitter' ? (
                <Twitter className="w-2 h-2 text-white fill-current" />
              ) : (
                <Linkedin className="w-2 h-2 text-white fill-current" />
              )}
            </div>
          </button>
        ))}
      </div>

      <button 
        onClick={onRefresh}
        className="p-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-colors"
        title="Refresh Presence"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      <div className="h-6 w-px bg-white/10 mx-2" />

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Current Presence</span>
        <span className="text-sm font-medium text-white/90">
          {selectedAccount ? `@${selectedAccount.account_username}` : 'No Active Presence'}
        </span>
      </div>
    </div>
  );
}
