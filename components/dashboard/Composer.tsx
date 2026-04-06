// components/dashboard/Composer.tsx
'use client';

import { useState } from 'react';
import { Wand2, Zap, Settings2, Sparkles, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenerateFormState, Persona } from '@/types/dashboard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ComposerProps {
  form: GenerateFormState;
  loading: boolean;
  personas: Persona[];
  bulkCount: number;
  onFormChange: (updates: Partial<GenerateFormState>) => void;
  onGenerate: () => void;
  onBulkGenerate: () => void;
}

export function Composer({
  form,
  loading,
  personas,
  bulkCount,
  onFormChange,
  onGenerate,
  onBulkGenerate
}: ComposerProps) {
  const [showOptions, setShowOptions] = useState(false);
  const router = useRouter();
  const currentPersona = personas.find(p => p.id === form.persona);
  const hasNoPersonas = personas.length === 0;

  // STRATEGIC LOCK: Prevent backend rejections by enforcing the rule on the frontend
  const isPromptValid = form.customPrompt && form.customPrompt.trim().length >= 10;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8">
      <div className="relative mb-4">
        <textarea
          value={form.customPrompt}
          onChange={(e) => onFormChange({ customPrompt: e.target.value })}
          placeholder="What's the topic for your next post? (Min 10 characters)"
          className="w-full h-32 p-4 bg-gray-50/50 border border-transparent focus:border-indigo-100 focus:bg-white rounded-xl text-gray-900 placeholder:text-gray-400 resize-none transition-all outline-none"
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-100 p-1 rounded-lg shadow-sm">
          {hasNoPersonas ? (
            <div className="flex items-center gap-2 px-2 py-1">
              <AlertCircle size={14} className="text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">No personas</span>
              <Link 
                href="/personas" 
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
              >
                Create one
              </Link>
            </div>
          ) : (
            <>
              <select
                value={form.persona}
                onChange={(e) => onFormChange({ persona: e.target.value })}
                className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-gray-600 appearance-none pr-6 pl-2"
              >
                {personas.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
            className={`h-9 w-9 p-0 rounded-lg transition-colors ${showOptions ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}
          >
            <Settings2 size={16} />
          </Button>
          
          {showOptions && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 transition-all">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={form.includeHashtags}
                  onChange={(e) => onFormChange({ includeHashtags: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">#hashtags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={form.useTrendingTopics}
                  onChange={(e) => onFormChange({ useTrendingTopics: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">RSS / trending</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasNoPersonas ? (
            <Button
              onClick={() => router.push('/personas')}
              className="h-10 px-6 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 shadow-sm transition-all active:scale-95"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Create Persona
            </Button>
          ) : (
            <>
              <Button
                onClick={onBulkGenerate}
                disabled={loading || !isPromptValid}
                variant="ghost"
                className="h-10 px-4 text-gray-500 text-sm font-semibold hover:bg-gray-100 rounded-xl disabled:opacity-40"
              >
                <Zap className="h-4 w-4 mr-2" />
                Bulk {bulkCount}
              </Button>
              <Button
                onClick={onGenerate}
                disabled={loading || !isPromptValid}
                className="h-10 px-6 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ... (ComposerSkeleton remains the same)
export function ComposerSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8">
      {/* Input Area */}
      <div className="relative mb-4">
        <div className="w-full h-32 bg-gray-100 rounded-xl animate-pulse" />
        
        {/* Floating selector skeleton */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white border border-gray-100 p-1 rounded-lg">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Control Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-20 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-10 w-28 bg-gray-300 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}