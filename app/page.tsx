'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Send, Sparkles, TrendingUp, Heart, 
   Repeat, Calendar, Bot, 
  ChevronRight, Target, 
  Brain, Workflow,
  ArrowRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationLayout from '@/components/NavigationLayout';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { toast } from 'sonner';
import Link from 'next/link';

interface Tweet {
  id: string;
  content: string;
  status: string;
  created_at: string;
  posted_at?: string;
  persona?: string;
  connected_account_id?: string;
  content_type?: string;
  image_url?: string;
  thread_id?: string;
  thread_sequence?: number;
}

interface Persona {
  id: string;
  key?: string;
  name: string;
  emoji: string;
  description?: string;
  is_active?: boolean;
  connected_account_id: string;
  topics?: string[];
}

interface Account {
  id: string;
  name: string;
  platform: string;
  account_username: string;
  profile_image_url?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

function formatTimeOnly(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface PipelineStats {
  drafts: number;
  ready: number;
  scheduled: number;
  posted: number;
}

interface PersonaStats {
  personaId: string;
  todayGenerated: number;
  todayPosted: number;
  lastActivity: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [quickIdea, setQuickIdea] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (personas.length > 0 && !selectedVoiceId) {
      const defaultVoice = personas.find(p => p.is_active) || personas[0];
      setSelectedVoiceId(defaultVoice.id);
    }
  }, [personas, selectedVoiceId]);

