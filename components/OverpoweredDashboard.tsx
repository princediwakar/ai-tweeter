'use client';

import { useTweetDashboard } from '@/hooks/useTweetDashboard';
import { PresenceController } from '@/components/dashboard/PresenceController';
import { IdentityMatrix } from '@/components/dashboard/IdentityMatrix';
import { TheForge } from '@/components/dashboard/TheForge';
import { Archive } from '@/components/dashboard/Archive';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Activity, Shield, TrendingUp, Zap } from 'lucide-react';

export default function OverpoweredDashboard() {
  const {
    tweets,
    loading,
    generateForm,
    accounts,
    selectedAccount,
    setGenerateForm,
    generateTweet,
    bulkGenerateTweets,
    postTweet,
    deleteTweet,
    switchAccount,
    refreshAccounts,
    getQualityGradeColor,
    formatForUserDisplay,
    personas,
  } = useTweetDashboard();

  const hasAccounts = accounts.length > 0;
  const currentAccount = accounts.find(a => a.id === selectedAccount) || null;

  if (!hasAccounts && !loading) {
    return (
      <div className="w-full max-w-5xl py-20 animate-fade-in">
        <OnboardingFlow />
      </div>
    );
  }

  return (
    <div className="dark bg-black min-h-screen">
      <div className="w-full max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-1000">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* SIDE BLADE: Presence & Stats */}
          <aside className="lg:col-span-4 flex flex-col gap-10">
            
            {/* PRESENCE */}
            <section className="flex flex-col gap-4">
              <h2 className="text-[10px] uppercase font-black text-white/70 tracking-[0.2em]">Presence Node</h2>
            <PresenceController 
              accounts={accounts as any}
              selectedAccount={currentAccount as any}
              onSwitchAccount={switchAccount}
              onRefresh={refreshAccounts}
            />
          </section>

          {/* IDENTITY */}
          <section>
            <IdentityMatrix 
              personas={personas}
              selectedPersona={generateForm.persona}
              onSelect={(id) => setGenerateForm(prev => ({ ...prev, persona: id }))}
            />
          </section>

          {/* VITAL CORE (Quick Stats) */}
          <section className="flex flex-col gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Shield className="w-20 h-20 text-violet-500" />
            </div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-white/40">Vital Core</h3>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-black italic text-violet-400 tracking-tighter">
                  {tweets.filter(t => t.status === 'posted').length}
                </span>
                <span className="text-[8px] uppercase font-black tracking-widest text-white/20">Manifested</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black italic text-cyan-400 tracking-tighter">
                  {tweets.filter(t => t.status === 'ready').length}
                </span>
                <span className="text-[8px] uppercase font-black tracking-widest text-white/20">Pending Pulse</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">System Synchronized</span>
            </div>
          </section>
        </aside>

        {/* MAIN COMMAND: Creation & Archive */}
        <main className="lg:col-span-8 flex flex-col gap-16">
          
          {/* THE FORGE */}
          <section>
            <TheForge 
              form={generateForm}
              loading={loading}
              personas={personas}
              onFormChange={(updates) => setGenerateForm(prev => ({ ...prev, ...updates }))}
              onGenerate={generateTweet}
              onBulkGenerate={bulkGenerateTweets}
            />
          </section>

          {/* THE ARCHIVE */}
          <section className="animate-in slide-in-from-bottom-4 duration-700">
            <Archive 
              tweets={tweets}
              onPost={postTweet}
              onDelete={deleteTweet}
              getQualityColor={getQualityGradeColor}
              formatDate={formatForUserDisplay}
            />
          </section>
        </main>

      </div>

      {/* GLITCH DECOR (Optional Overpowered feel) */}
      <div className="fixed bottom-8 right-8 pointer-events-none opacity-20">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-white/40">ANTIGRAVITY_v2.0.1</span>
          <span className="text-[10px] font-mono text-violet-500/40 tracking-tighter">CORE_DASHBOARD_STABLE</span>
        </div>
      </div>
    </div>
  </div>
  );
}
