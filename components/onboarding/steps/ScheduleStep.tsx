import { ArrowLeft, ArrowRight, Loader2, Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import { OnboardingState } from '@/types/onboarding';

export default function ScheduleStep({ 
  state, 
  updateState, 
  onFinish, 
  onBack 
}: { 
  state: OnboardingState; 
  updateState: (s: Partial<OnboardingState>) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

const handleDeploy = async () => {
    setSubmitting(true);
    
    try {
      // 1. Fetch active nodes again to ensure we map personas to the right IDs
      const accountsRes = await fetch('/api/accounts');
      const accountsData = await accountsRes.json();
      const accounts = accountsData.accounts || [];

      const twitterNode = accounts.find((a: any) => a.platform === 'twitter');
      const linkedinNode = accounts.find((a: any) => a.platform === 'linkedin');
      
      const modelsToDeploy: Array<{ accountId: string; persona: any }> = [];
      
      if (twitterNode && state.generatedPersonas.twitter) {
        modelsToDeploy.push({ accountId: twitterNode.id, persona: state.generatedPersonas.twitter });
      }
      if (linkedinNode && state.generatedPersonas.linkedin) {
        modelsToDeploy.push({ accountId: linkedinNode.id, persona: state.generatedPersonas.linkedin });
      }
      
      // 2. Commit the configuration to the database
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personas: modelsToDeploy,
          frequency: state.postFrequency,
          postTime: state.postTime,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to finalize deployment');
      }

      // 3. Reroute to Command Center
      onFinish();
    } catch (error) {
      console.error('Deployment failure:', error);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Deployment Cadence</h2>
        <p className="text-sm text-zinc-500">Configure how frequently the engine interacts with your network.</p>
      </div>

      <div className="space-y-6">
        {/* Frequency */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-500" />
            Posting Volume
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: 3, label: 'Standard (3x / week)' },
              { val: 7, label: 'Aggressive (Daily)' }
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => updateState({ postFrequency: opt.val })}
                className={`p-4 rounded-xl border text-sm font-medium text-left transition-all ${
                  state.postFrequency === opt.val
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            Active Window
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['morning', 'afternoon', 'evening'].map(time => (
              <button
                key={time}
                onClick={() => updateState({ postTime: time as any })}
                className={`p-3 rounded-xl border text-sm font-medium capitalize text-center transition-all ${
                  state.postTime === time
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-100">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <button
          onClick={handleDeploy}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Finalizing deployment...</>
          ) : (
            <>Deploy Engine <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}