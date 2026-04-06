// components/dashboard/History.tsx
'use client';

import { useState } from 'react';
import { CheckCircle2, Zap, Send, Trash2, Clock, AlertTriangle, Copy, Check, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tweet } from '@/types/dashboard';
import { ConnectedAccount } from '@/lib/types';

interface HistoryProps {
  tweets: Tweet[];
  onPostTweet: (id: string, platform: 'twitter' | 'linkedin') => void;
  onDeleteTweet: (id: string) => void;
  loading: boolean;
  accounts: ConnectedAccount[];
}

export function History({
  tweets,
  onPostTweet,
  onDeleteTweet,
  loading,
  accounts
}: HistoryProps) {
  // STATE: Track which tweet is currently being asked for deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (tweets.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">No Activity Yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Recent Activity</h3>
      </div>
      
      <div className="space-y-2 border-l border-gray-100 pl-4 py-1">
        {tweets.map((tweet) => {
          const isConfirming = confirmDeleteId === tweet.id;

          return (
            <div 
              key={tweet.id} 
              className={`group flex items-start gap-4 p-4 rounded-xl transition-all duration-200 border ${isConfirming ? 'bg-red-50/50 border-red-100' : 'hover:bg-gray-50/50 border-transparent hover:border-gray-100'}`}
            >
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

              <div className="flex-1 min-w-0">
                <p 
                  className={`text-sm text-gray-900 leading-normal mb-2 cursor-pointer hover:text-indigo-600 transition-colors ${expandedId === tweet.id ? '' : 'line-clamp-3'}`}
                  onClick={() => setExpandedId(expandedId === tweet.id ? null : tweet.id)}
                >
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

              {/* Actions & Confirmation Logic */}
              <div className={`flex items-center gap-1 transition-opacity ${isConfirming ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isConfirming ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                      <AlertTriangle size={12} /> Delete?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={loading}
                      className="h-8 px-2 text-gray-500 hover:bg-gray-200 rounded-lg text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDeleteTweet(tweet.id);
                        setConfirmDeleteId(null);
                      }}
                      disabled={loading}
                      className="h-8 px-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-xs font-bold"
                    >
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <>
                    {tweet.status === 'ready' && (
                      <div className="relative group">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
                        >
                          <Send size={14} />
                        </Button>
                        <div className="absolute right-0 top-0 mt-8 w-40 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                          <button
                            onClick={() => {
                              const twitterAccount = accounts.find(a => a.platform === 'twitter' && a.is_active);
                              if (twitterAccount) {
                                onPostTweet(tweet.id, 'twitter');
                              }
                            }}
                            disabled={loading || !accounts.some(a => a.platform === 'twitter' && a.is_active)}
                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-t-lg"
                          >
                            <Twitter size={14} className="text-sky-500" />
                            Post to Twitter
                          </button>
                          <button
                            onClick={() => {
                              const linkedinAccount = accounts.find(a => a.platform === 'linkedin' && a.is_active);
                              if (linkedinAccount) {
                                onPostTweet(tweet.id, 'linkedin');
                              }
                            }}
                            disabled={loading || !accounts.some(a => a.platform === 'linkedin' && a.is_active)}
                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg"
                          >
                            <Linkedin size={14} className="text-blue-700" />
                            Post to LinkedIn
                          </button>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(tweet.content, tweet.id)}
                      disabled={loading}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Copy content"
                    >
                      {copiedId === tweet.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(tweet.id)}
                      disabled={loading}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ... (HistorySkeleton remains the same)
export function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      
      <div className="space-y-2 border-l border-gray-100 pl-4 py-1">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="flex items-start gap-4 p-4 rounded-xl border border-gray-100"
          >
            <div className="mt-1 p-1.5 bg-gray-100 rounded-lg">
              <div className="w-3.5 h-3.5 bg-gray-200 rounded animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="flex items-center gap-2">
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}