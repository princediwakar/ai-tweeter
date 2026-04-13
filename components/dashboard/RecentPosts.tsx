// components/dashboard/RecentPosts.tsx
'use client';

import { Send, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface Tweet {
  id: string;
  content: string;
  status: string;
  created_at: string;
  posted_at?: string;
  persona?: string;
  connected_account_id?: string;
  image_url?: string;
  source_url?: string;
}

interface Persona {
  id: string;
  key?: string;
  name: string;
  emoji: string;
}

interface Account {
  id: string;
  platform: string;
}

interface RecentPostsProps {
  tweets: Tweet[];
  personas: Persona[];
  accounts: Account[];
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

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  ready: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  posted: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  scheduled: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  draft: { bg: 'bg-zinc-50', text: 'text-zinc-600', dot: 'bg-zinc-400' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function RecentPosts({ tweets, personas, accounts }: RecentPostsProps) {
  const displayTweets = tweets
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900">Recent Posts</h2>
        <Link href="/posts" className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {displayTweets.length === 0 ? (
        <div className="text-center py-8 text-zinc-400">
          <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No posts yet. Generate your first content!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayTweets.map((tweet: Tweet) => {
            const persona = personas.find((p) => p.key === tweet.persona || p.id === tweet.persona);
            const tweetAccount = accounts.find((a) => a.id === tweet.connected_account_id);
            const status = statusStyles[tweet.status] || statusStyles.draft;
            const time = tweet.posted_at || tweet.created_at;

            return (
              <div
                key={tweet.id}
                className={`p-3 rounded-lg border transition-colors ${status.bg} border-transparent hover:border-zinc-200`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-sm">
                    {persona?.emoji || '🤖'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 text-sm">
                          {persona?.name || 'AI Profile'}
                        </span>
                        {tweetAccount && (
                          <PlatformIcon
                            platform={tweetAccount.platform === 'linkedin' ? 'linkedin' : 'twitter'}
                            className="w-3.5 h-3.5 text-zinc-400"
                          />
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white ${status.text}`}>
                        {tweet.status.charAt(0).toUpperCase() + tweet.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 line-clamp-2 mt-1">
                      {tweet.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-zinc-400 text-xs">
                        {formatTimeAgo(time)}
                      </span>
                      {tweet.source_url && (
                        <a
                          href={tweet.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate max-w-[200px]"
                        >
                          📰 {tweet.source_url}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {tweet.image_url && (
                  <div className="mt-3 w-32 h-20 bg-zinc-100 rounded-lg overflow-hidden">
                    <img
                      src={tweet.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
