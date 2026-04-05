'use client';

import PersonaEditor from '@/components/personas/PersonaEditor';
import NavigationLayout from '@/components/NavigationLayout';
import { useTweetDashboard } from '@/hooks/useTweetDashboard';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PersonasPage() {
  const { accounts, selectedAccount, switchAccount } = useTweetDashboard();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const currentAccount = accounts.find(a => a.id === selectedAccount) || accounts[0];
  const platform = currentAccount?.platform;

  if (!isClient) {
    return (
      <NavigationLayout>
        <div className="min-h-screen bg-transparent">
          <div className="max-w-6xl mx-auto px-6 py-10">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="h-64 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="min-h-screen bg-transparent">
        <div className="max-w-6xl mx-auto px-6 py-10 animate-in fade-in duration-500">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                AI Personas
              </h1>
              <p className="text-gray-500 text-sm font-medium">
                Create and manage the AI voices for your automated accounts.
              </p>
            </div>
            
            {/* Account Selector */}
            {accounts.length > 0 && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Account:</label>
                <div className="relative">
                  <select
                    value={selectedAccount || currentAccount?.id || ''}
                    onChange={(e) => switchAccount(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer shadow-sm"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.platform === 'linkedin' ? '🔵' : '🐦'} {account.name || account.twitter_handle} ({account.platform})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {currentAccount && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    currentAccount.platform === 'linkedin' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-sky-100 text-sky-700'
                  }`}>
                    {currentAccount.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'}
                  </span>
                )}
              </div>
            )}
            
            {!currentAccount ? (
              <div className="p-16 border border-dashed border-gray-200 rounded-2xl bg-white flex flex-col items-center justify-center text-center shadow-sm">
                <p className="text-gray-400 font-semibold tracking-wide text-sm">Account Connection Required</p>
                <p className="text-gray-400 text-xs mt-1">Connect a social account to begin setting up personas.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                <PersonaEditor 
                  accountId={currentAccount.id} 
                  platform={currentAccount.platform}
                  accountName={currentAccount.name || currentAccount.twitter_handle}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}