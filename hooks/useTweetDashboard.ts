// hooks/useTweetDashboard.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { formatForUserDisplay, toDateTimeLocal } from '@/lib/utils';
import { Post, GenerateFormState, Persona, ConnectedAccount } from '@/types/dashboard';

const BULK_GENERATION_CONFIG = {
  count: 5,
  includeHashtags: false,
  useTrendingTopics: true,
};

function parsePostDates(posts: Post[]): Post[] {
  return posts.map(post => ({
    ...post,
    postedAt: post.posted_at ? new Date(post.posted_at) : undefined,
    createdAt: new Date(post.created_at),
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  
  // Global loading for full page/composer locks
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // FIXED: Localized loading state to prevent button spamming on specific tweets
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
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
        fetch('/api/profiles')
      ]);
      
      const accountsData = accountsRes.ok ? await accountsRes.json() : { accounts: [] };
      const personasData = personasRes.ok ? await personasRes.json() : { personas: [] };
      
      const newAccounts = accountsData.accounts || [];
      setAccounts(newAccounts);
      
      if (newAccounts.length > 0 && !selectedAccount) {
        const firstActive = newAccounts.find((acc: ConnectedAccount) => acc.status === 'active') || newAccounts[0];
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
      
      const postsRes = await fetch('/api/tweets?page=1&limit=10');
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const parsedPosts = parsePostDates(postsData.data || []);
        setPosts(parsedPosts);
        
        if (parsedPosts.length > 0) {
          const sorted = [...parsedPosts].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestPost(sorted[0]);
        }
        
        setPagination({
          page: postsData.page || 1,
          limit: postsData.limit || 10,
          total: postsData.total || 0,
          totalPages: postsData.totalPages || 0,
          hasNext: postsData.hasNext || false,
          hasPrev: postsData.hasPrev || false,
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

  const fetchPosts = useCallback(async (page = 1, limit = 10, accountId?: string) => {
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
        const parsedPosts = parsePostDates(data.data || []);
        setPosts(parsedPosts);
        
        if (parsedPosts.length > 0) {
          const sorted = [...parsedPosts].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestPost(sorted[0]);
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
      console.warn('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const generatePost = useCallback(async () => {
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
        setLatestPost(parsePostDates([data.post])[0]);
        toast.success('Post generated!');
        // Clear the prompt after successful generation so they don't accidentally double-submit
        setGenerateForm(prev => ({ ...prev, customPrompt: '' })); 
        await fetchPosts();
      } else {
        toast.error(data.error || 'Failed to generate post');
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
      toast.error('An unexpected error occurred while generating.');
    } finally {
      setLoading(false);
    }
  }, [loading, generateForm, fetchPosts]);

  const bulkGeneratePosts = useCallback(async () => {
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
        toast.success(`Generated ${data.posts.length} posts!`);
        setGenerateForm(prev => ({ ...prev, customPrompt: '' })); 
        await fetchPosts();
      } else {
        toast.error(data.error || 'Failed to bulk generate posts');
      }
    } catch (error) {
      console.error('Failed to bulk generate posts:', error);
      toast.error('An unexpected error occurred during bulk generation.');
    } finally {
      setLoading(false);
    }
  }, [loading, generateForm, fetchPosts]);

  const postPost = useCallback(async (postId: string, platform: 'twitter' | 'linkedin' = 'twitter') => {
    if (actionLoadingId === postId) return;
    
    // FIXED: Lock this specific post so the user can't spam the button
    setActionLoadingId(postId);
    
    try {
      const response = await fetch(`/api/tweets/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post', platform })
      });
      
      const data = await response.json();

      if (response.ok) {
        toast.success(platform === 'linkedin' ? 'Posted to LinkedIn!' : 'Post posted!');
        await fetchPosts();
      } else {
        toast.error(data.error || 'Failed to post post');
      }
    } catch (error) {
      console.error('Failed to post post:', error);
      toast.error('An unexpected error occurred while posting.');
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, fetchPosts]);

  const deletePost = useCallback(async (postId: string) => {
    if (actionLoadingId === postId) return;
    
    // FIXED: Lock this specific post to prevent spam clicking
    setActionLoadingId(postId);
    
    try {
      const response = await fetch(`/api/tweets/${postId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Post deleted!');
        await fetchPosts();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('An unexpected error occurred while deleting.');
    } finally {
      setActionLoadingId(null);
    }
  }, [actionLoadingId, fetchPosts]);

  const deleteSelectedPosts = useCallback(async () => {
    try {
      if (selectedPosts.length === 0) {
        toast.error('No posts selected for deletion');
        return;
      }

      setLoading(true);

      const response = await fetch('/api/tweets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_delete',
          tweetIds: selectedPosts
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedPosts([]);
        toast.success(`Deleted ${result.deletedCount} posts!`);
        await fetchPosts();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete posts');
      }
    } catch (error) {
      console.error('Failed to delete posts:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete posts');
    } finally {
      setLoading(false);
    }
  }, [selectedPosts, fetchPosts]);

  const switchAccount = useCallback(async (accountId: string) => {
    setSelectedAccount(accountId);
    setGenerateForm(prev => ({ ...prev, account_id: accountId }));
    
    try {
      const response = await fetch('/api/profiles');
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
    
    await fetchPosts(1, pagination.limit, accountId);
  }, [pagination.limit, fetchPosts]);

  // Pass actionLoadingId down to your UI components!
  // If you want to use it in History.tsx, add `isActionLoading: actionLoadingId === post.id` to the props.

  return {
    posts,
    latestPost,
    selectedPosts,
    loading,
    initialLoading,
    actionLoadingId, // NEW: Export this so the UI can lock specific buttons
    showHistory,
    generateForm,
    pagination,
    stats: {
      ready: posts.filter(t => t.status === 'ready').length,
      posted: posts.filter(t => t.status === 'posted').length,
    },
    accounts,
    selectedAccount,
    setSelectedPosts,
    setShowHistory,
    setGenerateForm,
    generatePost,
    bulkGeneratePosts,
    postPost,
    deletePost,
    deleteSelectedPosts,
    refreshData: initializeData,
    switchAccount,
    goToPage: async (p: number) => { if (p >= 1 && p <= pagination.totalPages) await fetchPosts(p, pagination.limit); },
    nextPage: async () => { if (pagination.hasNext) await fetchPosts(pagination.page + 1, pagination.limit); },
    prevPage: async () => { if (pagination.hasPrev) await fetchPosts(pagination.page - 1, pagination.limit); },
    changePageSize: async (l: number) => await fetchPosts(1, l),
    personas: personasList,
    BULK_GENERATION_CONFIG,
  };
}