'use client';

import { useState, useEffect, useMemo } from 'react';
import { ListChecks, Clock, Ghost, Loader2, ChevronLeft, ChevronRight, Trash2, Send, ExternalLink, X } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import NavigationLayout from '@/components/NavigationLayout';

interface Tweet {
  id: string;
  content: string;
  status: string;
  created_at: string;
  posted_at?: string;
  scheduled_for?: string;
  persona?: string;
  connected_account_id?: string;
  platform?: string;
  image_url?: string;
  source_url?: string;
}

interface Persona {
  id: string;
  name: string;
  key: string;
  is_active: boolean;
  connected_account_id: string;
  schedules: {
    id: string;
    days_of_week: number[];
    start_time: number;
    timezone: string;
    is_active: boolean;
  }[];
}

interface Account {
  id: string;
  name: string;
  platform: string;
  account_username: string;
  timezone?: string;
}

interface TimelineItem {
  id: string;
  date: Date;
  type: 'tweet' | 'ghost';
  tweet?: Tweet;
  persona?: Persona;
  account?: Account;
}

function getPersonaEmoji(name: string): string {
  if (name.includes('Vocabulary')) return '🏆';
  if (name.includes('Business')) return '📈';
  if (name.includes('Cricket')) return '🏏';
  if (name.includes('Signal')) return '💡';
  if (name.includes('Pattern')) return '🔍';
  if (name.includes('LinkedIn')) return '📊';
  return '🗣️';
}

function getStatusColor(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'draft':
      return { bg: 'bg-zinc-100', text: 'text-zinc-600', label: 'Draft' };
    case 'ready':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Ready' };
    case 'scheduled':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' };
    case 'posted':
      return { bg: 'bg-zinc-100', text: 'text-zinc-500', label: 'Posted' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' };
    default:
      return { bg: 'bg-zinc-100', text: 'text-zinc-600', label: status };
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateHeader(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getNextOccurrence(dayOfWeek: number, timeMinutes: number, timezone: string): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0 && timeMinutes <= currentTimeMinutes) daysUntil = 7;

  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + daysUntil);
  nextDate.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);

  return nextDate;
}

function calculateNext7DaysSchedules(
  personas: Persona[],
  accounts: Account[]
): TimelineItem[] {
  const items: TimelineItem[] = [];
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);

  personas.filter(p => p.is_active).forEach(persona => {
    const account = accounts.find(a => a.id === persona.connected_account_id);
    if (!account) return;

    persona.schedules.filter(s => s.is_active).forEach(schedule => {
      schedule.days_of_week.forEach(dayOfWeek => {
        const slotDate = getNextOccurrence(dayOfWeek, schedule.start_time, schedule.timezone || 'UTC');
        
        if (slotDate <= endDate) {
          items.push({
            id: `ghost-${schedule.id}-${slotDate.getTime()}`,
            date: slotDate,
            type: 'ghost',
            persona,
            account,
          });
        }
      });
    });
  });

  return items;
}

