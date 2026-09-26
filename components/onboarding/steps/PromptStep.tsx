import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Link as LinkIcon, Sparkles } from 'lucide-react';
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
  const [url, setUrl] = useState(state.sourceUrl || '');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!url || url.length < 5) {
      setError('Please enter a valid URL');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      // Clean up URL if they just typed "example.com"
      let finalUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        finalUrl = 'https://' + url;
      }

      const res = await fetch('/api/onboarding/analyze-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.brand) {
        updateState({ 
          sourceUrl: finalUrl,
          brandProfile: data.brand
        });
        onNext();
      } else {
        setError(data.error || 'Failed to analyze website. Please try another link.');
      }
    } catch (error) {
      console.error("Compilation error:", error);
      setError('Network error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">What is your website or blog?</h2>
        <p className="text-sm text-zinc-500">Paste your link. We'll read your content to understand your business and draft relevant posts.</p>
      </div>

      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <label htmlFor="url" className="text-sm font-medium text-zinc-900 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-zinc-500" />
            Website or Blog URL
          </label>
          <div className="relative">
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. yourstartup.com or you.substack.com"
              className="w-full p-4 pl-4 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all bg-white shadow-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
        
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex gap-3 items-start">
          <div className="bg-zinc-200 rounded-lg p-2 mt-0.5">
            <Sparkles className="h-4 w-4 text-zinc-700" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">How it works</h4>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              We read your homepage and recent articles to discover what topics you talk about. Then we draft posts ready to share on Twitter and LinkedIn.
            </p>
          </div>
        </div>
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
          disabled={isGenerating || url.trim().length < 5}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-all duration-300 disabled:opacity-50 relative overflow-hidden"
        >
          {isGenerating ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-50 animate-pulse"></div>
              <Sparkles className="h-4 w-4 animate-pulse relative z-10" /> 
              <span className="ai-thinking-text relative z-10 w-48 text-left">Analyzing website...</span>
            </>
          ) : (
            <>Draft My Posts <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}