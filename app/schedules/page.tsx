'use client';

import { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ScheduleBuilder from '@/components/schedules/ScheduleBuilder';
import { ChevronDown } from 'lucide-react';
import { useTweetDashboard } from '@/hooks/useTweetDashboard';

export default function SchedulesPage() {
  const { accounts, selectedAccount, switchAccount, initialLoading } = useTweetDashboard();
  
  const currentAccount = accounts.find(a => a.id === selectedAccount) || accounts[0];

  if (initialLoading) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="pb-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Posting Schedules</h1>
          <p className="text-gray-500 text-sm">Configure automated posting times</p>
        </div>

        {accounts.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-500">No accounts connected</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Account:</label>
              <select
                value={selectedAccount || currentAccount?.id || ''}
                onChange={(e) => switchAccount(e.target.value)}
                className="flex-1 max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'})
                  </option>
                ))}
              </select>
            </div>
            
            {currentAccount && (
              <div className="border border-gray-200 rounded-xl p-6">
                <ScheduleBuilder accountId={currentAccount.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}