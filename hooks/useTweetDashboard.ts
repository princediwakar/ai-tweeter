import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { formatForUserDisplay, toDateTimeLocal } from '@/lib/utils';
import { Tweet, GenerateFormState, Persona, Account } from '@/types/dashboard';
import { personas } from '@/lib/personas';
import { getAllPersonas } from '@/lib/personas';

// Use centralized persona configuration directly

const BULK_GENERATION_CONFIG = {
  count: 5,
  includeHashtags: true,
  useTrendingTopics: false,
};

// Helper function to parse dates from API response
function parseTweetDates(tweets: Tweet[]): Tweet[] {
  return tweets.map(tweet => ({
    ...tweet,
    postedAt: tweet.posted_at ? new Date(tweet.posted_at) : undefined,
    createdAt: new Date(tweet.created_at),
  }));
}

export function useTweetDashboard() {
  // State
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [latestTweet, setLatestTweet] = useState<Tweet | null>(null);
  const [selectedTweets, setSelectedTweets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Multi-account state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  // Removed scheduler state - assuming always running
  const [hasHydrated, setHasHydrated] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [personasList, setPersonasList] = useState<Persona[]>(personas); // Initialize directly with centralized personas
  const [generateForm, setGenerateForm] = useState<GenerateFormState>({
    account_id: '', // Will be set when accounts are loaded
    persona: personas[0]?.id || '', // Set default persona immediately
    includeHashtags: true,
    useTrendingTopics: false,
    customPrompt: '',
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Track if component is mounted to prevent updates after unmount
  const [isMounted, setIsMounted] = useState(false);

  // All accounts can use all personas - no classification needed

  // Function to update personas based on selected account
  const updatePersonasForAccount = useCallback((accountId: string) => {
    const selectedAccountData = accounts.find(acc => acc.id === accountId);
    if (selectedAccountData) {
      console.log(`🎭 Loading all personas for ${selectedAccountData.name}`);
      
      // Get all available personas (account-agnostic)
      const filteredPersonaConfigs = getAllPersonas();
      
      // Convert to frontend format
      const filteredPersonas = filteredPersonaConfigs.map(p => ({
        id: p.key,
        name: p.displayName,
        emoji: p.displayName.includes('🏆') ? '🏆' : 
               p.displayName.includes('📚') ? '📚' : 
               p.displayName.includes('💡') ? '💡' :
               p.displayName.includes('🚀') ? '🚀' :
               p.displayName.includes('💻') ? '💻' : '🗣️',
        description: p.description,
      }));
      
      setPersonasList(filteredPersonas);
      
      // Update selected persona to first available if current one is not allowed
      if (filteredPersonas.length > 0) {
        const currentPersonaAllowed = filteredPersonas.some(p => p.id === generateForm.persona);
        if (!currentPersonaAllowed) {
          setGenerateForm(prev => ({ 
            ...prev, 
            persona: filteredPersonas[0].id 
          }));
        }
      }
    } else {
      // No account selected or fallback - show all personas
      setPersonasList(personas);
    }
  }, [accounts, generateForm.persona]);

  // API Functions
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        if (isMounted) {
          const newAccounts = data.accounts || [];
          setAccounts(newAccounts);
          // Set default account if none selected
          if (!selectedAccount && newAccounts.length > 0) {
            const firstActiveAccount = newAccounts.find((acc: Account) => acc.status === 'active') || newAccounts[0];
            setSelectedAccount(firstActiveAccount.id);
            setGenerateForm(prev => ({ ...prev, account_id: firstActiveAccount.id }));
            // Update personas for the selected account with the new accounts data
            console.log(`🎭 Loading all personas for ${firstActiveAccount.name}`);
            
            const filteredPersonaConfigs = getAllPersonas();
            const filteredPersonas = filteredPersonaConfigs.map(p => ({
              id: p.key,
              name: p.displayName,
              emoji: p.displayName.includes('🏆') ? '🏆' : 
                     p.displayName.includes('📚') ? '📚' : 
                     p.displayName.includes('💡') ? '💡' :
                     p.displayName.includes('🚀') ? '🚀' :
                     p.displayName.includes('💻') ? '💻' : '🗣️',
              description: p.description,
            }));
            
            setPersonasList(filteredPersonas);
            if (filteredPersonas.length > 0) {
              setGenerateForm(prev => ({ 
                ...prev, 
                account_id: firstActiveAccount.id,
                persona: filteredPersonas[0].id 
              }));
            }
          }
        }
      } else {
        console.warn('Failed to fetch accounts:', response.status);
      }
    } catch (error) {
      console.warn('Failed to fetch accounts:', error);
    }
  }, [isMounted, selectedAccount]);

  const fetchTweets = useCallback(async (page = 1, limit = 10, accountId?: string) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      // Add account filter if specified or if a default account is selected
      const accountFilter = accountId || selectedAccount;
      if (accountFilter) {
        queryParams.append('account_id', accountFilter);
      }

      const response = await fetch(`/api/tweets?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setTweets(parseTweetDates(data.data || []));
          setPagination({
            page: data.page || 1,
            limit: data.limit || 10,
            total: data.total || 0,
            totalPages: data.totalPages || 0,
            hasNext: data.hasNext || false,
            hasPrev: data.hasPrev || false,
          });
          
          // Set the latest tweet to the most recently created one from current page
          if (data.data && data.data.length > 0) {
            const latest = data.data.sort((a: Tweet, b: Tweet) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
            setLatestTweet(latest);
          }
        }
      } else {
        console.warn('Failed to fetch tweets:', response.status);
        // Only show toast for user-initiated actions, not polling
      }
    } catch (error) {
      console.warn('Failed to fetch tweets:', error);
      // Only show toast for user-initiated actions, not polling
    }
  }, [isMounted, selectedAccount]);

  // Pagination navigation functions
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
    await fetchTweets(1, newLimit); // Reset to first page when changing page size
  }, [fetchTweets]);

  // Removed auto-scheduler stats functionality

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
        console.error('Delete error:', errorData);
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

      // Use bulk deletion API for better performance
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
        await fetchTweets(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tweets');
      }
    } catch (error) {
      console.error('Failed to delete tweets:', error);
      toast.error('Failed to delete tweets');
    }
  }, [selectedTweets, fetchTweets]);

  // Removed toggleAutoScheduler - assuming always running

  const shareOnX = useCallback((tweet: Tweet) => {
    const tweetText = `${tweet.content}${tweet.hashtags.length > 0 ? ' ' + tweet.hashtags.map(tag => `${tag}`).join(' ') : ''}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
  }, []);

  // Utility functions
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

  // Account management functions
  const switchAccount = useCallback((accountId: string) => {
    setSelectedAccount(accountId);
    setGenerateForm(prev => ({ ...prev, account_id: accountId }));
    // Update personas for the selected account
    updatePersonasForAccount(accountId);
    // Refresh tweets for the new account
    fetchTweets(1, pagination.limit, accountId);
  }, [pagination.limit, fetchTweets, updatePersonasForAccount]);

  const refreshAccounts = useCallback(async () => {
    await fetchAccounts();
  }, [fetchAccounts]);

  // Effects
  useEffect(() => {
    setIsMounted(true);
    setHasHydrated(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    // Initial data fetch - load accounts first, then tweets
    if (isMounted) {
      const initializeData = async () => {
        // Fetch accounts first
        try {
          const response = await fetch('/api/accounts');
          if (response.ok) {
            const data = await response.json();
            setAccounts(data.accounts || []);
            
            // Set default account if none selected
            if (!selectedAccount && data.accounts.length > 0) {
              const firstActiveAccount = data.accounts.find((acc: Account) => acc.status === 'active') || data.accounts[0];
              setSelectedAccount(firstActiveAccount.id);
              setGenerateForm(prev => ({ ...prev, account_id: firstActiveAccount.id }));
            }
          }
        } catch (error) {
          console.warn('Failed to fetch accounts:', error);
        }

        // Then fetch tweets
        try {
          const queryParams = new URLSearchParams({
            page: '1',
            limit: '10',
          });
          
          const response = await fetch(`/api/tweets?${queryParams}`);
          if (response.ok) {
            const data = await response.json();
            setTweets(parseTweetDates(data.data || []));
            setPagination({
              page: data.page || 1,
              limit: data.limit || 10,
              total: data.total || 0,
              totalPages: data.totalPages || 0,
              hasNext: data.hasNext || false,
              hasPrev: data.hasPrev || false,
            });
            
            if (data.data && data.data.length > 0) {
              const latest = data.data.sort((a: Tweet, b: Tweet) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0];
              setLatestTweet(latest);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch tweets:', error);
        }
      };
      
      initializeData();
    }
  }, [isMounted]); // Only run when isMounted is true

  // Effect to refresh tweets when account changes
  useEffect(() => {
    if (selectedAccount && isMounted) {
      fetchTweets(1, pagination.limit, selectedAccount);
    }
  }, [selectedAccount, pagination.limit, fetchTweets, isMounted]);


  // Manual refresh function
  const refreshData = useCallback(async () => {
    await fetchAccounts();
    await fetchTweets();
  }, [fetchAccounts, fetchTweets]);

  // Computed values
  const readyTweets = tweets.filter(t => t.status === 'ready');

  const stats = {
    ready: readyTweets.length,
    posted: tweets.filter(t => t.status === 'posted').length,
  };

  return {
    // State
    tweets,
    latestTweet,
    selectedTweets,
    loading,
    showHistory,
    generateForm,
    pagination,
    stats,
    hasHydrated,
    
    // Multi-account state
    accounts,
    selectedAccount,
    
    // Actions
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
    
    // Account actions
    switchAccount,
    refreshAccounts,
    
    // Pagination actions
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    
    // Utilities
    getStatusBadgeColor,
    getQualityGradeColor,
    formatForUserDisplay,
    toDateTimeLocal,
    
    // Constants
    personas: personasList,
    BULK_GENERATION_CONFIG,
  };
}