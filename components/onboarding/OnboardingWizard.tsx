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

const STEPS = ['Welcome', 'Connect', 'Your Voice', 'Review', 'Schedule'];

export default function OnboardingWizard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    connectedPlatforms: [],
    prompt: '',
    generatedPersonas: {},
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

        const platforms = (accountsData.accounts || []).map((a: { platform: string }) => a.platform);

        let currentStep = status.step || 1;

        // Force UI to remain on ConnectStep if we just returned from OAuth
        if (connectedParam === 'success' || platforms.length > 0) {
          currentStep = Math.max(currentStep, 2);
          
          // Clean up URL without triggering a re-render
          if (connectedParam) {
            window.history.replaceState({}, '', '/onboarding');
          }
        }

        setState(prev => ({
          ...prev,
          step: currentStep,
          connectedPlatforms: platforms,
          postFrequency: status.frequency || 3,
          postTime: status.postTime || 'morning',
        }));

      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeWorkspace();
  }, []);
// Replace your old updateState, nextStep, and prevStep with this block

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
      // Note: In a production environment, you might want to add retry logic here 
      // if the network request fails, so the DB doesn't fall out of sync with the UI.
    }
  };

  const nextStep = () => goToStep(state.step + 1);
  const prevStep = () => goToStep(state.step - 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 text-zinc-900 animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Loading workspace...</p>
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
          <span className="font-semibold text-sm tracking-wide text-zinc-900">AutoGrowth AI</span>
        </div>
        
        <div className="flex items-center gap-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                state.step === idx + 1 ? 'bg-zinc-900 text-white' : 
                state.step > idx + 1 ? 'text-zinc-900' : 'text-zinc-400'
              }`}>
                {idx + 1}. {label}
              </div>
              {idx < STEPS.length - 1 && <span className="text-zinc-300">/</span>}
            </div>
          ))}
        </div>
      </header>

      {/* Dynamic Step Rendering */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-sm p-8 sm:p-12">
          {state.step === 1 && <WelcomeStep onNext={nextStep} />}
          {state.step === 2 && (
             <ConnectStep 
               connectedPlatforms={state.connectedPlatforms} 
               onNext={nextStep} 
               onBack={prevStep} 
               // Pass down connect handlers...
             />
          )}
          {state.step === 3 && (
             <PromptStep 
               state={state} 
               updateState={updateState} 
               onNext={nextStep} 
               onBack={prevStep} 
             />
          )}
          {state.step === 4 && (
             <ReviewStep 
               state={state} 
               updateState={updateState} 
               onNext={nextStep} 
               onBack={prevStep} 
             />
          )}
          {state.step === 5 && (
             <ScheduleStep 
               state={state} 
               updateState={updateState} 
               onFinish={() => router.push('/')} 
               onBack={prevStep} 
             />
          )}
        </div>
      </main>
    </div>
  );
}