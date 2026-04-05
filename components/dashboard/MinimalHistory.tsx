'use client';

import { CheckCircle2, Zap, Send, Trash2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tweet } from '@/types/dashboard';

interface MinimalHistoryProps {
  tweets: Tweet[];
  onPostTweet: (id: string) => void;
  onDeleteTweet: (id: string) => void;
  loading: boolean;
}

export function MinimalHistory({
  tweets,
  onPostTweet,
  onDeleteTweet,
  loading
}: MinimalHistoryProps) {
  if (tweets.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">No Activity Yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Recent Activity</h3>
      </div>
      
      <div className="space-y-2 border-l border-gray-100 pl-4 py-1">
        {tweets.map((tweet) => (
          <div 
            key={tweet.id} 
            className="group flex items-start gap-4 p-4 hover:bg-gray-50/50 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-100"
          >
            {/* Status Icon */}
            <div className="mt-1">
              {tweet.status === 'posted' ? (
                <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                  <Zap size={14} />
                </div>
              ) : tweet.status === 'ready' ? (
                <div className="p-1.5 bg-green-50 text-green-500 rounded-lg">
                  <CheckCircle2 size={14} />
                </div>
              ) : (
                <div className="p-1.5 bg-gray-50 text-gray-400 rounded-lg">
                  <Clock size={14} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 leading-normal line-clamp-3 mb-2">
                {tweet.content}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  {new Date(tweet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {tweet.status === 'ready' && (
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-green-600 bg-green-50 border-green-100 px-2 py-0">
                    READY
                  </Badge>
                )}
                {tweet.status === 'posted' && (
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 border-blue-100 px-2 py-0">
                    POSTED
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {tweet.status === 'ready' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPostTweet(tweet.id)}
                  disabled={loading}
                  className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                >
                  <Send size={14} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTweet(tweet.id)}
                disabled={loading}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
