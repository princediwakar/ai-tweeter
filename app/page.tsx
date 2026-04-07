'use client';

import { useState, useEffect } from 'react';
import { Zap, Send, Sparkles, Clock, User, Twitter, Linkedin, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import NavigationLayout from '@/components/NavigationLayout';
import { toast } from 'sonner';

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
}

interface Persona {
  id: string;
  name: string;
  is_active: boolean;
  connected_account_id: string;
}

interface Account {
  id: string;
  name: string;
  platform: string;
  account_username: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

function formatRelativeTime(dateStr: string): string {
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

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'posted':
      return { label: 'Posted', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    case 'ready':
    case 'scheduled':
      return { label: 'Scheduled', color: 'bg-amber-50 text-amber-700 border-amber-100' };
    default:
      return { label: 'Draft', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
  }
}

export default function HomePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [latestTweets, setLatestTweets] = useState<Tweet[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [quickIdea, setQuickIdea] = useState('');
  const [generating, setGenerating] = useState(false);

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
      const tweets: Tweet[] = tweetsData.data || [];
      
      const profilesData = await profilesRes.json();
      const allPersonas: Persona[] = profilesData.personas || [];
      
      const accountsData = await accountsRes.json();
      const allAccounts: Account[] = accountsData.accounts || [];

      setPersonas(allPersonas.filter(p => p.is_active));
      setAccounts(allAccounts);

      if (tweets.length === 0 && allPersonas.filter(p => p.is_active).length > 0) {
        setInitializing(true);
        await initializeAI(allPersonas.filter(p => p.is_active), allAccounts);
      } else {
        const latestByPersona = reduceToLatestByPersona(tweets);
        setLatestTweets(latestByPersona);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function reduceToLatestByPersona(tweets: Tweet[]): Tweet[] {
    const latestByPersona = new Map<string, Tweet>();
    
    tweets.forEach(tweet => {
      const personaKey = tweet.persona || tweet.connected_account_id || 'unknown';
      const existing = latestByPersona.get(personaKey);
      
      if (!existing || new Date(tweet.created_at) > new Date(existing.created_at)) {
        latestByPersona.set(personaKey, tweet);
      }
    });

    return Array.from(latestByPersona.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async function initializeAI(activePersonas: Persona[], allAccounts: Account[]) {
    setInitializing(true);
    
    try {
      const generatePromises = activePersonas.map(async (persona) => {
        const account = allAccounts.find(a => a.id === persona.connected_account_id);
        if (!account) return null;

        try {
          const res = await fetch('/api/tweets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate',
              connected_account_id: persona.connected_account_id,
              persona: persona.id,
            }),
          });
          
          if (res.ok) {
            return await res.json();
          }
        } catch (err) {
          console.error('Failed to generate for persona:', persona.name, err);
        }
        return null;
      });

      await Promise.all(generatePromises);
      
      const tweetsRes = await fetch('/api/tweets?page=1&limit=100');
      const tweetsData = await tweetsRes.json();
      const tweets: Tweet[] = tweetsData.data || [];
      const latestByPersona = reduceToLatestByPersona(tweets);
      setLatestTweets(latestByPersona);
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      setInitializing(false);
    }
  }

  async function handleQuickGenerate() {
    if (!quickIdea.trim() || generating) return;
    
    setGenerating(true);
    try {
      const activePersona = personas[0];
      if (!activePersona) {
        toast.error('No active brand voices found');
        return;
      }

      const res = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          connected_account_id: activePersona.connected_account_id,
          persona: activePersona.id,
          customPrompt: quickIdea,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLatestTweets(prev => [
          { ...data.tweet, persona: activePersona.name },
          ...prev.slice(0, 8),
        ]);
        setQuickIdea('');
        toast.success('Content generated!');
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

  if (loading || initializing) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="h-8 bg-zinc-100 rounded w-64 animate-pulse" />
            <div className="h-12 bg-zinc-100 rounded-xl w-96 animate-pulse" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-zinc-50 rounded-xl border border-zinc-200 animate-pulse" />
            ))}
          </div>

          {initializing && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Launching your brand voices...</span>
              </div>
            </div>
          )}
        </div>
      </NavigationLayout>
    );
  }

  return (
    <NavigationLayout>
      <div className="w-full max-w-4xl mx-auto space-y-8 pb-24">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {activePersonas.length} Brand Voice{activePersonas.length !== 1 ? 's' : ''} Online
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">
            {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-zinc-500">
            Here&apos;s what your brand voices are creating for you.
          </p>
        </div>

        {latestTweets.length === 0 ? (
          <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-12 text-center">
            <Sparkles className="h-8 w-8 text-zinc-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">Start building your brand presence</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Connect your social channels and create your first brand voice to begin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestTweets.map(tweet => {
              const persona = personas.find(p => p.id === tweet.persona);
              const account = accounts.find(a => a.id === tweet.connected_account_id);
              const status = getStatusLabel(tweet.status);
              
              return (
                <div 
                  key={tweet.id}
                  className="p-5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-zinc-300 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {persona ? getPersonaEmoji(persona.name) : '🤖'}
                      </span>
                      <span className="font-semibold text-sm text-zinc-900">
                        {persona?.name || 'Brand Voice'}
                      </span>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-zinc-700 line-clamp-4 mb-4 leading-relaxed">
                    {tweet.content}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {account && (
                        <>
                          {account.platform === 'twitter' ? (
                            <Twitter className="h-3 w-3 text-[#1DA1F2]" />
                          ) : (
                            <Linkedin className="h-3 w-3 text-[#0A66C2]" />
                          )}
                          <span>@{account.account_username}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">
                      {formatRelativeTime(tweet.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-lg p-3 flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={quickIdea}
                onChange={(e) => setQuickIdea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickGenerate()}
                placeholder="Inspiration for your brand voice..."
                className="w-full px-4 py-2.5 bg-zinc-50 border-0 rounded-xl text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <button
              onClick={handleQuickGenerate}
              disabled={!quickIdea.trim() || generating}
              className="p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
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