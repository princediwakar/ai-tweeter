// components/dashboard/History.tsx
'use client';

import { useState } from 'react';
import { CheckCircle2, Send, Trash2, Clock, AlertTriangle, Copy, Check, Linkedin, Twitter, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tweet } from '@/types/dashboard';
import { ConnectedAccount } from '@/lib/types';

interface HistoryProps {
  tweets: Tweet[];
  onPostTweet: (id: string, platform: 'twitter' | 'linkedin') => void;
  onDeleteTweet: (id: string) => void;
  loading: boolean;
  accounts: ConnectedAccount[];
}

export function QueueTimeline({
  tweets,
  onPostTweet,
  onDeleteTweet,
  loading,
  accounts
}: HistoryProps) {
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
      <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No content yet</p>
        <p className="text-sm text-zinc-500 mt-1">Create your first post above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Zap className="h-4 w-4 text-zinc-400" />
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Your content</h3>
      </div>
      
      <div className="space-y-3">
        {tweets.map((tweet) => {
          const isConfirming = confirmDeleteId === tweet.id;

          return (
            <div 
              key={tweet.id} 
              className={`group flex items-start gap-4 p-4 bg-white rounded-xl transition-all duration-200 border ${isConfirming ? 'border-red-200 bg-red-50/30' : 'border-zinc-200 hover:border-zinc-300 shadow-sm'}`}
            >
              <div className="mt-1">
                {tweet.status === 'posted' ? (
                  <div className="p-1.5 bg-zinc-100 text-zinc-900 rounded-md border border-zinc-200">
                    <CheckCircle2 size={14} />
                  </div>
                ) : tweet.status === 'ready' ? (
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                    <Send size={14} />
                  </div>
                ) : (
                  <div className="p-1.5 bg-zinc-50 text-zinc-400 rounded-md border border-zinc-100">
                    <Clock size={14} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p 
                  className={`text-sm text-zinc-800 leading-relaxed mb-3 cursor-pointer hover:text-zinc-900 transition-colors ${expandedId === tweet.id ? '' : 'line-clamp-3'}`}
                  onClick={() => setExpandedId(expandedId === tweet.id ? null : tweet.id)}
                >
                  {tweet.content}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
                    {new Date(tweet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {tweet.status === 'ready' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-sm">
                      Ready
                    </span>
                  )}
                  {tweet.status === 'posted' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-sm">
                      Posted
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-1 transition-opacity ${isConfirming ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isConfirming ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-xs font-semibold text-red-600 flex items-center gap-1 mr-2">
                      <AlertTriangle size={12} /> Purge record?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={loading}
                      className="h-7 px-2 text-zinc-500 hover:bg-zinc-100 rounded-md text-xs font-medium"
                    >
                      Abort
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDeleteTweet(tweet.id);
                        setConfirmDeleteId(null);
                      }}
                      disabled={loading}
                      className="h-7 px-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-xs font-bold"
                    >
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <>
                    {tweet.status === 'ready' && (
                      <div className="relative group/dropdown">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md border border-transparent hover:border-zinc-200"
                        >
                          <Send size={14} />
                        </Button>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-zinc-200 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-50">
                          {accounts.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-zinc-400 text-center">
                              No active nodes
                            </div>
                          ) : (
                            <div className="p-1">
                              <button
                                onClick={() => onPostTweet(tweet.id, 'twitter')}
                                disabled={loading}
                                className="w-full px-2 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-zinc-50 rounded-md disabled:opacity-50"
                              >
                                <Twitter size={14} className="text-[#1DA1F2]" />
                                Route to Twitter
                              </button>
                              <button
                                onClick={() => onPostTweet(tweet.id, 'linkedin')}
                                disabled={loading}
                                className="w-full px-2 py-2 text-left text-xs font-medium flex items-center gap-2 hover:bg-zinc-50 rounded-md disabled:opacity-50 mt-1"
                              >
                                <Linkedin size={14} className="text-[#0A66C2]" />
                                Route to LinkedIn
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(tweet.content, tweet.id)}
                      disabled={loading}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md"
                    >
                      {copiedId === tweet.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(tweet.id)}
                      disabled={loading}
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md"
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

export function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-32 bg-zinc-100 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-zinc-100">
            <div className="h-7 w-7 bg-zinc-100 rounded-md animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-zinc-100 rounded animate-pulse w-3/4" />
              <div className="h-3 w-20 bg-zinc-50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}