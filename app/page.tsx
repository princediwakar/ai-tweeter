"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import NavigationLayout from "@/components/NavigationLayout";
import { Calendar, Layers, Activity, Settings, Zap, Link2, CheckCircle2, Trash2, Edit2, RefreshCw, CalendarDays, X, Check } from "lucide-react";
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

  if (loading && !data) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-5xl mx-auto space-y-8 flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center text-zinc-400 gap-4">
            <Zap className="h-8 w-8 animate-pulse text-blue-500" />
            <p className="text-sm uppercase tracking-widest font-semibold">Loading Engine...</p>
          </div>
        </div>
      </NavigationLayout>
    );
  }

  if (!data?.brandProfile) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-5xl mx-auto py-24 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <Zap size={32} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900">Welcome to AutoGrowth AI</h1>
          <p className="text-zinc-500 max-w-md mx-auto">
            Your autonomous brand engine is waiting. Let's create your first brand profile and start generating content.
          </p>
          <Link href="/onboarding" className="inline-flex px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
            Set up your brand
          </Link>
        </div>
      </NavigationLayout>
    );
  }

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
      
      toast.success('Engine generation started!');
      
      // Refresh dashboard data
      const url = activeBrandId ? `/api/dashboard?brandId=${activeBrandId}` : "/api/dashboard";
      const dashRes = await fetch(url);
      setData(await dashRes.json());
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger engine');
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
      toast.success('Brand updated successfully!');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update brand');
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleDeletePost = async (calendarId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/engine/calendar/${calendarId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success('Post removed from schedule');
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
      toast.success('Regeneration started! Check back shortly.');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger regeneration');
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
      
      // If consecutive approved hits 5, show modal
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
        toast.success('Post updated successfully!');
      }
      
      setEditingPostId(null);
      setReschedulingPostId(null);
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update post');
    } finally { setIsProcessing(false); }
  };

  const refreshDashboard = async () => {
    const url = activeBrandId ? `/api/dashboard?brandId=${activeBrandId}` : "/api/dashboard";
    const dashRes = await fetch(url);
    setData(await dashRes.json());
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
        toast.success('Engine updated with your feedback!');
        await refreshDashboard();
      }
    } catch (err) {
      toast.error('Failed to save feedback');
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
      
      toast.success('Source added to Diet! The engine will process it shortly.');
      setNewSourceUrl('');
      await refreshDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add source');
    } finally {
      setAddingSource(false);
    }
  };

  const { brandProfile, allBrands, pillars, upcomingPosts, schedule, sources } = data;
  const toneArray = Array.isArray(brandProfile.tone_of_voice) ? brandProfile.tone_of_voice : [];

  return (
    <NavigationLayout>
      <div className="w-full max-w-6xl mx-auto space-y-10 pb-24">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{brandProfile.name}</h1>
              {allBrands && allBrands.length > 1 && (
                <select 
                  className="bg-zinc-100 border-none text-sm font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-zinc-700"
                  value={brandProfile.id}
                  onChange={(e) => setActiveBrandId(e.target.value)}
                >
                  {allBrands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-zinc-500 mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Autonomous Engine Active
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/onboarding?new=true" className="px-4 py-2 bg-white border border-zinc-200 text-sm font-medium rounded-lg text-zinc-700 hover:bg-zinc-50 transition">
              + New Brand
            </Link>
            <button 
              onClick={handleForceGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-200 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Force Generate Now'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Identity Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-md overflow-hidden">
                  {brandProfile.brand_url ? (
                    <img src={`https://www.google.com/s2/favicons?domain=${brandProfile.brand_url}&sz=64`} alt="Brand Icon" className="w-full h-full object-cover" />
                  ) : (
                    <Activity size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Brand Identity</h3>
                  <p className="text-xs font-medium text-zinc-500">{brandProfile.industry}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Voice Tone</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {toneArray.map((tone: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md text-xs font-medium border border-zinc-200/60">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Archetype</label>
                  <p className="text-sm font-medium text-zinc-800 mt-1">{brandProfile.description}</p>
                </div>
              </div>
            </div>

            {/* Content Pillars */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Content Pillars</h3>
                  <p className="text-xs font-medium text-zinc-500">Distribution strategy</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {pillars.map((pillar: any, i: number) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-zinc-800">{pillar.name}</span>
                      <span className="font-bold text-zinc-400">{pillar.proportion}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pillar.proportion}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Connected Accounts</h3>
                  <p className="text-xs font-medium text-zinc-500">For this brand</p>
                </div>
              </div>

              <div className="space-y-3">
                {['twitter', 'linkedin'].map(platform => {
                  const isConnected = platform === 'twitter' 
                    ? !!brandProfile.twitter_account_id
                    : !!brandProfile.linkedin_account_id;
                    
                  const platformAccounts = socialAccounts ? socialAccounts[platform as 'twitter' | 'linkedin'] : [];
                  
                  return (
                    <div key={platform} className={`p-3 rounded-xl border flex flex-col gap-2 ${isConnected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                            <PlatformIcon platform={platform as 'twitter' | 'linkedin'} className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-semibold capitalize text-zinc-900">{platform}</span>
                        </div>
                        
                        {!isConnected && platformAccounts.length === 0 && (
                          <button
                            onClick={() => window.location.href = `/api/oauth/initiate?platform=${platform}&brandId=${brandProfile.id}&callbackUrl=/`}
                            className="text-xs font-medium px-3 py-1 bg-white border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50 transition"
                          >
                            Connect New
                          </button>
                        )}
                      </div>

                      {platformAccounts.length > 0 && (
                        <div className="mt-2">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Select Account / Page</label>
                          <select 
                            className="w-full bg-white border border-zinc-200 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-zinc-700"
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
                      
                      {platformAccounts.length > 0 && (
                         <div className="flex justify-end mt-1">
                           <button
                             onClick={() => window.location.href = `/api/oauth/initiate?platform=${platform}&brandId=${brandProfile.id}&callbackUrl=/`}
                             className="text-[10px] text-zinc-500 hover:text-blue-600 underline"
                           >
                             Connect another {platform} account
                           </button>
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engine Brain & Autonomy */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Your AI Partner</h3>
                  <p className="text-xs font-medium text-zinc-500">Review & Sources</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-2">Publishing Workflow</label>
                  <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg">
                    <button 
                      onClick={() => handleUpdateBrand(brandProfile.id, { autonomy_mode: 'copilot' })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${brandProfile.autonomy_mode !== 'autopilot' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Review before posting
                    </button>
                    <button 
                      onClick={() => handleUpdateBrand(brandProfile.id, { autonomy_mode: 'autopilot' })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${brandProfile.autonomy_mode === 'autopilot' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                      Auto-publish
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    {brandProfile.autonomy_mode === 'autopilot' 
                      ? "We'll post automatically for you." 
                      : "You'll review every post before it goes live."}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-2">Custom Instructions</label>
                  <textarea 
                    className="w-full text-xs p-2 border border-zinc-200 rounded-md bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    rows={3}
                    placeholder="e.g. Never use emojis. Always link to my newsletter..."
                    defaultValue={brandProfile.custom_instructions || ''}
                    onBlur={(e) => {
                      if (e.target.value !== brandProfile.custom_instructions) {
                        handleUpdateBrand(brandProfile.id, { custom_instructions: e.target.value });
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-2">Inspiration Sources</label>
                  <div className="space-y-2 mb-2">
                    {sources && sources.length > 0 ? sources.map((src: any) => (
                      <div key={src.id} className="text-xs flex items-center justify-between bg-zinc-50 border border-zinc-200 px-2 py-1.5 rounded-md">
                        <span className="truncate flex-1 font-medium text-zinc-700">{src.url.replace(/^https?:\/\//, '')}</span>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold ml-2">{src.crawl_status}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-zinc-500 italic">No sources added yet.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      placeholder="Paste URL (e.g. blog post, YouTube)" 
                      value={newSourceUrl}
                      onChange={e => setNewSourceUrl(e.target.value)}
                      className="flex-1 text-xs p-2 border border-zinc-200 rounded-md bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      onClick={handleAddSource}
                      disabled={addingSource || !newSourceUrl}
                      className="px-3 py-1 bg-zinc-900 text-white text-xs font-semibold rounded-md hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Feed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar & Pipeline */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm h-full">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">Upcoming Pipeline</h3>
                    <p className="text-xs font-medium text-zinc-500">
                      {schedule ? `Posting ${Array.isArray(schedule.days_of_week) ? schedule.days_of_week.length : 3}x per week` : 'Schedule active'}
                    </p>
                  </div>
                </div>
              </div>

              {upcomingPosts.length === 0 ? (
                <div className="text-center py-16 px-4 bg-zinc-50 rounded-xl border border-zinc-100 border-dashed relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  <Zap className="h-10 w-10 text-blue-400 mx-auto mb-3 animate-pulse" />
                  <p className="text-zinc-900 font-medium mb-1">Studying your brand...</p>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                    We're crafting your first few posts right now. They'll appear here in a few seconds.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingPosts.map((post: any, i: number) => {
                    const isExpanded = expandedPosts.has(i);
                    return (
                      <div 
                        key={i} 
                        className="flex gap-4 p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors group cursor-pointer"
                        onClick={() => {
                          setExpandedPosts(prev => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          });
                        }}
                      >
                        <div className="flex flex-col items-center pt-1 min-w-[60px]">
                          <span className="text-xs font-bold text-zinc-400 uppercase">{new Date(post.planned_date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className="text-xl font-black text-zinc-900 leading-tight">{new Date(post.planned_date).getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-100">
                              {post.pillar_name || 'General'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                post.post_status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {post.post_status || 'Drafting'}
                              </span>
                              {post.planned_platform && (
                                <div className="p-1 rounded bg-zinc-100 border border-zinc-200">
                                  <PlatformIcon platform={post.planned_platform as 'twitter' | 'linkedin'} className="w-3.5 h-3.5 text-zinc-500" />
                                </div>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                                className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                title="Remove from schedule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          {/* CONTENT AREA */}
                          {editingPostId === post.id ? (
                            <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
                              <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full min-h-[100px] p-2 text-sm text-zinc-800 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                                placeholder="Edit your post content..."
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingPostId(null)} className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded flex items-center gap-1 transition-colors">
                                  <X className="w-3.5 h-3.5" /> Cancel
                                </button>
                                <button disabled={isProcessing} onClick={() => handleUpdatePost(post.id, { content: editContent })} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1 transition-colors">
                                  <Check className="w-3.5 h-3.5" /> Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-sm font-medium text-zinc-800 mt-2 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                              {post.content || post.angle || 'Content is currently being generated by the engine...'}
                            </p>
                          )}
                          
                          {/* RESCHEDULE OVERLAY */}
                          {reschedulingPostId === post.id && (
                            <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md" onClick={e => e.stopPropagation()}>
                              <CalendarDays className="w-4 h-4 text-blue-600" />
                              <input 
                                type="date" 
                                value={rescheduleDate}
                                onChange={e => setRescheduleDate(e.target.value)}
                                className="text-sm bg-white border border-blue-200 rounded px-2 py-1 outline-none" 
                              />
                              <div className="flex-1" />
                              <button onClick={() => setReschedulingPostId(null)} className="p-1 text-zinc-500 hover:bg-blue-100 rounded">
                                <X className="w-4 h-4" />
                              </button>
                              <button disabled={!rescheduleDate || isProcessing} onClick={() => handleUpdatePost(post.id, { planned_date: rescheduleDate })} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded">
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* ACTION BAR (Visible when expanded) */}
                          {isExpanded && !editingPostId && !reschedulingPostId && (
                            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              {post.content && (
                                <button 
                                  onClick={() => { setEditContent(post.content); setEditingPostId(post.id); }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleRegeneratePost(post.id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                              </button>
                              
                              <button 
                                onClick={() => { setRescheduleDate(new Date(post.planned_date).toISOString().split('T')[0]); setReschedulingPostId(post.id); }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <CalendarDays className="w-3.5 h-3.5" /> Reschedule
                              </button>
                              
                              <div className="flex-1" />
                              
                              {brandProfile.autonomy_mode === 'copilot' && post.post_status !== 'ready' && post.content && (
                                <button 
                                  onClick={() => handleApprovePost(post.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleDeletePost(post.id)}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                          )}
                          
                          {/* COLLAPSED HINT */}
                          {!isExpanded && post.content && post.content.length > 100 && (
                            <p className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              Click to see full post
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Feedback Overlay */}
        {feedbackPrompt && (
          <div className="fixed bottom-6 right-6 p-4 bg-white border border-zinc-200 shadow-xl rounded-xl w-80 animate-in slide-in-from-bottom-4 z-50">
            <h4 className="text-sm font-bold text-zinc-900 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" /> Quick question
            </h4>
            <p className="text-xs text-zinc-500 mb-4">You just tweaked that post. Should I remember your changes for next time?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleSaveFeedback(false)}
                disabled={feedbackLoading}
                className="flex-1 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
              >
                No, just this once
              </button>
              <button 
                onClick={() => handleSaveFeedback(true)}
                disabled={feedbackLoading}
                className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {feedbackLoading ? 'Learning...' : 'Yes, remember this'}
              </button>
            </div>
          </div>
        )}

        {/* Autopilot Modal */}
        {autopilotModal && (
          <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-center text-zinc-900 mb-2">Looks like we're in sync!</h3>
              <p className="text-sm text-center text-zinc-600 mb-6">
                You've loved the last 5 posts exactly as they were! Want me to start posting them automatically for you?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setAutopilotModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Keep reviewing first
                </button>
                <button 
                  onClick={async () => {
                    await handleUpdateBrand(brandProfile.id, { autonomy_mode: 'autopilot' });
                    setAutopilotModal(false);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                  Yes, auto-publish for me
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}