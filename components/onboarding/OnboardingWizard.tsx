'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Twitter,
  Linkedin,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Sparkles,
  Zap,
  Target,
  Calendar,
  Rocket,
  Check,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingState {
  step: number;
  connectedPlatforms: string[];
  prompt: string;
  generatedPersonas: {
    twitter?: GeneratedPersona;
    linkedin?: GeneratedPersona;
  };
  regenerationCount: number;
  postFrequency: number;
  postTime: 'morning' | 'afternoon' | 'evening';
}

interface GeneratedPersona {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS = [
  { id: 'ai-ml', label: 'AI / ML', emoji: '🤖' },
  { id: 'saas', label: 'SaaS', emoji: '☁️' },
  { id: 'startups', label: 'Startups', emoji: '🚀' },
  { id: 'product', label: 'Product', emoji: '🎯' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'finance', label: 'Finance', emoji: '📈' },
  { id: 'crypto', label: 'Crypto / Web3', emoji: '⛓️' },
  { id: 'vc', label: 'Venture Capital', emoji: '💰' },
  { id: 'marketing', label: 'Marketing', emoji: '📣' },
  { id: 'design', label: 'Design', emoji: '🎨' },
  { id: 'leadership', label: 'Leadership', emoji: '🧭' },
  { id: 'productivity', label: 'Productivity', emoji: '⚡' },
  { id: 'health', label: 'Health & Fitness', emoji: '💪' },
  { id: 'sports', label: 'Sports', emoji: '🏆' },
  { id: 'cricket', label: 'Cricket', emoji: '🏏' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'education', label: 'Education', emoji: '📚' },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1x / week', sublabel: 'Minimal' },
  { value: 3, label: '3x / week', sublabel: 'Recommended ✨' },
  { value: 5, label: '5x / week', sublabel: 'Active' },
  { value: 7, label: 'Daily', sublabel: 'Power user' },
];

const TIME_OPTIONS = [
  { value: 'morning' as const, label: 'Morning', icon: Sun, sublabel: '7 – 10 AM' },
  { value: 'afternoon' as const, label: 'Afternoon', icon: Sunset, sublabel: '12 – 3 PM' },
  { value: 'evening' as const, label: 'Evening', icon: Moon, sublabel: '6 – 9 PM' },
];

const STEPS = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Connect' },
  { id: 3, label: 'Prompt' },
  { id: 4, label: 'Review' },
  { id: 5, label: 'Schedule' },
  { id: 6, label: 'Launch' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    connectedPlatforms: [],
    prompt: '',
    generatedPersonas: {},
    regenerationCount: 0,
    postFrequency: 3,
    postTime: 'morning',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [platformConnecting, setPlatformConnecting] = useState<string | null>(null);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [visible, setVisible] = useState(true);
  const [accounts, setAccounts] = useState<Array<{ id: string; platform: string }>>([]);

  // ── Load initial state from API ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch onboarding status
        const [statusRes, accountsRes] = await Promise.all([
          fetch('/api/onboarding/status'),
          fetch('/api/accounts'),
        ]);

        const status = await statusRes.json();
        const accountsData = await accountsRes.json();

        const platforms = (accountsData.accounts || []).map((a: { platform: string }) => a.platform);

        // Check for OAuth callback resuming (platform just connected)
        const url = new URL(window.location.href);
        const connectedParam = url.searchParams.get('connected');

        let startStep = status.step ?? 1;
        if (connectedParam === 'success' && platforms.length > 0) {
          startStep = 3; // Resume at topics after OAuth
          // Clean URL
          window.history.replaceState({}, '', '/onboarding');
        }

        setState(prev => ({
          ...prev,
          step: startStep,
          connectedPlatforms: platforms,
          postFrequency: status.frequency || 3,
          postTime: status.postTime || 'morning',
        }));
        setAccounts(accountsData.accounts || []);
      } catch (e) {
        console.error('Init error', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Step persistence ─────────────────────────────────────────────────────
  const saveStep = useCallback(async (step: number) => {
    try {
      await fetch('/api/onboarding/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });
    } catch {}
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────
  const goTo = useCallback(
    async (nextStep: number, dir: 'forward' | 'back' = 'forward') => {
      setAnimDir(dir);
      setVisible(false);
      await saveStep(nextStep);
      setTimeout(() => {
        setState(prev => ({ ...prev, step: nextStep }));
        setVisible(true);
      }, 220);
    },
    [saveStep]
  );

  const next = () => goTo(state.step + 1, 'forward');
  const back = () => goTo(state.step - 1, 'back');

  // ── Platform connect ────────────────────────────────────────────────────
  const connectPlatform = async (platform: 'twitter' | 'linkedin') => {
    setPlatformConnecting(platform);
    try {
      const res = await fetch(`/api/accounts/quick-connect/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'pending', returnTo: '/onboarding' }),
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setPlatformConnecting(null);
      }
    } catch {
      setPlatformConnecting(null);
    }
  };

  // ── Topic toggle ──────────────────────────────────────────────────────────
  const setPrompt = (prompt: string) => {
    setState(prev => ({ ...prev, prompt }));
  };

  const regeneratePersonas = async () => {
    if (state.regenerationCount >= 3) return;
    setIsGenerating(true);
    
    const twitterAccount = accounts.find(a => a.platform === 'twitter');
    const linkedinAccount = accounts.find(a => a.platform === 'linkedin');
    
    const newPersonas: OnboardingState['generatedPersonas'] = {};
    
    if (twitterAccount) {
      try {
        const res = await fetch('/api/onboarding/generate-personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: state.prompt,
            connectedAccountId: twitterAccount.id,
            platform: 'twitter',
            regenerationCount: state.regenerationCount,
          }),
        });
        const data = await res.json();
        if (data.persona) newPersonas.twitter = data.persona;
      } catch (e) {
        console.error('Failed to regenerate Twitter persona', e);
      }
    }
    
    if (linkedinAccount) {
      try {
        const res = await fetch('/api/onboarding/generate-personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: state.prompt,
            connectedAccountId: linkedinAccount.id,
            platform: 'linkedin',
            regenerationCount: state.regenerationCount,
          }),
        });
        const data = await res.json();
        if (data.persona) newPersonas.linkedin = data.persona;
      } catch (e) {
        console.error('Failed to regenerate LinkedIn persona', e);
      }
    }
    
    if (Object.keys(newPersonas).length > 0) {
      setState(prev => ({
        ...prev,
        generatedPersonas: newPersonas,
        regenerationCount: prev.regenerationCount + 1,
      }));
    }
    setIsGenerating(false);
  };

  // ── Finish ────────────────────────────────────────────────────────────────
  const finish = async () => {
    setSubmitting(true);
    try {
      const twitterAccount = accounts.find(a => a.platform === 'twitter');
      const linkedinAccount = accounts.find(a => a.platform === 'linkedin');
      
      const personasToSave: Array<{ accountId: string; persona: GeneratedPersona }> = [];
      
      if (twitterAccount && state.generatedPersonas.twitter) {
        personasToSave.push({ accountId: twitterAccount.id, persona: state.generatedPersonas.twitter });
      }
      if (linkedinAccount && state.generatedPersonas.linkedin) {
        personasToSave.push({ accountId: linkedinAccount.id, persona: state.generatedPersonas.linkedin });
      }
      
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personas: personasToSave,
          frequency: state.postFrequency,
          postTime: state.postTime,
        }),
      });
      await goTo(6, 'forward');
    } catch {
      setSubmitting(false);
    }
  };

  const goToDashboard = () => router.push('/');

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <WizardSkeleton />;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col" style={{ fontFamily: "'Syne', sans-serif" }}>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-black/6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">AutoGrowth</span>
        </div>

        {/* Step progress pills */}
        <div className="hidden sm:flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const isDone = state.step > s.id;
            const isCurrent = state.step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : isCurrent
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? <Check size={11} /> : <span>{s.id}</span>}
                  <span className="hidden md:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-4 h-px ${isDone ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-400 font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          step {state.step}/{STEPS.length}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible
              ? 'translateX(0)'
              : animDir === 'forward'
              ? 'translateX(24px)'
              : 'translateX(-24px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}
        >
          {state.step === 1 && <StepWelcome onNext={next} />}
          {state.step === 2 && (
            <StepConnect
              connectedPlatforms={state.connectedPlatforms}
              onConnect={connectPlatform}
              connecting={platformConnecting}
              onNext={next}
              onBack={back}
            />
          )}
          {state.step === 3 && (
            <StepPrompt
              prompt={state.prompt}
              onChange={setPrompt}
              isGenerating={isGenerating}
              onGenerate={async () => {
                setIsGenerating(true);
                const twitterAccount = accounts.find(a => a.platform === 'twitter');
                const linkedinAccount = accounts.find(a => a.platform === 'linkedin');
                
                const newPersonas: OnboardingState['generatedPersonas'] = {};
                
                if (twitterAccount) {
                  try {
                    const res = await fetch('/api/onboarding/generate-personas', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: state.prompt,
                        connectedAccountId: twitterAccount.id,
                        platform: 'twitter',
                      }),
                    });
                    const data = await res.json();
                    if (data.persona) newPersonas.twitter = data.persona;
                  } catch (e) {
                    console.error('Failed to generate Twitter persona', e);
                  }
                }
                
                if (linkedinAccount) {
                  try {
                    const res = await fetch('/api/onboarding/generate-personas', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: state.prompt,
                        connectedAccountId: linkedinAccount.id,
                        platform: 'linkedin',
                      }),
                    });
                    const data = await res.json();
                    if (data.persona) newPersonas.linkedin = data.persona;
                  } catch (e) {
                    console.error('Failed to generate LinkedIn persona', e);
                  }
                }
                
                if (Object.keys(newPersonas).length > 0) {
                  setState(prev => ({
                    ...prev,
                    generatedPersonas: newPersonas,
                  }));
                  next();
                }
                setIsGenerating(false);
              }}
              onNext={next}
              onBack={back}
            />
          )}
          {state.step === 4 && (
            <StepReview
              personas={state.generatedPersonas}
              regenerationCount={state.regenerationCount}
              isGenerating={isGenerating}
              onRegenerate={regeneratePersonas}
              onPersonaChange={(platform, updates) => {
                setState(prev => ({
                  ...prev,
                  generatedPersonas: {
                    ...prev.generatedPersonas,
                    [platform]: {
                      ...prev.generatedPersonas[platform as keyof typeof prev.generatedPersonas],
                      ...updates,
                    },
                  },
                }));
              }}
              onNext={next}
              onBack={back}
            />
          )}
          {state.step === 5 && (
            <StepSchedule
              frequency={state.postFrequency}
              postTime={state.postTime}
              onFrequencyChange={v => setState(prev => ({ ...prev, postFrequency: v }))}
              onTimeChange={v => setState(prev => ({ ...prev, postTime: v }))}
              onFinish={finish}
              onBack={back}
              submitting={submitting}
            />
          )}
          {state.step === 6 && <StepLaunch state={state} onGo={goToDashboard} />}
        </div>
      </main>
    </div>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-10">
      {/* Hero icon */}
      <div className="relative inline-block">
        <div className="w-24 h-24 mx-auto bg-black rounded-3xl flex items-center justify-center shadow-2xl shadow-black/20">
          <Sparkles size={44} className="text-white" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-400 rounded-2xl flex items-center justify-center shadow-lg">
          <Rocket size={18} className="text-white" />
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
          Let's set up your
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            growth engine
          </span>
        </h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
          We'll walk you through everything in 5 quick steps. Connect your accounts, describe your goal,
          review your AI personas, set a schedule — and we handle the rest.
        </p>
      </div>

      {/* 3 promise cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { emoji: '⚡', text: 'Takes 2 minutes' },
          { emoji: '🤖', text: 'AI does the work' },
          { emoji: '💸', text: 'Free forever' },
        ].map(({ emoji, text }) => (
          <div
            key={text}
            className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
          >
            <div className="text-2xl mb-2">{emoji}</div>
            <p className="text-sm font-semibold text-gray-700">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2.5 px-8 py-4 bg-black text-white rounded-2xl font-bold text-base hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-black/20"
      >
        Let's go
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

// ─── Step 2: Connect Platforms ────────────────────────────────────────────────

function StepConnect({
  connectedPlatforms,
  onConnect,
  connecting,
  onNext,
  onBack,
}: {
  connectedPlatforms: string[];
  onConnect: (p: 'twitter' | 'linkedin') => void;
  connecting: string | null;
  onNext: () => void;
  onBack: () => void;
}) {
  const twitterConnected = connectedPlatforms.includes('twitter');
  const linkedinConnected = connectedPlatforms.includes('linkedin');
  const anyConnected = twitterConnected || linkedinConnected;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">2</div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Connect accounts</span>
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Where do you want to grow?
        </h2>
        <p className="text-gray-500 text-base">
          Connect at least one platform. You can add more later.
        </p>
      </div>

      <div className="space-y-4">
        {/* Twitter */}
        <PlatformCard
          name="Twitter / X"
          handle="twitter"
          description="AI writes & posts threads, quotes, and replies in your voice"
          icon={<Twitter size={24} />}
          color="#000"
          gradient="from-gray-900 to-gray-700"
          connected={twitterConnected}
          loading={connecting === 'twitter'}
          onConnect={() => onConnect('twitter')}
          disabled={connecting !== null}
        />

        {/* LinkedIn */}
        <PlatformCard
          name="LinkedIn"
          handle="linkedin"
          description="Professional posts and thought leadership on autopilot"
          icon={<Linkedin size={24} />}
          color="#0077B5"
          gradient="from-blue-700 to-blue-500"
          connected={linkedinConnected}
          loading={connecting === 'linkedin'}
          onConnect={() => onConnect('linkedin')}
          disabled={connecting !== null}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!anyConnected}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PlatformCard({
  name,
  description,
  icon,
  gradient,
  connected,
  loading,
  onConnect,
  disabled,
}: {
  name: string;
  handle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
        connected
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}>
          {icon}
        </div>
        <div>
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {connected ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
          <CheckCircle size={13} />
          Connected
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={disabled}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[110px] justify-center"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            'Connect'
          )}
        </button>
      )}
    </div>
  );
}

// ─── Step 3: Prompt ───────────────────────────────────────────────────────────

function StepPrompt({
  prompt,
  onChange,
  onGenerate,
  onNext,
  onBack,
  isGenerating,
}: {
  prompt: string;
  onChange: (p: string) => void;
  onGenerate: () => void;
  onNext: () => void;
  onBack: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">3</div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Your voice</span>
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          What do you want to be known for?
        </h2>
        <p className="text-gray-500 text-base">
          Describe your goal in a sentence or two. Our AI will create your tactical blueprints.
        </p>
      </div>

      <textarea
        value={prompt}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g., I want to be known as the go-to person for SaaS growth tactics and product-led growth insights..."
        className="w-full h-40 p-4 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 font-medium focus:border-black focus:ring-0 focus:outline-none resize-none"
      />

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Writing Blueprint...
            </>
          ) : !prompt.trim() ? (
            <>
              Skip & Generate Baseline
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              Generate Personas
              <Sparkles size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({
  personas,
  regenerationCount,
  onRegenerate,
  onPersonaChange,
  onNext,
  onBack,
  isGenerating,
}: {
  personas: OnboardingState['generatedPersonas'];
  regenerationCount: number;
  onRegenerate: () => void;
  onPersonaChange: (platform: string, updates: Partial<GeneratedPersona>) => void;
  onNext: () => void;
  onBack: () => void;
  isGenerating: boolean;
}) {
  const hasPersonas = personas.twitter || personas.linkedin;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">4</div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Review</span>
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Your Tactical Blueprints
        </h2>
        <p className="text-gray-500 text-base">
          Fine-tune your personas before we launch. You can regenerate up to 3 times.
        </p>
      </div>

      <div className="space-y-4">
        {personas.twitter && (
          <PersonaCard
            platform="twitter"
            persona={personas.twitter}
            onChange={updates => onPersonaChange('twitter', updates)}
          />
        )}
        {personas.linkedin && (
          <PersonaCard
            platform="linkedin"
            persona={personas.linkedin}
            onChange={updates => onPersonaChange('linkedin', updates)}
          />
        )}
      </div>

      {regenerationCount < 3 && (
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin inline mr-2" />
              Mapping RSS feeds...
            </>
          ) : (
            `Regenerate (${3 - regenerationCount} left)`
          )}
        </button>
      )}
      {regenerationCount >= 3 && (
        <p className="text-xs text-gray-400 text-center">
          Fine-tune in dashboard later
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!hasPersonas}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PersonaCard({
  platform,
  persona,
  onChange,
}: {
  platform: string;
  persona: GeneratedPersona;
  onChange: (updates: Partial<GeneratedPersona>) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [name, setName] = useState(persona.name);
  const [description, setDescription] = useState(persona.description);

  const handleSaveName = () => {
    onChange({ name });
    setEditingName(false);
  };

  const handleSaveDesc = () => {
    onChange({ description });
    setEditingDesc(false);
  };

  return (
    <div className="p-5 bg-white border-2 border-gray-100 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {platform === 'twitter' ? <Twitter size={20} /> : <Linkedin size={20} />}
          <span className="font-bold text-gray-900 capitalize">{platform}</span>
          <span className="text-xs text-gray-400">{persona.tone}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 font-medium">Name</label>
          {editingName ? (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-sm font-semibold focus:border-black focus:outline-none"
            />
          ) : (
            <p
              onClick={() => setEditingName(true)}
              className="text-lg font-bold text-gray-900 cursor-pointer hover:text-indigo-600"
            >
              {persona.name}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium">Description</label>
          {editingDesc ? (
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={handleSaveDesc}
              className="w-full mt-1 px-2 py-1 border border-gray-200 rounded text-sm resize-none focus:border-black focus:outline-none"
              rows={2}
            />
          ) : (
            <p
              onClick={() => setEditingDesc(true)}
              className="text-sm text-gray-600 cursor-pointer hover:text-indigo-600"
            >
              {persona.description}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium">Topics</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {persona.topics.map(topic => (
              <span key={topic} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium">RSS Sources</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {persona.rss_sources.slice(0, 3).map(rss => (
              <span key={rss} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs truncate max-w-[200px]">
                {new URL(rss).hostname}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Schedule ─────────────────────────────────────────────────────────

function StepSchedule({
  frequency,
  postTime,
  onFrequencyChange,
  onTimeChange,
  onFinish,
  onBack,
  submitting,
}: {
  frequency: number;
  postTime: 'morning' | 'afternoon' | 'evening';
  onFrequencyChange: (v: number) => void;
  onTimeChange: (v: 'morning' | 'afternoon' | 'evening') => void;
  onFinish: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">4</div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Posting schedule</span>
        </div>
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          How often should we post?
        </h2>
        <p className="text-gray-500 text-base">
          We recommend 3x/week for steady growth. You can change this anytime.
        </p>
      </div>

      {/* Frequency */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Calendar size={15} />
          Posting frequency
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FREQUENCY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onFrequencyChange(opt.value)}
              className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.97] ${
                frequency === opt.value
                  ? 'border-black bg-black text-white shadow-lg'
                  : 'border-gray-100 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="font-bold text-base">{opt.label}</span>
              <span className={`text-xs mt-1 ${frequency === opt.value ? 'text-gray-300' : 'text-gray-400'}`}>
                {opt.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Time of day */}
      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Target size={15} />
          Best time to post
        </label>
        <div className="grid grid-cols-3 gap-3">
          {TIME_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => onTimeChange(opt.value)}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.97] ${
                  postTime === opt.value
                    ? 'border-black bg-black text-white shadow-lg'
                    : 'border-gray-100 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={20} className={postTime === opt.value ? 'text-yellow-300' : 'text-amber-500'} />
                <span className="font-bold text-sm mt-2">{opt.label}</span>
                <span className={`text-xs mt-1 ${postTime === opt.value ? 'text-gray-400' : 'text-gray-400'}`}>
                  {opt.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onFinish}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-black/10"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Setting up…
            </>
          ) : (
            <>
              Launch my growth engine
              <Rocket size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 6: Launch ───────────────────────────────────────────────────────────

function StepLaunch({ state, onGo }: { state: OnboardingState; onGo: () => void }) {
  const freqOption = FREQUENCY_OPTIONS.find(f => f.value === state.postFrequency);
  const timeOption = TIME_OPTIONS.find(t => t.value === state.postTime);

  return (
    <div className="text-center space-y-10">
      {/* Confetti-style hero */}
      <div className="relative">
        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
          <Rocket size={52} className="text-white" />
        </div>
        {/* Floating dots */}
        {['top-0 left-8', 'top-2 right-8', '-bottom-2 left-16', 'bottom-0 right-14'].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-3 h-3 rounded-full animate-bounce`}
            style={{
              backgroundColor: ['#f59e0b', '#6366f1', '#10b981', '#f43f5e'][i],
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          You're all set! 🎉
        </h2>
        <p className="text-gray-500 text-lg">
          Your growth engine is configured and ready to roll.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 text-left shadow-sm space-y-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">What we set up</p>

        <div className="space-y-3">
          {state.connectedPlatforms.length > 0 && (
            <SummaryRow
              emoji="🔗"
              label="Platforms"
              value={state.connectedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ')}
            />
          )}

          {freqOption && (
            <SummaryRow emoji="📅" label="Posting frequency" value={freqOption.label} />
          )}
          {timeOption && (
            <SummaryRow emoji="⏰" label="Best post time" value={`${timeOption.label} (${timeOption.sublabel})`} />
          )}
        </div>
      </div>

      <button
        onClick={onGo}
        className="inline-flex items-center gap-2.5 px-8 py-4 bg-black text-white rounded-2xl font-bold text-base hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-black/20"
      >
        Go to my dashboard
        <ArrowRight size={18} />
      </button>

      <p className="text-xs text-gray-400">
        You can change any of these settings anytime from your account settings.
      </p>
    </div>
  );
}

function SummaryRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg leading-none mt-0.5">{emoji}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WizardSkeleton() {
  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap');`}</style>
      <header className="px-6 py-5 border-b border-black/6">
        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse" />
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-6 px-4">
          <div className="h-12 w-64 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-6 w-96 bg-gray-100 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-12 w-36 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}
