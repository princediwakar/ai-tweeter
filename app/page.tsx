"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import NavigationLayout from "@/components/NavigationLayout";
import { 
  Calendar, 
  Layers, 
  Activity, 
  Settings, 
  Zap, 
  Link2, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  CalendarDays, 
  X, 
  Check, 
  Clock, 
  Sliders, 
  Plus, 
  ExternalLink,
  BookOpen,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PlatformIcon } from "@/components/ui/PlatformIcon";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set());
  
  // Tab state: 'upcoming' vs 'published'
  const [activeTab, setActiveTab] = useState<'upcoming' | 'published'>('upcoming');
  
  // Drawer state for settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'accounts' | 'voice' | 'diet'>('accounts');

  // UI State for in-place editing
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [reschedulingPostId, setReschedulingPostId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<any>(null);
  const [feedbackPrompt, setFeedbackPrompt] = useState<{postId: string, content: string} | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [autopilotModal, setAutopilotModal] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [addingSource, setAddingSource] = useState(false);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);
  
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const url = activeBrandId ? `/api/dashboard?brandId=${activeBrandId}` : "/api/dashboard";
        const res = await fetch(url);
        const json = await res.json();
        if (json.error) {
          toast.error(json.error);
        } else {
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchSocialAccounts() {
      try {
        const res = await fetch("/api/social-accounts");
        const json = await res.json();
        if (json.success) {
          setSocialAccounts(json.accounts);
        }
      } catch (error) {
        console.error("Failed to fetch social accounts:", error);
      }
    }

    fetchDashboardData();
    fetchSocialAccounts();
  }, [activeBrandId]);

  // Auto-poll when content is being generated
  useEffect(() => {
    const needsPolling = data?.upcomingPosts?.some((p: any) => !p.content) || isGenerating;
    
    if (!needsPolling) return;

    const interval = setInterval(async () => {
      try {
        const url = activeBrandId ? `/api/dashboard?brandId=${activeBrandId}` : "/api/dashboard";
        const res = await fetch(url);
        const json = await res.json();
        if (!json.error) {
          setData(json);
          // Auto-turn off generating state if posts are populated
          if (isGenerating && json.upcomingPosts?.length > 0 && !json.upcomingPosts.some((p: any) => !p.content)) {
            setIsGenerating(false);
          }
        }
      } catch (err) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [data, activeBrandId, isGenerating]);

  if (loading && !data) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-5xl mx-auto space-y-8 flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center text-zinc-400 gap-3">
            <Sparkles className="h-6 w-6 animate-pulse text-zinc-900" />
            <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Loading your posts...</p>
          </div>
        </div>
      </NavigationLayout>
    );
  }

  if (!data?.brandProfile) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-xl mx-auto py-24 text-center space-y-6">
          <div className="w-14 h-14 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto border border-zinc-200 shadow-sm">
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Welcome to AutoGrowth</h1>
          <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed">
            Your personal AI social media assistant. Tell us about your website or newsletter, and we'll start drafting posts that sound like you.
          </p>
          <div>
            <Link href="/onboarding" className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition shadow-sm text-sm">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </NavigationLayout>
    );
  }

  const { brandProfile, allBrands, pillars, upcomingPosts = [], recentPosts = [], schedule, sources = [] } = data;
  const toneArray = Array.isArray(brandProfile.tone_of_voice) ? brandProfile.tone_of_voice : [];
  const hasConnectedAccounts = !!brandProfile.twitter_account_id || !!brandProfile.linkedin_account_id;

  const formatScheduleTime = (times?: any, index: number = 0) => {
    if (!times) return '8:00 AM';
    let timeStr = '08:00';
    if (Array.isArray(times) && times.length > 0) {
      timeStr = times[index % times.length];
    } else if (typeof times === 'string') {
      try {
        const parsed = JSON.parse(times);
        if (Array.isArray(parsed) && parsed.length > 0) {
          timeStr = parsed[index % parsed.length];
        }
      } catch (e) {
        timeStr = times; // might be just "08:00"
      }
    }
    const [hStr, mStr] = timeStr.split(':');
    const hours = parseInt(hStr, 10);
    const mins = parseInt(mStr, 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMins = mins < 10 ? `0${mins}` : mins;
    return `${displayHours}:${displayMins} ${period}`;
  };

  const formatPostDate = (dateStr: string) => {
    const postDate = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (postDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (postDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return postDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const refreshDashboard = async () => {
    const url = activeBrandId ? `/api/dashboard?brandId=${activeBrandId}` : "/api/dashboard";
    const dashRes = await fetch(url);
    setData(await dashRes.json());
  };

  const handleForceGenerate = async () => {
    if (!data?.brandProfile?.id) return;
    try {
      setIsGenerating(true);
      const res = await fetch('/api/engine/force-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: data.brandProfile.id })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      toast.success('Drafting your next batch of posts...');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to draft posts');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateBrand = async (brandId: string, updates: any) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/brand-profiles/${brandId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Settings saved!');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleDeleteBrand = async () => {
    if (!brandProfile?.id) return;
    const confirmed = confirm(
      `Are you sure you want to delete "${brandProfile.name}"? This will permanently delete all upcoming posts and settings for this brand. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsDeletingBrand(true);
      const res = await fetch(`/api/brand-profiles/${brandProfile.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      toast.success('Brand deleted');
      setSettingsOpen(false);

      const remainingBrands = (allBrands || []).filter((b: any) => b.id !== brandProfile.id);
      if (remainingBrands.length > 0) {
        setActiveBrandId(remainingBrands[0].id);
      } else {
        window.location.href = '/onboarding';
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete brand');
    } finally {
      setIsDeletingBrand(false);
    }
  };

  const handleDeletePost = async (calendarId: string) => {
    if (!confirm('Are you sure you want to remove this post?')) return;
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/engine/calendar/${calendarId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Post removed');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post');
    } finally { setIsProcessing(false); }
  };

  const handleRegeneratePost = async (calendarId: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/engine/calendar/${calendarId}/regenerate`, { method: 'POST' });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Writing a new draft...');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to rewrite post');
    } finally { setIsProcessing(false); }
  };

  const handleApprovePost = async (calendarId: string) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/engine/calendar/${calendarId}/approve`, { method: 'POST' });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      toast.success('Post approved and scheduled!');
      await refreshDashboard();
      
      if (result.consecutive_approved >= 5 && data.brandProfile.autonomy_mode === 'copilot') {
        setAutopilotModal(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve post');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePost = async (calendarId: string, updates: { content?: string, planned_date?: string }) => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/engine/calendar/${calendarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      if (updates.content) {
        setFeedbackPrompt({ postId: calendarId, content: updates.content });
      } else {
        toast.success('Post updated!');
      }
      
      setEditingPostId(null);
      setReschedulingPostId(null);
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update post');
    } finally { setIsProcessing(false); }
  };

  const handleSaveFeedback = async (remember: boolean) => {
    if (!feedbackPrompt) return;
    try {
      setFeedbackLoading(true);
      if (remember) {
        const currentInstructions = brandProfile.custom_instructions || '';
        const newInstructions = currentInstructions ? `${currentInstructions}\n- Adjusted style based on user edit on ${new Date().toLocaleDateString()}` : `- Adjusted style based on user edit on ${new Date().toLocaleDateString()}`;
        
        await fetch(`/api/brand-profiles/${brandProfile.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_instructions: newInstructions })
        });
        toast.success('Saved your writing preference!');
        await refreshDashboard();
      }
    } catch (err) {
      toast.error('Failed to save preference');
    } finally {
      setFeedbackLoading(false);
      setFeedbackPrompt(null);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl) return;
    try {
      setAddingSource(true);
      const res = await fetch('/api/knowledge-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_profile_id: brandProfile.id, url: newSourceUrl })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      
      toast.success('Link added! We will use this to draft future posts.');
      setNewSourceUrl('');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add link');
    } finally {
      setAddingSource(false);
    }
  };

  return (
    <NavigationLayout>
      <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* Brand Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-200/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-zinc-800">
              {brandProfile.brand_url ? (
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${brandProfile.brand_url}&sz=64`} 
                  alt="Brand Icon" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <Activity size={22} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{brandProfile.name}</h1>
                {allBrands && allBrands.length > 1 && (
                  <select 
                    className="bg-zinc-100 hover:bg-zinc-200 border-none text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-zinc-900 outline-none cursor-pointer text-zinc-700 transition"
                    value={brandProfile.id}
                    onChange={(e) => setActiveBrandId(e.target.value)}
                  >
                    {allBrands.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                <span className="font-medium text-zinc-600">{brandProfile.industry || 'Business'}</span>
                {brandProfile.brand_url && (
                  <>
                    <span>•</span>
                    <a 
                      href={brandProfile.brand_url.startsWith('http') ? brandProfile.brand_url : `https://${brandProfile.brand_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-zinc-500 hover:text-zinc-900 transition underline underline-offset-2"
                    >
                      {brandProfile.brand_url.replace(/^https?:\/\//, '')}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Center */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link 
              href="/onboarding?new=true" 
              className="px-3.5 py-2 bg-white border border-zinc-200 text-xs font-semibold rounded-xl text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
            >
              + New Brand
            </Link>

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 text-xs font-semibold rounded-xl text-zinc-700 hover:bg-zinc-50 transition shadow-sm"
            >
              <Settings size={14} className="text-zinc-500" />
              Settings
              {sources.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            <button 
              onClick={handleForceGenerate}
              disabled={isGenerating || !hasConnectedAccounts}
              title={!hasConnectedAccounts ? "Connect an account in Settings first" : ""}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition shadow-sm disabled:opacity-50"
            >
              <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
              {isGenerating ? 'Drafting posts...' : 'Draft New Posts'}
            </button>
          </div>
        </div>

        {/* Clear Overview Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Publishing</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-sm font-bold text-zinc-900">
                {brandProfile.autonomy_mode === 'autopilot' ? 'Post Automatically' : 'Review Each Post'}
              </span>
              <button
                onClick={() => handleUpdateBrand(brandProfile.id, { 
                  autonomy_mode: brandProfile.autonomy_mode === 'autopilot' ? 'copilot' : 'autopilot' 
                })}
                className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 underline"
              >
                Change
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {brandProfile.autonomy_mode === 'autopilot' ? 'Posts go live on your schedule' : 'You approve every draft first'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Upcoming Posts</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-sm font-bold text-zinc-900">{upcomingPosts.length} lined up</span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Scheduled
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {schedule 
                ? `Posting ${Array.isArray(schedule.days_of_week) ? schedule.days_of_week.length : 3}x a week at ${formatScheduleTime(schedule.posting_times)}` 
                : 'Posting 3x a week at 8:00 AM'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Published</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-sm font-bold text-zinc-900">{recentPosts.length} posts</span>
              <CheckCircle2 size={15} className="text-emerald-500" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Shared to Twitter & LinkedIn
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Website & Links</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-sm font-bold text-zinc-900">{sources.length} links connected</span>
              <BookOpen size={15} className="text-blue-500" />
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {sources[0]?.url ? sources[0].url.replace(/^https?:\/\//, '') : 'Used to find post ideas'}
            </p>
          </div>
        </div>

        {/* Primary Posts Section */}
        <div className="space-y-6">
          
          {/* Segmented View Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-200">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
                  activeTab === 'upcoming'
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Calendar size={16} />
                Upcoming
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-zinc-100 text-zinc-700">
                  {upcomingPosts.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('published')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-all ${
                  activeTab === 'published'
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <CheckCircle2 size={16} />
                Published
                <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-zinc-100 text-zinc-700">
                  {recentPosts.length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: UPCOMING POSTS */}
          {activeTab === 'upcoming' && (
            <div className="space-y-4">
              {!hasConnectedAccounts ? (
                <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-zinc-300">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Link2 size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">Connect your social accounts</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-6">
                    Link your Twitter or LinkedIn in Settings so AutoGrowth can schedule and publish your posts.
                  </p>
                  <button
                    onClick={() => {
                      setDrawerTab('accounts');
                      setSettingsOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition"
                  >
                    <Settings size={14} /> Open Settings
                  </button>
                </div>
              ) : upcomingPosts.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-2xl border border-zinc-200">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">No posts lined up yet</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-6">
                    Ready to create your next batch of posts? We'll write them based on your website and tone.
                  </p>
                  <button
                    onClick={handleForceGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
                  >
                    <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
                    {isGenerating ? 'Writing drafts...' : 'Draft Posts Now'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {upcomingPosts.map((post: any, i: number) => {
                    const isExpanded = expandedPosts.has(i);
                    const platform = post.planned_platform || 'twitter';
                    const charLimit = platform === 'twitter' ? 280 : 3000;

                    return (
                      <div 
                        key={`${post.id}-${post.post_id || i}`}
                        className="bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition-all p-5 shadow-sm group"
                      >
                        {/* Post Header Meta */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <PlatformIcon platform={platform as 'twitter' | 'linkedin'} className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 capitalize">{platform}</span>
                                <span className="text-zinc-300">•</span>
                                <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                  <Clock size={13} className="text-zinc-400" />
                                  {formatPostDate(post.planned_date)} at {formatScheduleTime(schedule?.posting_times, i)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {post.pillar_name && (
                              <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-zinc-200/60">
                                {post.pillar_name}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              post.post_status === 'ready' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                : brandProfile.autonomy_mode === 'autopilot'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}>
                              {post.post_status === 'ready' 
                                ? '✓ Approved' 
                                : brandProfile.autonomy_mode === 'autopilot' 
                                ? '⚡ Will Auto-Post' 
                                : '⏳ Needs Approval'}
                            </span>
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="text-zinc-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
                              title="Delete this post"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Post Body Preview */}
                        <div className="pt-4">
                          {editingPostId === post.id ? (
                            <div className="space-y-3 bg-zinc-50/70 p-3.5 rounded-xl border border-zinc-200">
                              <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full min-h-[120px] p-3 text-sm text-zinc-800 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none bg-white resize-none"
                                placeholder="Edit your post..."
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-400 font-mono">
                                  {editContent.length} / {charLimit}
                                </span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setEditingPostId(null)} 
                                    className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-200 rounded-lg transition"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    disabled={isProcessing} 
                                    onClick={() => handleUpdatePost(post.id, { content: editContent })} 
                                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition flex items-center gap-1.5"
                                  >
                                    <Check size={14} /> Save Post
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : post.content || post.angle ? (
                            <div 
                              onClick={() => {
                                setExpandedPosts(prev => {
                                  const next = new Set(prev);
                                  if (next.has(i)) next.delete(i);
                                  else next.add(i);
                                  return next;
                                });
                              }}
                              className="cursor-pointer"
                            >
                              <p className={`text-sm text-zinc-800 leading-relaxed font-normal ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                                {post.content || post.angle}
                              </p>
                              {!isExpanded && post.content && post.content.length > 180 && (
                                <span className="text-xs text-blue-600 font-medium mt-1 inline-block hover:underline">
                                  Show more...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-xl flex items-center gap-3">
                              <Sparkles className="w-4 h-4 text-zinc-500 animate-pulse shrink-0" />
                              <span className="text-xs font-medium text-zinc-600">Writing your post...</span>
                            </div>
                          )}

                          {/* Reschedule Overlay */}
                          {reschedulingPostId === post.id && (
                            <div className="mt-3 flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                              <CalendarDays className="w-4 h-4 text-zinc-600 shrink-0" />
                              <input 
                                type="date" 
                                value={rescheduleDate}
                                onChange={e => setRescheduleDate(e.target.value)}
                                className="text-xs font-medium bg-white border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-zinc-900 text-zinc-800" 
                              />
                              <div className="flex-1" />
                              <button onClick={() => setReschedulingPostId(null)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md">
                                <X size={15} />
                              </button>
                              <button 
                                disabled={!rescheduleDate || isProcessing} 
                                onClick={() => handleUpdatePost(post.id, { planned_date: rescheduleDate })} 
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition"
                              >
                                Save Date
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        {!editingPostId && !reschedulingPostId && (
                          <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {post.content && (
                                <button 
                                  onClick={() => { setEditContent(post.content); setEditingPostId(post.id); }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
                                >
                                  <Edit2 size={13} /> Edit
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleRegeneratePost(post.id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition disabled:opacity-50"
                              >
                                <RefreshCw size={13} /> Rewrite
                              </button>
                              
                              <button 
                                onClick={() => { 
                                  setRescheduleDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(post.planned_date))); 
                                  setReschedulingPostId(post.id); 
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
                              >
                                <CalendarDays size={13} /> Change Date
                              </button>
                            </div>

                            <div>
                              {brandProfile.autonomy_mode === 'copilot' && post.post_status !== 'ready' && post.content && (
                                <button 
                                  onClick={() => handleApprovePost(post.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50 shadow-sm"
                                >
                                  <Check size={14} /> Schedule Post
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PUBLISHED ARCHIVE */}
          {activeTab === 'published' && (
            <div className="space-y-4">
              {recentPosts.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-2xl border border-zinc-200">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">No posts published yet</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Once posts are published to Twitter or LinkedIn, you'll see them archived here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {recentPosts.map((post: any) => {
                    const platform = post.planned_platform || 'twitter';
                    return (
                      <div 
                        key={post.id}
                        className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <PlatformIcon platform={platform as 'twitter' | 'linkedin'} className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 capitalize">{platform}</span>
                                <span className="text-zinc-300">•</span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(post.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                              <CheckCircle2 size={12} />
                              Published
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Slide-Over Drawer */}
        {settingsOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setSettingsOpen(false)}
            />
            
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
                {/* Drawer Header */}
                <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Settings</h2>
                    <p className="text-xs text-zinc-500">Manage social accounts, links, and writing style.</p>
                  </div>
                  <button 
                    onClick={() => setSettingsOpen(false)}
                    className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Tabs */}
                <div className="flex border-b border-zinc-200 px-6 gap-4">
                  {[
                    { id: 'accounts', label: 'Social Accounts' },
                    { id: 'diet', label: 'Website Links' },
                    { id: 'voice', label: 'Writing Style' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDrawerTab(tab.id as any)}
                      className={`py-3 text-xs font-semibold border-b-2 transition-colors ${
                        drawerTab === tab.id
                          ? 'border-zinc-900 text-zinc-900'
                          : 'border-transparent text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Drawer Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  
                  {/* TAB 1: ACCOUNTS */}
                  {drawerTab === 'accounts' && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-zinc-900">Connected Accounts</h3>
                        <p className="text-xs text-zinc-500">Select which Twitter or LinkedIn profiles to post to.</p>
                      </div>

                      {['twitter', 'linkedin'].map(platform => {
                        const isConnected = platform === 'twitter' 
                          ? !!brandProfile.twitter_account_id
                          : !!brandProfile.linkedin_account_id;
                          
                        const platformAccounts = socialAccounts ? socialAccounts[platform as 'twitter' | 'linkedin'] : [];
                        
                        return (
                          <div key={platform} className={`p-4 rounded-xl border flex flex-col gap-3 ${isConnected ? 'border-zinc-900 bg-zinc-50/50' : 'border-zinc-200 bg-white'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                                  <PlatformIcon platform={platform as 'twitter' | 'linkedin'} className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-bold capitalize text-zinc-900">{platform}</span>
                              </div>
                              
                              <button
                                onClick={() => window.location.href = `/api/oauth/initiate?platform=${platform}&brandId=${brandProfile.id}&callbackUrl=/`}
                                className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 underline"
                              >
                                {isConnected ? 'Reconnect / Switch' : 'Connect New'}
                              </button>
                            </div>

                            {platformAccounts && platformAccounts.length > 0 && (
                              <div>
                                <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Selected Profile</label>
                                <select 
                                  className="w-full bg-white border border-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-zinc-900 outline-none text-zinc-700"
                                  value={platform === 'twitter' 
                                    ? brandProfile.twitter_account_id || '' 
                                    : (brandProfile.linkedin_platform_id ? `${brandProfile.linkedin_account_id}|${brandProfile.linkedin_platform_id}` : brandProfile.linkedin_account_id || '')
                                  }
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    let updates: any = {};
                                    if (platform === 'twitter') {
                                      updates = { twitter_account_id: val || null };
                                    } else {
                                      if (val) {
                                        const [accId, platId] = val.split('|');
                                        updates = { linkedin_account_id: accId, linkedin_platform_id: platId || null };
                                      } else {
                                        updates = { linkedin_account_id: null, linkedin_platform_id: null };
                                      }
                                    }
                                    await handleUpdateBrand(brandProfile.id, updates);
                                  }}
                                >
                                  <option value="">-- Do not post to {platform} --</option>
                                  {platformAccounts.map((acc: any) => {
                                    const value = platform === 'twitter' 
                                      ? acc.id 
                                      : `${acc.id}|${acc.platform_user_id || ''}`;
                                    return (
                                      <option key={value} value={value}>
                                        {acc.name} {acc.type === 'page' ? '(Company Page)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB 2: INSPIRATION LINKS */}
                  {drawerTab === 'diet' && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-zinc-900">Website & Inspiration Links</h3>
                        <p className="text-xs text-zinc-500">We read these pages to learn about what you do and draft relevant posts.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="https://yourblog.com or substack link" 
                            value={newSourceUrl}
                            onChange={e => setNewSourceUrl(e.target.value)}
                            className="flex-1 text-xs p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-none"
                          />
                          <button 
                            onClick={handleAddSource}
                            disabled={addingSource || !newSourceUrl}
                            className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition"
                          >
                            Add Link
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Active Links ({sources.length})</span>
                        {sources && sources.length > 0 ? (
                          sources.map((src: any) => (
                            <div key={src.id} className="text-xs flex items-center justify-between bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-xl">
                              <span className="truncate flex-1 font-medium text-zinc-700">{src.url.replace(/^https?:\/\//, '')}</span>
                              <span className="text-[10px] text-zinc-500 uppercase font-bold ml-2">Active</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-zinc-400 italic">No links added yet. Paste your website or blog above.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: VOICE & RULES */}
                  {drawerTab === 'voice' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Writing Rules & Constraints</label>
                        <p className="text-xs text-zinc-500">Tell the AI what style or rules to follow when drafting your posts.</p>
                        <textarea 
                          className="w-full text-xs p-3 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 outline-none resize-none leading-relaxed"
                          rows={4}
                          placeholder="e.g. Keep it punchy. Never use hashtags. Don't use corporate buzzwords like 'game-changer' or 'unleash'."
                          defaultValue={brandProfile.custom_instructions || ''}
                          onBlur={(e) => {
                            if (e.target.value !== brandProfile.custom_instructions) {
                              handleUpdateBrand(brandProfile.id, { custom_instructions: e.target.value });
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tone & Style</label>
                        <div className="flex flex-wrap gap-2">
                          {toneArray.map((tone: any, idx: number) => {
                            const toneLabel = typeof tone === 'string' ? tone : tone?.tone || tone?.name || tone?.value || JSON.stringify(tone);
                            return (
                              <span key={idx} className="px-2.5 py-1 bg-zinc-100 text-zinc-800 rounded-lg text-xs font-semibold border border-zinc-200/60">
                                {toneLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Topics You Post About</label>
                        <div className="space-y-2.5">
                          {pillars && pillars.map((p: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium text-zinc-700">
                                <span>{p.name}</span>
                                <span className="font-bold text-zinc-400">{p.proportion}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-900 rounded-full" style={{ width: `${p.proportion}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Danger Zone: Delete Brand */}
                  <div className="pt-6 border-t border-zinc-200">
                    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-red-900">Delete Brand</h4>
                        <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                          Permanently delete <span className="font-semibold text-zinc-900">{brandProfile.name}</span>, including all scheduled posts, ideas, and history.
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteBrand}
                        disabled={isDeletingBrand}
                        className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        {isDeletingBrand ? 'Deleting brand...' : 'Delete this Brand'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Style Learning Toast */}
        {feedbackPrompt && (
          <div className="fixed bottom-6 right-6 p-5 bg-white border border-zinc-200 shadow-2xl rounded-2xl w-84 animate-in slide-in-from-bottom-4 z-50">
            <h4 className="text-sm font-bold text-zinc-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-900" /> Style Learning
            </h4>
            <p className="text-xs text-zinc-500 mb-4">
              You edited this post. Should we remember this style preference for future drafts?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSaveFeedback(false)}
                disabled={feedbackLoading}
                className="flex-1 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition"
              >
                Just for this post
              </button>
              <button 
                onClick={() => handleSaveFeedback(true)}
                disabled={feedbackLoading}
                className="flex-1 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition"
              >
                {feedbackLoading ? 'Saving...' : 'Remember for future'}
              </button>
            </div>
          </div>
        )}

        {/* Auto-Publishing Graduation Modal */}
        {autopilotModal && (
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mb-4 mx-auto border border-zinc-200">
                <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-center text-zinc-900 mb-2">Turn on automatic posting?</h3>
              <p className="text-xs text-center text-zinc-600 mb-6 leading-relaxed">
                You've approved 5 posts in a row without making changes! Would you like AutoGrowth to start posting automatically, or do you prefer to keep reviewing each post first?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setAutopilotModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition"
                >
                  Keep reviewing first
                </button>
                <button 
                  onClick={async () => {
                    await handleUpdateBrand(brandProfile.id, { autonomy_mode: 'autopilot' });
                    setAutopilotModal(false);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition shadow-sm"
                >
                  Post automatically
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </NavigationLayout>
  );
}