// components/dashboard/TopPerformer.tsx
'use client';

import { Clock } from 'lucide-react';

interface TopPerformerProps {
  content: string;
}

export default function TopPerformer({ content }: TopPerformerProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Latest Post
        </span>
      </div>
      <p className="text-sm text-zinc-700 line-clamp-3">
        {content}
      </p>
    </div>
  );
}