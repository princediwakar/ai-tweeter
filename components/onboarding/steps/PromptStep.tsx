// components/onboarding/steps/PromptStep.tsx
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, BrainCircuit, UserCheck, LayoutTemplate, Newspaper } from 'lucide-react';
import { OnboardingState } from '@/types/onboarding';

const PREDEFINED_OPTIONS = [
  { id: 'saas_operator', title: 'The SaaS Operator', desc: 'Pragmatic, growth-focused, execution-oriented' },
  { id: 'developer', title: 'The Builder / Engineer', desc: 'Technical, fast-moving, authentic' },
  { id: 'marketer', title: 'The Growth Marketer', desc: 'Psychology, unit economics, engaging' },
  { id: 'data_scientist', title: 'The AI/Data Engineer', desc: 'Analytical, anti-hype, grounded' },
];

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
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined');
  const [selectedPredefined, setSelectedPredefined] = useState<string>('saas_operator');
  const [includeRss, setIncludeRss] = useState(false);

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
            prompt: mode === 'custom' ? state.prompt : '',
            connectedAccountId: twitterNode.id,
            platform: 'twitter',
            predefinedKey: mode === 'predefined' ? selectedPredefined : undefined,
            includeRss: mode === 'custom' ? includeRss : false,
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
            prompt: mode === 'custom' ? state.prompt : '',
            connectedAccountId: linkedinNode.id,
            platform: 'linkedin',
            predefinedKey: mode === 'predefined' ? selectedPredefined : undefined,
            includeRss: mode === 'custom' ? includeRss : false,
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
        <p className="text-sm text-zinc-500">Pick a ready-made template or describe your unique style. We'll use this to create your AI voice.</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 space-x-1 bg-zinc-100/80 rounded-xl max-w-sm">
        <button
          onClick={() => setMode('predefined')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === 'predefined' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Templates (Fast)
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            mode === 'custom' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Custom AI Persona
        </button>
      </div>

      {mode === 'predefined' ? (
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-900">Select an archetype</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PREDEFINED_OPTIONS.map(opt => (
              <div
                key={opt.id}
                onClick={() => setSelectedPredefined(opt.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPredefined === opt.id 
                    ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 shadow-sm' 
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className={`h-4 w-4 ${selectedPredefined === opt.id ? 'text-zinc-900' : 'text-zinc-400'}`} />
                  <span className="font-semibold text-zinc-900 text-sm">{opt.title}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{opt.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 pt-2 flex items-center gap-1.5">
             <LayoutTemplate className="h-3 w-3" /> Pre-built templates generate content purely based on past memory and core thesis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-medium text-zinc-900">
              Your background and goals
            </label>
            <textarea
              id="prompt"
              value={state.prompt}
              onChange={(e) => updateState({ prompt: e.target.value })}
              placeholder="e.g., I'm a product manager at a B2B SaaS company. I want to share insights about building great products, leading teams, and navigating career growth. My audience is other PMs and founders. Keep it practical and actionable."
              className="w-full h-32 p-4 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none transition-all"
            />
          </div>
          
          <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 bg-white cursor-pointer hover:bg-zinc-50/50 transition-colors">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                checked={includeRss}
                onChange={(e) => setIncludeRss(e.target.checked)}
                className="w-4 h-4 text-zinc-900 bg-zinc-100 border-zinc-300 rounded focus:ring-zinc-900 focus:ring-2"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                 <Newspaper className="h-3.5 w-3.5 text-zinc-500" />
                 Include Industry News & RSS (Optional)
              </span>
              <span className="text-xs text-zinc-500 mt-0.5">
                Automatically finds RSS feeds to curate topical news. Generating this AI profile takes ~30 seconds longer.
              </span>
            </div>
          </label>
        </div>
      )}

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
          disabled={isGenerating || (mode === 'custom' && state.prompt.trim().length < 10)}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Creating your AI Profile...</>
          ) : (
            <><BrainCircuit className="h-4 w-4" /> Create my AI Profile</>
          )}
        </button>
      </div>
    </div>
  );
}