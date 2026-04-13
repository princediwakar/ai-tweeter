// components/dashboard/ImpactMetrics.tsx
'use client';

import { Calendar, Send, Target, FileText } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { getDisplayUsername } from '@/lib/linkedin';

interface PipelineStats {
  drafts: number;
  ready: number;
  scheduled: number;
  posted: number;
}

interface Account {
  id: string;
  name: string;
  platform: string;
  account_username: string;
  profile_url?: string | null;
}

interface Persona {
  id: string;
  name: string;
  emoji: string;
  connected_account_id: string;
}

interface ImpactMetricsProps {
  stats: PipelineStats;
  draftsCount: number;
  topPersona?: Persona;
  topPersonaAccount?: Account;
}

export default function ImpactMetrics({ 
  stats, 
  draftsCount, 
  topPersona,
  topPersonaAccount 
}: ImpactMetricsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
            This Week
          </span>
          <Calendar className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="text-3xl font-bold">{stats.posted}</div>
        <div className="text-zinc-400 text-sm">posts published</div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
            Ready to Post
          </span>
          <Send className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="text-3xl font-bold text-zinc-900">
          {stats.ready}
        </div>
        <div className="text-zinc-500 text-sm">in queue</div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
            Drafts
          </span>
          <FileText className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="text-3xl font-bold text-zinc-900">
          {draftsCount}
        </div>
        <div className="text-zinc-500 text-sm">pending review</div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
            Latest
          </span>
          <Target className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="text-lg font-bold text-zinc-900 truncate">
          {topPersona?.name || 'None'}
        </div>
        {topPersonaAccount && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm mt-1">
            <PlatformIcon
              platform={
                topPersonaAccount.platform === 'linkedin' ? 'linkedin' : 'twitter'
              }
              className="w-3 h-3"
            />
            <span>@{getDisplayUsername({
              platform: topPersonaAccount.platform as 'twitter' | 'linkedin',
              account_username: topPersonaAccount.account_username,
              name: topPersonaAccount.name,
              profile_url: topPersonaAccount.profile_url,
            })}</span>
          </div>
        )}
      </div>
    </div>
  );
}