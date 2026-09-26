import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Target, CheckCircle2, FileText, Fingerprint } from 'lucide-react';
import { OnboardingState } from '@/types/onboarding';

export default function ReviewStep({ 
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
  const [isSaving, setIsSaving] = useState(false);
  const { brandProfile } = state;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Create the actual DB entries
      const res = await fetch('/api/onboarding/finalize-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandProfile, 
          sourceUrl: state.sourceUrl 
        }),
      });
      
      if (res.ok) {
        onNext();
      } else {
        console.error('Failed to save brand profile');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!brandProfile) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <FileText className="h-8 w-8 text-zinc-400" />
        <p className="text-sm text-zinc-500">No profile generated. Please go back.</p>
        <button onClick={onBack} className="text-sm text-zinc-900 underline">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">Your Autonomous Brand</h2>
        <p className="text-sm text-zinc-500">We analyzed your content. Here is the ghostwriter we built for you.</p>
      </div>

      <div className="p-6 border border-zinc-200 rounded-2xl space-y-6 bg-white shadow-sm">
        <div className="flex items-start gap-4 pb-6 border-b border-zinc-100">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
            <Fingerprint className="h-6 w-6 text-zinc-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{brandProfile.name}</h3>
            <p className="text-sm text-zinc-500 font-medium">{brandProfile.archetype}</p>
            <p className="text-sm text-zinc-700 mt-2 leading-relaxed">{brandProfile.description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              Tone of Voice
            </label>
            <div className="flex flex-wrap gap-2">
              {brandProfile.tone_of_voice.map((tone, i) => (
                <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium border border-zinc-200/60">
                  {tone}
                </span>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              Target Audience
            </label>
            <div className="flex flex-wrap gap-2">
              {brandProfile.target_audience.map((aud, i) => (
                <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-medium border border-zinc-200/60">
                  {aud}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="pt-4 space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Target className="h-3.5 w-3.5" /> Sample Live Drafts
          </label>
          <p className="text-xs text-zinc-500 mb-4">If we were running your account today, here is what we would post.</p>
          <div className="space-y-4">
            {brandProfile.sample_posts && brandProfile.sample_posts.length > 0 ? (
              brandProfile.sample_posts.map((post: string, i: number) => (
                <div key={i} className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 transition-colors">
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap">{post}</p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 italic">
                No sample posts generated. Please try again.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-100">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving Engine...</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Looks good, create engine</>
          )}
        </button>
      </div>
    </div>
  );
}