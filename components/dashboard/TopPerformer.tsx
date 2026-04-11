// components/dashboard/TopPerformer.tsx
'use client';

import { TrendingUp } from 'lucide-react';

interface TopPerformerProps {
  content: string;
}

export default function TopPerformer({ content }: TopPerformerProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">
          Top Performer
        </span>
      </div>
      <p className="text-sm text-zinc-700 line-clamp-3">
        {content}
      </p>
    </div>
  );
}