// components/onboarding/OnboardingWizard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap } from 'lucide-react';
import { OnboardingState } from '@/types/onboarding';
import WelcomeStep from '@/components/onboarding/steps/WelcomeStep';
import ConnectStep from '@/components/onboarding/steps/ConnectStep';
import PromptStep from '@/components/onboarding/steps/PromptStep';
import ReviewStep from '@/components/onboarding/steps/ReviewStep';
import ScheduleStep from '@/components/onboarding/steps/ScheduleStep';

const STEPS = ['Welcome', 'Website', 'Preview Posts', 'Schedule', 'Social Accounts'];

export default function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    connectedPlatforms: [],
    sourceUrl: '',
    brandProfile: undefined,
    regenerationCount: 0,
    postFrequency: 3,
    postTime: 'morning',
  });

  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        const url = new URL(window.location.href);
        const connectedParam = url.searchParams.get('connected');
        
        const [statusRes, accountsRes] = await Promise.all([
          fetch('/api/onboarding/status'),
          fetch('/api/accounts'),
        ]);

        const status = await statusRes.json();
        const accountsData = await accountsRes.json();

        const isNewBrand = url.searchParams.get('new') === 'true';

        // If onboarding already completed, redirect to home (unless creating a new brand)
        if (status.completed === true && !isNewBrand) {
          router.push('/');
          return;
        }

        const platforms = (accountsData.accounts || []).map((a: { platform: string }) => a.platform);

        let currentStep = status.step || 1;

        // If creating a new brand, force start from step 1
        if (isNewBrand) {
          currentStep = 1;
        }
        
        let frequency = status.frequency || 3;
        let postTime = status.postTime || 'morning';

        // If returned from OAuth callback, show the Connect step
        if (connectedParam === 'success') {
          currentStep = 5;
          window.history.replaceState({}, '', '/onboarding' + (isNewBrand ? '?new=true' : ''));
          
          try {
            const savedState = localStorage.getItem('onboarding_state');
            if (savedState) {
              const parsed = JSON.parse(savedState);
              if (parsed.postFrequency) frequency = parsed.postFrequency;
              if (parsed.postTime) postTime = parsed.postTime;
              localStorage.removeItem('onboarding_state');
            }
          } catch (e) {
            console.error('Failed to parse saved onboarding state', e);
          }
        }

        setState(prev => ({
          ...prev,
          step: currentStep,
          connectedPlatforms: platforms,
          postFrequency: frequency,
          postTime: postTime,
          brandProfile: status.brandProfile || prev.brandProfile,
          sourceUrl: status.sourceUrl || prev.sourceUrl,
        }));

      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeWorkspace();
  }, []);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = async (newStep: number) => {
    // 1. Optimistically update the UI so the user isn't waiting
    updateState({ step: newStep });

    // 2. Persist the state to the backend silently
    try {
      await fetch('/api/onboarding/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: newStep }),
      });
    } catch (error) {
      console.error('Failed to persist system state:', error);
    }
  };

  const nextStep = () => goToStep(state.step + 1);
  const prevStep = () => goToStep(state.step - 1);

  const handleFinishOnboarding = async () => {
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: state.postFrequency || 3,
          postTime: state.postTime || 'morning',
        }),
      });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 text-zinc-900 animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col text-zinc-900">
      {/* Professional Header */}
      <header className="px-8 py-5 border-b border-zinc-200 bg-white flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide text-zinc-900">AutoGrowth</span>
        </div>
        
        <div className="flex-1 max-w-xs mx-auto ml-12">
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-zinc-900 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(state.step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step {state.step} of {STEPS.length}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">{STEPS[state.step - 1]}</span>
          </div>
        </div>
      </header>

      {/* Dynamic Step Rendering */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl glass-card p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle glow effect behind content */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-900/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          {state.step === 1 && <WelcomeStep onNext={nextStep} />}
          
          {state.step === 2 && (
             <PromptStep 
               state={state} 
               updateState={updateState} 
               onNext={nextStep} 
               onBack={prevStep} 
             />
          )}
          
          {state.step === 3 && (
             <ReviewStep 
               state={state} 
               updateState={updateState} 
               onNext={nextStep} 
               onBack={prevStep} 
             />
          )}
          
          {state.step === 4 && (
             <ScheduleStep 
               state={state} 
               updateState={updateState} 
               onNext={nextStep} 
               onBack={prevStep} 
             />
          )}

          {state.step === 5 && (
             <ConnectStep 
               connectedPlatforms={state.connectedPlatforms} 
               onConnect={() => {
                 localStorage.setItem('onboarding_state', JSON.stringify(state));
               }}
               onNext={handleFinishOnboarding} 
               onBack={prevStep} 
             />
          )}
        </div>
      </main>
    </div>
  );
}