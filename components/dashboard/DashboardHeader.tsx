// components/dashboard/DashboardHeader.tsx
'use client';

import { useSession } from 'next-auth/react';

interface DashboardHeaderProps {
  activeCount: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHeader({ activeCount }: DashboardHeaderProps) {
  const { data: session } = useSession();
  
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {activeCount} AI Profile
            {activeCount !== 1 ? 's' : ''} Active
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-zinc-500 mt-1">
          Your brand building command center
        </p>
      </div>
    </div>
  );
}