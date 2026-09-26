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
    fetchDashboardData();
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
            Start Magic Onboarding
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
      toast.success('Post updated successfully!');
      
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

  const { brandProfile, allBrands, pillars, upcomingPosts, schedule } = data;
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
                  const isConnected = data.accounts?.some((acc: any) => acc.platform === platform && acc.is_active);
                  return (
                    <div key={platform} className={`p-3 rounded-xl border flex items-center justify-between ${isConnected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center">
                          <PlatformIcon platform={platform as 'twitter' | 'linkedin'} className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold capitalize text-zinc-900">{platform}</span>
                      </div>
                      
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          <CheckCircle2 className="h-3 w-3" /> CONNECTED
                        </span>
                      ) : (
                        <button
                          onClick={() => window.location.href = `/api/oauth/initiate?platform=${platform}&brandId=${brandProfile.id}&callbackUrl=/`}
                          className="text-xs font-medium px-3 py-1 bg-white border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50 transition"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
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
                <div className="text-center py-16 px-4 bg-zinc-50 rounded-xl border border-zinc-100 border-dashed">
                  <Calendar className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                  <p className="text-zinc-900 font-medium mb-1">Calendar is being generated</p>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                    The autonomous engine is currently drafting your first batch of posts based on your content pillars. Check back in a few minutes.
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
      </div>
    </NavigationLayout>
  );
}