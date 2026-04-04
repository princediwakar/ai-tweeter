'use client';

import { useState, useEffect } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import ScheduleBuilder from '@/components/schedules/ScheduleBuilder';

interface Account {
  id: string;
  name: string;
  twitter_handle: string;
}

export default function SchedulesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
      
      if (data.accounts?.length > 0) {
        setSelectedAccountId(data.accounts[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <NavigationLayout>
        <div className="p-6 text-gray-500">Loading...</div>
      </NavigationLayout>
    );
  }

  if (accounts.length === 0) {
    return (
      <NavigationLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Schedules</h1>
          <div className="text-center py-12 text-gray-500">
            No accounts found. Create an account first to manage schedules.
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Posting Schedules</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Account</label>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border rounded-md"
          >
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} (@{account.twitter_handle})
              </option>
            ))}
          </select>
        </div>

        {selectedAccountId && (
          <ScheduleBuilder accountId={selectedAccountId} />
        )}
      </div>
    </NavigationLayout>
  );
}