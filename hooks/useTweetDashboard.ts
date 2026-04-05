import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { formatForUserDisplay, toDateTimeLocal } from '@/lib/utils';
import { Tweet, GenerateFormState, Persona, Account } from '@/types/dashboard';

const BULK_GENERATION_CONFIG = {
  count: 5,
  includeHashtags: true,
  useTrendingTopics: false,
};

function parseTweetDates(tweets: Tweet[]): Tweet[] {
  return tweets.map(tweet => ({
    ...tweet,
    postedAt: tweet.posted_at ? new Date(tweet.posted_at) : undefined,
    createdAt: new Date(tweet.created_at),
  }));
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

export function useTweetDashboard() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [latestTweet, setLatestTweet] = useState<Tweet | null>(null);
  const [selectedTweets, setSelectedTweets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [showHistory, setShowHistory] = useState(true);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>({
    account_id: '',
    persona: '',
    includeHashtags: true,
    useTrendingTopics: false,
    customPrompt: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Single parallel data fetch - fixes the multiple loading states issue
  const initializeData = useCallback(async () => {
    setInitialLoading(true);
    setLoading(true);
    
    try {
      // Parallel fetch - single round trip for all initial data
      const [accountsRes, personasRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/personas')
      ]);
      
      const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [] };
      const personasData = personasRes.ok ? await personasRes.json() : { personas: [] };
      
      const newAccounts = accountsData.accounts || [];
      setAccounts(newAccounts);
      
      // Set default account
      if (newAccounts.length > 0 && !selectedAccount) {
        const firstActive = newAccounts.find((acc: Account) => acc.status === 'active') || newAccounts[0];
        setSelectedAccount(firstActive.id);
        setGenerateForm(prev => ({ ...prev, account_id: firstActive.id }));
        
        // Filter personas for this account
        const accountPersonas = (personasData.personas || [])
          .filter((p: any) => p.connected_account_id === firstActive.id && p.is_active)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            emoji: getPersonaEmoji(p.name),
            description: p.description || '',
          }));
        
        setPersonasList(accountPersonas);
        if (accountPersonas.length > 0) {
          setGenerateForm(prev => ({ ...prev, persona: accountPersonas[0].id }));
        }
      }
      
      // Fetch tweets with account filter
      const tweetsRes = await fetch('/api/tweets?page=1&limit=10');
      if (tweetsRes.ok) {
        const tweetsData = await tweetsRes.json();
        const parsedTweets = parseTweetDates(tweetsData.data || []);
        setTweets(parsedTweets);
        
        if (parsedTweets.length > 0) {
          const sorted = [...parsedTweets].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestTweet(sorted[0]);
        }
        
        setPagination({
          page: tweetsData.page || 1,
          limit: tweetsData.limit || 10,
          total: tweetsData.total || 0,
          totalPages: tweetsData.totalPages || 0,
          hasNext: tweetsData.hasNext || false,
          hasPrev: tweetsData.hasPrev || false,
        });
      }
    } catch (error) {
      console.error('Failed to initialize data:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [selectedAccount]);

  // Initialize on mount
  useEffect(() => {
    initializeData();
  }, []);

  const fetchTweets = useCallback(async (page = 1, limit = 10, accountId?: string) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      const accountFilter = accountId || selectedAccount;
      if (accountFilter) {
        queryParams.append('account_id', accountFilter);
      }

      const response = await fetch(`/api/tweets?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        const parsedTweets = parseTweetDates(data.data || []);
        setTweets(parsedTweets);
        
        if (parsedTweets.length > 0) {
          const sorted = [...parsedTweets].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestTweet(sorted[0]);
        }
        
        setPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          totalPages: data.totalPages || 0,
          hasNext: data.hasNext || false,
          hasPrev: data.hasPrev || false,
        });
      }
    } catch (error) {
      console.warn('Failed to fetch tweets:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const goToPage = useCallback(async (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      await fetchTweets(page, pagination.limit);
    }
  }, [pagination.totalPages, pagination.limit, fetchTweets]);

  const nextPage = useCallback(async () => {
    if (pagination.hasNext) {
      await fetchTweets(pagination.page + 1, pagination.limit);
    }
  }, [pagination.hasNext, pagination.page, pagination.limit, fetchTweets]);

  const prevPage = useCallback(async () => {
    if (pagination.hasPrev) {
      await fetchTweets(pagination.page - 1, pagination.limit);
    }
  }, [pagination.hasPrev, pagination.page, pagination.limit, fetchTweets]);

  const changePageSize = useCallback(async (newLimit: number) => {
    await fetchTweets(1, newLimit);
  }, [fetchTweets]);

  const generateTweet = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const response = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          ...generateForm,
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLatestTweet(parseTweetDates([data.tweet])[0]);
        toast.success('Tweet generated!');
        await fetchTweets();
      } else {
        toast.error('Failed to generate tweet');
      }
    } catch (error) {
      console.error('Failed to generate tweet:', error);
      toast.error('Failed to generate tweet');
    } finally {
      setLoading(false);
    }
  }, [loading, generateForm, fetchTweets]);

  const bulkGenerateTweets = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const response = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_generate',
          count: BULK_GENERATION_CONFIG.count,
          ...generateForm,
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Generated ${data.tweets.length} tweets!`);
        await fetchTweets();
      } else {
        toast.error('Failed to bulk generate tweets');
      }
    } catch (error) {
      console.error('Failed to bulk generate tweets:', error);
      toast.error('Failed to bulk generate tweets');
    } finally {
      setLoading(false);
    }
  }, [loading, generateForm, fetchTweets]);

  const postTweet = useCallback(async (tweetId: string) => {
    try {
      const response = await fetch(`/api/tweets/${tweetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' })
      });
      
      if (response.ok) {
        toast.success('Tweet posted!');
        await fetchTweets();
      } else {
        toast.error('Failed to post tweet');
      }
    } catch (error) {
      console.error('Failed to post tweet:', error);
      toast.error('Failed to post tweet');
    }
  }, [fetchTweets]);

  const deleteTweet = useCallback(async (tweetId: string) => {
    try {
      const response = await fetch(`/api/tweets/${tweetId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Tweet deleted!');
        await fetchTweets();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete tweet');
      }
    } catch (error) {
      console.error('Failed to delete tweet:', error);
      toast.error('Failed to delete tweet');
    }
  }, [fetchTweets]);

  const deleteSelectedTweets = useCallback(async () => {
    try {
      if (selectedTweets.length === 0) {
        toast.error('No tweets selected for deletion');
        return;
      }

      const response = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_delete',
          tweetIds: selectedTweets
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedTweets([]);
        toast.success(`Deleted ${result.deletedCount} tweets!`);
        await fetchTweets();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tweets');
      }
    } catch (error) {
      console.error('Failed to delete tweets:', error);
      toast.error('Failed to delete tweets');
    }
  }, [selectedTweets, fetchTweets]);

  const shareOnX = useCallback((tweet: Tweet) => {
    const tweetText = `${tweet.content}${tweet.hashtags.length > 0 ? ' ' + tweet.hashtags.map(tag => `${tag}`).join(' ') : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
  }, []);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-900 text-green-200';
      case 'ready': return 'bg-blue-900 text-blue-200';
      case 'failed': return 'bg-red-900 text-red-200';
      default: return 'bg-gray-700 text-gray-200';
    }
  };

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-orange-400';
      case 'F': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const switchAccount = useCallback(async (accountId: string) => {
    setSelectedAccount(accountId);
    setGenerateForm(prev => ({ ...prev, account_id: accountId }));
    
    // Fetch personas for new account
    try {
      const response = await fetch('/api/personas');
      if (response.ok) {
        const data = await response.json();
        const accountPersonas = (data.personas || [])
          .filter((p: any) => p.connected_account_id === accountId && p.is_active)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            emoji: getPersonaEmoji(p.name),
            description: p.description || '',
          }));
        
        setPersonasList(accountPersonas);
        if (accountPersonas.length > 0) {
          setGenerateForm(prev => ({ ...prev, persona: accountPersonas[0].id }));
        } else {
          setGenerateForm(prev => ({ ...prev, persona: '' }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
    }
    
    // Fetch tweets for new account
    await fetchTweets(1, pagination.limit, accountId);
  }, [pagination.limit, fetchTweets]);

  const refreshData = useCallback(async () => {
    await initializeData();
  }, [initializeData]);

  const readyTweets = useMemo(() => tweets.filter(t => t.status === 'ready'), [tweets]);
  const stats = useMemo(() => ({
    ready: readyTweets.length,
    posted: tweets.filter(t => t.status === 'posted').length,
  }), [readyTweets, tweets]);

  return {
    tweets,
    latestTweet,
    selectedTweets,
    loading,
    initialLoading,
    showHistory,
    generateForm,
    pagination,
    stats,
    accounts,
    selectedAccount,
    setSelectedTweets,
    setShowHistory,
    setGenerateForm,
    generateTweet,
    bulkGenerateTweets,
    postTweet,
    deleteTweet,
    deleteSelectedTweets,
    shareOnX,
    refreshData,
    switchAccount,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    getStatusBadgeColor,
    getQualityGradeColor,
    formatForUserDisplay,
    toDateTimeLocal,
    personas: personasList,
    BULK_GENERATION_CONFIG,
  };
}