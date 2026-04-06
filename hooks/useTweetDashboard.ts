// hooks/useTweetDashboard.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { formatForUserDisplay, toDateTimeLocal } from '@/lib/utils';
import { Tweet, GenerateFormState, Persona, Account } from '@/types/dashboard';

const BULK_GENERATION_CONFIG = {
  count: 5,
  includeHashtags: false,
  useTrendingTopics: true,
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
  
  // Global loading for full page/composer locks
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // FIXED: Localized loading state to prevent button spamming on specific tweets
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [showHistory, setShowHistory] = useState(true);
  const [personasList, setPersonasList] = useState<Persona[]>([]);
  const [generateForm, setGenerateForm] = useState<GenerateFormState>({
    account_id: '',
    persona: '',
    includeHashtags: false,
    useTrendingTopics: true,
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

  const initializeData = useCallback(async () => {
    setInitialLoading(true);
    setLoading(true);
    
    try {
      const [accountsRes, personasRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/personas')
      ]);
      
      const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [] };
      const personasData = personasRes.ok ? await personasRes.json() : { personas: [] };
      
      const newAccounts = accountsData.accounts || [];
      setAccounts(newAccounts);
      
      if (newAccounts.length > 0 && !selectedAccount) {
        const firstActive = newAccounts.find((acc: Account) => acc.status === 'active') || newAccounts[0];
        setSelectedAccount(firstActive.id);
        setGenerateForm(prev => ({ ...prev, account_id: firstActive.id }));
        
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

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
      
      const data = await response.json();

      // FIXED: Actually display the backend error message
      if (response.ok) {
        setLatestTweet(parseTweetDates([data.tweet])[0]);
        toast.success('Tweet generated!');
        // Clear the prompt after successful generation so they don't accidentally double-submit
        setGenerateForm(prev => ({ ...prev, customPrompt: '' })); 
        await fetchTweets();
      } else {
        toast.error(data.error || 'Failed to generate tweet');
      }
    } catch (error) {
      console.error('Failed to generate tweet:', error);
      toast.error('An unexpected error occurred while generating.');
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
      
      const data = await response.json();

      // FIXED: Display the backend error message
      if (response.ok) {
        toast.success(`Generated ${data.tweets.length} tweets!`);
        setGenerateForm(prev => ({ ...prev, customPrompt: '' })); 
        await fetchTweets();
      } else {
        toast.error(data.error || 'Failed to bulk generate tweets');
      }
    } catch (error) {
      console.error('Failed to bulk generate tweets:', error);
      toast.error('An unexpected error occurred during bulk generation.');
    } finally {
      setLoading(false);
    }
  }, [loading, generateForm, fetchTweets]);

  const postTweet = useCallback(async (tweetId: string) => {
    if (actionLoadingId === tweetId) return;
    
    // FIXED: Lock this specific tweet so the user can't spam the button
    setActionLoadingId(tweetId);
    
    try {
      const response = await fetch(`/api/tweets/${tweetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' })
      });
      
      const data = await response.json();

      if (response.ok) {
        toast.success('Tweet posted!');
        await fetchTweets();
      } else {
        toast.error(data.error || 'Failed to post tweet');
      }
    } catch (error) {
      console.error('Failed to post tweet:', error);
      toast.error('An unexpected error occurred while posting.');
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, fetchTweets]);

  const deleteTweet = useCallback(async (tweetId: string) => {
    if (actionLoadingId === tweetId) return;
    
    // FIXED: Lock this specific tweet to prevent spam clicking
    setActionLoadingId(tweetId);
    
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
      toast.error('An unexpected error occurred while deleting.');
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, fetchTweets]);

  const deleteSelectedTweets = useCallback(async () => {
    try {
      if (selectedTweets.length === 0) {
        toast.error('No tweets selected for deletion');
        return;
      }

      setLoading(true);

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
      toast.error(error instanceof Error ? error.message : 'Failed to delete tweets');
    } finally {
      setLoading(false);
    }
  }, [selectedTweets, fetchTweets]);

  const switchAccount = useCallback(async (accountId: string) => {
    setSelectedAccount(accountId);
    setGenerateForm(prev => ({ ...prev, account_id: accountId }));
    
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
    
    await fetchTweets(1, pagination.limit, accountId);
  }, [pagination.limit, fetchTweets]);

  // Pass actionLoadingId down to your UI components!
  // If you want to use it in History.tsx, add `isActionLoading: actionLoadingId === tweet.id` to the props.

  return {
    tweets,
    latestTweet,
    selectedTweets,
    loading,
    initialLoading,
    actionLoadingId, // NEW: Export this so the UI can lock specific buttons
    showHistory,
    generateForm,
    pagination,
    stats: {
      ready: tweets.filter(t => t.status === 'ready').length,
      posted: tweets.filter(t => t.status === 'posted').length,
    },
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
    refreshData: initializeData,
    switchAccount,
    goToPage: async (p: number) => { if (p >= 1 && p <= pagination.totalPages) await fetchTweets(p, pagination.limit); },
    nextPage: async () => { if (pagination.hasNext) await fetchTweets(pagination.page + 1, pagination.limit); },
    prevPage: async () => { if (pagination.hasPrev) await fetchTweets(pagination.page - 1, pagination.limit); },
    changePageSize: async (l: number) => await fetchTweets(1, l),
    personas: personasList,
    BULK_GENERATION_CONFIG,
  };
}