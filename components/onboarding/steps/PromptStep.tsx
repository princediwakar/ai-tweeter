import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, BrainCircuit } from 'lucide-react';
import { OnboardingState } from '@/types/onboarding';

export default function PromptStep({ 
  state, 
  updateState, 
  onNext, 
  onBack 
}: { 
  state: OnboardingState; 
  updateState: (s: Partial<OnboardingState>) => void;
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [isGenerating, setIsGenerating] = useState(false);

const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // 1. Fetch active nodes to get their IDs
      const accountsRes = await fetch('/api/accounts');
      const accountsData = await accountsRes.json();
      const accounts = accountsData.accounts || [];

      const twitterNode = accounts.find((a: any) => a.platform === 'twitter');
      const linkedinNode = accounts.find((a: any) => a.platform === 'linkedin');

      const newPersonas: any = {};

      // 2. Compile X / Twitter Model
      if (twitterNode) {
        const res = await fetch('/api/onboarding/generate-personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: state.prompt,
            connectedAccountId: twitterNode.id,
            platform: 'twitter',
          }),
        });
        const data = await res.json();
        if (data.persona) newPersonas.twitter = data.persona;
      }

      // 3. Compile LinkedIn Model
      if (linkedinNode) {
        const res = await fetch('/api/onboarding/generate-personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: state.prompt,
            connectedAccountId: linkedinNode.id,
            platform: 'linkedin',
          }),
        });
        const data = await res.json();
        if (data.persona) newPersonas.linkedin = data.persona;
      }

      // 4. Update state and advance
      if (Object.keys(newPersonas).length > 0) {
        updateState({ generatedPersonas: newPersonas });
        onNext();
      } else {
        console.error("Failed to generate models.");
        // In a real app, fire a toast error here: toast.error("Model generation failed")
      }
    } catch (error) {
      console.error("Compilation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">What do you want to be known for?</h2>
        <p className="text-sm text-zinc-500">Tell us about yourself, your industry, and your goals. We'll use this to create content that sounds just like you.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="prompt" className="text-sm font-medium text-zinc-900">
          Your background and goals
        </label>
        <textarea
          id="prompt"
          value={state.prompt}
          onChange={(e) => updateState({ prompt: e.target.value })}
          placeholder="e.g., I'm a product manager at a B2B SaaS company. I want to share insights about building great products, leading teams, and navigating career growth. My audience is other PMs and founders. Keep it practical and actionable."
          className="w-full h-40 p-4 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none transition-all"
        />
      </div>

      <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-100">
        <button
          onClick={onBack}
          disabled={isGenerating}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || state.prompt.trim().length < 10}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating your voice...</>
          ) : (
            <><BrainCircuit className="h-4 w-4" /> Create my voice</>
          )}
        </button>
      </div>
    </div>
  );
}