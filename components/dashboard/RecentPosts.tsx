// components/dashboard/RecentPosts.tsx
'use client';

import { Send } from 'lucide-react';
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

export default function RecentPosts({ tweets, personas, accounts }: RecentPostsProps) {
  const postedTweets = tweets.filter((t) => t.status === 'posted')
    .sort((a, b) => 
      new Date(b.posted_at || b.created_at).getTime() -
      new Date(a.posted_at || a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900">Recent Posts</h2>
      </div>

      {postedTweets.length === 0 ? (
        <div className="text-center py-8 text-zinc-400">
          <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No posts yet. Generate your first content!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {postedTweets.map((tweet) => {
            const persona = personas.find((p) => p.id === tweet.persona);
            const tweetAccount = accounts.find((a) => a.id === tweet.connected_account_id);
            
            return (
              <div
                key={tweet.id}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-lg">
                  {persona?.emoji || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 text-sm">
                      {persona?.name || 'AI Profile'}
                    </span>
                    {tweetAccount && (
                      <PlatformIcon
                        platform={tweetAccount?.platform === 'linkedin' ? 'linkedin' : 'twitter'}
                        className="w-3 h-3 text-zinc-400"
                      />
                    )}
                    <span className="text-zinc-400 text-xs">
                      {tweet.posted_at ? formatTimeAgo(tweet.posted_at) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-2 mt-1">
                    {tweet.content}
                  </p>
                  {tweet.source_url && (
                    <a
                      href={tweet.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline mt-1 block truncate max-w-xs"
                    >
                      📰 {tweet.source_url}
                    </a>
                  )}
                  {tweet.image_url && (
                    <div className="mt-2 w-32 h-20 bg-zinc-100 rounded-lg overflow-hidden">
                      <img
                        src={tweet.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}