  async function fetchDashboardData() {
    try {
      const [dashboardRes, accountsRes] = await Promise.all([
        fetch('/api/dashboard?page=1&limit=50'),
        fetch('/api/accounts'),
      ]);

      const dashboardData = await dashboardRes.json();
      const accountsData = await accountsRes.json();

      if (dashboardData.error) {
        console.error('Dashboard error:', dashboardData.error);
      }

      setTweets(dashboardData.tweets?.data || []);
      setPersonas(dashboardData.personas || []);
      setAccounts(accountsData.accounts || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const pipelineStats = useMemo((): PipelineStats => {
    return tweets.reduce((acc, tweet) => {
      if (tweet.status === 'draft') acc.drafts++;
      else if (tweet.status === 'ready' || tweet.status === 'scheduled') acc.ready++;
      else if (tweet.status === 'posted') acc.posted++;
      return acc;
    }, { drafts: 0, ready: 0, scheduled: 0, posted: 0 });
  }, [tweets]);

  const personaStats = useMemo((): Map<string, PersonaStats> => {
    const stats = new Map<string, PersonaStats>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    personas.forEach(persona => {
      stats.set(persona.id, {
        personaId: persona.id,
        todayGenerated: 0,
        todayPosted: 0,
        lastActivity: '',
      });
    });

    tweets.forEach(tweet => {
      const createdDate = new Date(tweet.created_at);
      const isToday = createdDate >= today;
      
      if (tweet.persona && stats.has(tweet.persona)) {
        const stat = stats.get(tweet.persona)!;
        if (isToday) stat.todayGenerated++;
        if (tweet.status === 'posted' && isToday) stat.todayPosted++;
        if (!stat.lastActivity || createdDate > new Date(stat.lastActivity)) {
          stat.lastActivity = tweet.created_at;
        }
      }
    });

    return stats;
  }, [tweets, personas]);

  const topPerformingTweet = useMemo(() => {
    return tweets.find(t => t.status === 'posted' && t.posted_at);
  }, [tweets]);

  const recentPostedTweets = useMemo(() => {
    return tweets
      .filter(t => t.status === 'posted')
      .sort((a, b) => new Date(b.posted_at || b.created_at).getTime() - new Date(a.posted_at || a.created_at).getTime())
      .slice(0, 5);
  }, [tweets]);

  const threadsInProgress = useMemo(() => {
    return tweets.filter(t => t.thread_id && t.content_type === 'thread' && t.status !== 'posted');
  }, [tweets]);

  async function handleQuickGenerate() {
    if (!quickIdea.trim() || generating) return;
    
    const voiceId = selectedVoiceId || personas[0]?.id;
    if (!voiceId) {
      toast.error('No AI Profile selected. Create one first.');
      return;
    }

    const selectedVoice = personas.find(p => p.id === voiceId);
    if (!selectedVoice) {
      toast.error('AI Profile not found');
      return;
    }
    
    setGenerating(true);
    try {
      const res = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          connected_account_id: selectedVoice.connected_account_id,
          persona: selectedVoice.id,
          persona_key: selectedVoice.key,
          customPrompt: quickIdea,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTweets(prev => [data.tweet, ...prev]);
        setQuickIdea('');
        toast.success(`Content generated via ${selectedVoice.name}!`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to generate');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  }

  const activePersonas = personas.filter(p => p.is_active);

  if (loading) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-6xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="h-6 bg-zinc-100 rounded w-32 animate-pulse" />
            <div className="h-10 bg-zinc-100 rounded w-80 animate-pulse" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-6xl mx-auto space-y-8 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {activePersonas.length} AI Profile{activePersonas.length !== 1 ? 's' : ''} Active
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
              {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-zinc-500 mt-1">
              Your brand building command center
            </p>
          </div>
          
          {/* <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/profiles')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
New AI Profile
            </button>
          </div> */}
        </div>

        {/* Impact Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">This Week</span>
              <Calendar className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-3xl font-bold">{pipelineStats.posted}</div>
            <div className="text-zinc-400 text-sm">posts published</div>
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Ready to Post</span>
              <Send className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-3xl font-bold text-zinc-900">{pipelineStats.ready}</div>
            <div className="text-zinc-500 text-sm">in queue</div>
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Active Threads</span>
              <Workflow className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-3xl font-bold text-zinc-900">{threadsInProgress.length}</div>
            <div className="text-zinc-500 text-sm">in progress</div>
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Top AI Profile</span>
              <Target className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-lg font-bold text-zinc-900 truncate">
              {personas[0]?.name || 'None'}
            </div>
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span>Most engaged</span>
              {personas[0]?.connected_account_id && (
                <span className="text-zinc-400">•</span>
              )}
              {personas[0]?.connected_account_id && (
                <PlatformIcon platform={(accounts.find(a => a.id === personas[0].connected_account_id)?.platform === 'linkedin' ? 'linkedin' : 'twitter') as 'twitter' | 'linkedin'} className="w-3 h-3" />
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Content Pipeline */}
          <div className="col-span-2 space-y-6">

            {/* Recent Posts Feed */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-zinc-900">Recent Posts</h2>
              </div>
              
              {recentPostedTweets.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No posts yet. Generate your first content!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPostedTweets.map(tweet => {
                    const persona = personas.find(p => p.id === tweet.persona);
                    const tweetAccount = accounts.find(a => a.id === tweet.connected_account_id);
                    return (
                      <div key={tweet.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-50 transition-colors">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-lg">
                          {persona?.emoji || '🤖'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900 text-sm">
                              {persona?.name || 'AI Profile'}
                            </span>
                            {tweetAccount && (
                              <PlatformIcon platform={tweetAccount.platform as 'twitter' | 'linkedin'} className="w-3 h-3 text-zinc-400" />
                            )}
                            <span className="text-zinc-400 text-xs">
                              {tweet.posted_at ? formatTimeAgo(tweet.posted_at) : ''}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 line-clamp-2 mt-1">
                            {tweet.content}
                          </p>
                          {tweet.image_url && (
                            <div className="mt-2 w-32 h-20 bg-zinc-100 rounded-lg overflow-hidden">
                              <img src={tweet.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400">
                          <div className="flex items-center gap-1 text-xs">
                            <Heart className="h-3 w-3" />
                            <span>-</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Repeat className="h-3 w-3" />
                            <span>-</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - AI Profiles */}
          <div className="space-y-6">
            
            {/* AI Profiles */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <Link href="/profiles"> 
              <div className="flex items-center justify-between mb-4">
                
                <h2 className="font-semibold text-zinc-900">AI Profiles</h2>
                               <button className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
              </Link>
              <div className="space-y-3">
                {personas.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400">
                    <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No AI Profiles yet</p>
                  </div>
                  ) : (
                  personas.slice(0, 4).map(persona => {
                    const stats = personaStats.get(persona.id);
                    const account = accounts.find(a => a.id === persona.connected_account_id);
                    
                    return (
                      <div key={persona.id} className="p-3 border border-zinc-100 rounded-lg hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-lg flex items-center justify-center text-xl">
                            {persona.emoji || '🗣️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 text-sm truncate">
                                {persona.name}
                              </span>
                              {persona.is_active !== false && (
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={(account?.platform as 'twitter' | 'linkedin') || 'twitter'} className="w-3 h-3" />
                              <span className="text-xs text-zinc-500">
                                {account?.platform === 'twitter' ? '@' : ''}{account?.account_username}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100">
                          <div className="text-xs">
                            <span className="text-zinc-400">Today: </span>
                            <span className="font-medium text-zinc-700">{stats?.todayPosted || 0} posted</span>
                          </div>
                          {stats?.lastActivity && (
                            <div className="text-xs text-zinc-400">
                              {formatTimeAgo(stats.lastActivity)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>



            {/* Top Performer */}
            {topPerformingTweet && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">Top Performer</span>
                </div>
                <p className="text-sm text-zinc-700 line-clamp-3">
                  {topPerformingTweet.content}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Floating Composer */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl p-3 flex items-center gap-3">
            {/* AI Profile Selector */}
            <div className="relative">
              <button
                onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                <span className="text-lg">
                  {selectedVoiceId ? personas.find(p => p.id === selectedVoiceId)?.emoji || '🎙️' : '🎙️'}
                </span>
                <span className="text-sm font-medium text-zinc-700 max-w-[100px] truncate">
                  {selectedVoiceId ? personas.find(p => p.id === selectedVoiceId)?.name : 'Select AI Profile'}
                </span>
                <ChevronRight className={`h-4 w-4 text-zinc-400 transition-transform ${showVoiceSelector ? 'rotate-90' : ''}`} />
              </button>
              
              {showVoiceSelector && personas.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-2 border-b border-zinc-100">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Select AI Profile</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {personas.map(voice => {
                      const voiceAccount = accounts.find(a => a.id === voice.connected_account_id);
                      return (
                        <button
                          key={voice.id}
                          onClick={() => {
                            setSelectedVoiceId(voice.id);
                            setShowVoiceSelector(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 transition-colors ${
                            selectedVoiceId === voice.id ? 'bg-zinc-50' : ''
                          }`}
                        >
                          <span className="text-lg">{voice.emoji || '🎙️'}</span>
                          <div className="text-left">
                            <div className="text-sm font-medium text-zinc-900">{voice.name}</div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                              <PlatformIcon platform={(voiceAccount?.platform as 'twitter' | 'linkedin') || 'twitter'} className="w-3 h-3" />
                              <span>{voiceAccount?.platform === 'twitter' ? '@' : ''}{voiceAccount?.account_username}</span>
                            </div>
                          </div>
                          {voice.is_active && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={quickIdea}
                onChange={(e) => setQuickIdea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickGenerate()}
                placeholder="What should your AI Profile talk about? (e.g., 'AI trends in 2025')"
                className="w-full px-4 py-2.5 bg-zinc-50 border-0 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <button
              onClick={handleQuickGenerate}
              disabled={!quickIdea.trim() || generating || !selectedVoiceId}
              className="p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </NavigationLayout>
  );
}