function mergeTimeline(tweets: Tweet[], ghostItems: TimelineItem[]): TimelineItem[] {
  const tweetItems: TimelineItem[] = tweets
    .filter(t => t.status !== 'posted')
    .map(tweet => {
      let itemDate: Date;
      if (tweet.scheduled_for) {
        itemDate = new Date(tweet.scheduled_for);
      } else if (tweet.created_at) {
        itemDate = new Date(tweet.created_at);
      } else {
        itemDate = new Date();
      }
      return {
        id: `tweet-${tweet.id}`,
        date: itemDate,
        type: 'tweet' as const,
        tweet,
      };
    });

  const merged = [...tweetItems, ...ghostItems];
  
  const seen = new Set<string>();
  const deduped: TimelineItem[] = [];
  
  merged.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  merged.forEach(item => {
    const key = `${item.date.getHours()}-${item.date.getMinutes()}-${item.type}`;
    if (item.type === 'tweet') {
      deduped.push(item);
    } else {
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
  });

  return deduped;
}

export default function QueuePage() {
  const [loading, setLoading] = useState(true);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expandedTweetId, setExpandedTweetId] = useState<string | null>(null);
  const [postingTweetId, setPostingTweetId] = useState<string | null>(null);
  const [deletingTweetId, setDeletingTweetId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [tweetsRes, profilesRes, accountsRes] = await Promise.all([
        fetch('/api/tweets?page=1&limit=100'),
        fetch('/api/profiles'),
        fetch('/api/accounts'),
      ]);

      const tweetsData = await tweetsRes.json();
      const profilesData = await profilesRes.json();
      const accountsData = await accountsRes.json();

      setTweets(tweetsData.data || []);
      setPersonas(profilesData.personas || []);
      setAccounts(accountsData.accounts || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePostTweet(tweetId: string) {
    setPostingTweetId(tweetId);
    try {
      const tweet = tweets.find(t => t.id === tweetId);
      if (!tweet) return;
      
      const account = accounts.find(a => a.id === tweet.connected_account_id);
      const platform = account?.platform || 'twitter';
      
      const res = await fetch(`/api/tweets/${tweetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post', platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to post: ${data.error || data.details}`);
      } else {
        setTweets(prev => prev.map(t => 
          t.id === tweetId ? { ...t, status: 'posted', posted_at: new Date().toISOString() } : t
        ));
      }
    } catch (error) {
      console.error('Failed to post tweet:', error);
      alert('Failed to post tweet');
    } finally {
      setPostingTweetId(null);
    }
  }

  async function handleDeleteTweet(tweetId: string) {
    if (!confirm('Are you sure you want to delete this tweet?')) return;
    setDeletingTweetId(tweetId);
    try {
      const res = await fetch(`/api/tweets/${tweetId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to delete: ${data.error}`);
      } else {
        setTweets(prev => prev.filter(t => t.id !== tweetId));
      }
    } catch (error) {
      console.error('Failed to delete tweet:', error);
      alert('Failed to delete tweet');
    } finally {
      setDeletingTweetId(null);
    }
  }

  const timeline = useMemo(() => {
    const ghostItems = calculateNext7DaysSchedules(personas, accounts);
    return mergeTimeline(tweets, ghostItems);
  }, [tweets, personas, accounts]);

  const groupedByDate = useMemo(() => {
    const groups: Map<string, TimelineItem[]> = new Map();
    
    timeline.forEach(item => {
      const dateKey = item.date.toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(item);
    });

    return Array.from(groups.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [timeline]);

  if (loading) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-zinc-100 rounded w-32 animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-zinc-50 rounded-xl border border-zinc-200 animate-pulse" />
            ))}
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="h-5 w-5 text-zinc-900" />
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Queue</h1>
            </div>
            <p className="text-zinc-500 text-sm">Your 7-day timeline</p>
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-12 text-center">
            <Clock className="h-8 w-8 text-zinc-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">No upcoming posts</h2>
            <p className="text-sm text-zinc-500">
              Set up schedules in your AI Profiles to see your queue.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDate.map(([dateKey, items]) => {
              const date = new Date(dateKey);
              return (
                <div key={dateKey} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-zinc-900">
                      {formatDateHeader(date)}
                    </h2>
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-xs text-zinc-400">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {items.map(item => {
                      if (item.type === 'ghost') {
                        return (
                          <div
                            key={item.id}
                            className="p-4 bg-zinc-50 border border-dashed border-zinc-300 rounded-xl opacity-60"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Ghost className="h-4 w-4 text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-500">
                                  {formatTime(item.date)}
                                </span>
                                <span className="text-xs text-zinc-400">
                                  {item.persona?.name}
                                </span>
                              </div>
                              {item.account && (
                                <div className="flex items-center gap-1 text-xs text-zinc-400">
                                  <PlatformIcon platform={item.account.platform as 'twitter' | 'linkedin'} className="h-3 w-3" />
                                  <span>@{item.account.account_username}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const tweet = item.tweet!;
                      const account = accounts.find(a => a.id === tweet.connected_account_id);
                      const persona = personas.find(p => p.key === tweet.persona);
                      const statusStyle = getStatusColor(tweet.status);
                      const isExpanded = expandedTweetId === tweet.id;
                      const isPosting = postingTweetId === tweet.id;
                      const isDeleting = deletingTweetId === tweet.id;
                      const canDelete = tweet.status === 'draft' || tweet.status === 'ready' || tweet.status === 'failed';
                      const canPost = tweet.status === 'draft' || tweet.status === 'ready';

                      return (
                        <div
                          key={item.id}
                          className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-zinc-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-lg">
                                  {persona ? getPersonaEmoji(persona.name) : '🤖'}
                                </span>
                                <span className="text-sm font-medium text-zinc-700">
                                  {persona?.name || tweet.persona || 'Unknown'}
                                </span>
                                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-xs font-medium text-zinc-500">
                                  {formatTime(item.date)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                  {statusStyle.label}
                                </span>
                                
                              </div>
                              <div 
                                className="text-sm text-zinc-700 leading-relaxed cursor-pointer"
                                onClick={() => setExpandedTweetId(isExpanded ? null : tweet.id)}
                              >
                                <span className={isExpanded ? '' : 'line-clamp-3'}>
                                  {tweet.content}
                                </span>
                                {tweet.content.length > 200 && (
                                  <span className="text-blue-500 text-xs ml-1">
                                    {isExpanded ? '(click to collapse)' : '(click to expand)'}
                                  </span>
                                )}
                              </div>
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
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {/* {account && (
                                <PlatformIcon platform={account.platform as 'twitter' | 'linkedin'} className="h-3 w-3" />
                              )} */}
                              <div className="flex gap-1">
                                {canPost && (
                                  <button
                                    onClick={() => handlePostTweet(tweet.id)}
                                    disabled={isPosting}
                                    className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 flex items-center gap-1"
                                    title={`Post on ${account?.platform || 'twitter'}`}
                                  >
                                    {isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                    <PlatformIcon platform={account?.platform as 'twitter' | 'linkedin' || 'twitter'} className="h-3 w-3" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteTweet(tweet.id)}
                                    disabled={isDeleting}
                                    className="p-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                                    title="Delete"
                                  >
                                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}