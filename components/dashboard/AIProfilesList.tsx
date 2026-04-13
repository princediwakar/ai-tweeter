// components/dashboard/AIProfilesList.tsx
'use client';

import Link from 'next/link';
import { ChevronRight, Bot } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { getDisplayUsername } from '@/lib/linkedin';

interface PersonaStats {
  todayPosted: number;
  lastActivity?: string;
}

interface Account {
  id: string;
  platform: string;
  account_username: string;
  name?: string;
  profile_url?: string | null;
}

interface Persona {
  id: string;
  name: string;
  emoji: string;
  is_active?: boolean;
  connected_account_id: string;
}

interface AIProfilesListProps {
  personas: Persona[];
  accounts: Account[];
  stats: Map<string, PersonaStats>;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function AIProfilesList({ personas, accounts, stats }: AIProfilesListProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <Link href="/setup">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900">AI Profiles</h2>
          <button className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
      </Link>
      <div className="space-y-3">
        {personas.length === 0 ? (
          <div className="text-center py-6 text-zinc-400">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI Profiles yet</p>
          </div>
        ) : (
          personas.slice(0, 4).map((persona) => {
            const personaStats = stats.get(persona.id);
            const account = accounts.find((a) => a.id === persona.connected_account_id);

            return (
              <div
                key={persona.id}
                className="p-3 border border-zinc-100 rounded-lg hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-lg flex items-center justify-center text-xl">
                    {persona.emoji || '🗣️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 text-sm truncate">
                        {persona.name}
                      </span>
                      {persona.is_active !== false && (
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <PlatformIcon
                        platform={account?.platform === 'linkedin' ? 'linkedin' : 'twitter'}
                        className="w-3 h-3"
                      />
                      {account && (
                        <span className="text-xs text-zinc-500">
                          @{getDisplayUsername({
                            platform: account.platform as 'twitter' | 'linkedin',
                            account_username: account.account_username,
                            name: account.name || '',
                            profile_url: account.profile_url,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100">
                  <div className="text-xs">
                    <span className="text-zinc-400">Today: </span>
                    <span className="font-medium text-zinc-700">
                      {personaStats?.todayPosted || 0} posted
                    </span>
                  </div>
                  {personaStats?.lastActivity && (
                    <div className="text-xs text-zinc-400">
                      {formatTimeAgo(personaStats.lastActivity)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}