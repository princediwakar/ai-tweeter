// components/dashboard/Composer.tsx
'use client';

import { useState } from 'react';
import { Settings2, Loader2, ChevronDown, AlertCircle, Terminal, Layers } from 'lucide-react';
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
  const hasNoPersonas = personas.length === 0;

  const isPromptValid = form.customPrompt && form.customPrompt.trim().length >= 10;

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="h-4 w-4 text-zinc-400" />
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Create content</h3>
      </div>

      <div className="relative mb-4">
        <textarea
          value={form.customPrompt}
          onChange={(e) => onFormChange({ customPrompt: e.target.value })}
          placeholder="What do you want to write about? Describe the topic, idea, or message you want to share..."
          className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 resize-none transition-all outline-none"
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white border border-zinc-200 p-1 rounded-lg shadow-sm">
          {hasNoPersonas ? (
            <div className="flex items-center gap-2 px-2 py-1">
              <AlertCircle size={14} className="text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">No voice set up yet</span>
              <Link href="/personas" className="text-xs text-zinc-900 hover:underline font-semibold">
                Set up
              </Link>
            </div>
          ) : (
            <>
              <select
                value={form.persona}
                onChange={(e) => onFormChange({ persona: e.target.value })}
                className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-zinc-700 appearance-none pr-6 pl-2"
              >
                {personas.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 text-zinc-400 pointer-events-none" />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
            className={`h-9 w-9 p-0 rounded-lg transition-colors border ${showOptions ? 'bg-zinc-100 border-zinc-200 text-zinc-900' : 'border-transparent text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Settings2 size={16} />
          </Button>
          
          {showOptions && (
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2 transition-all p-2 bg-zinc-50 rounded-lg border border-zinc-100">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={form.includeHashtags}
                  onChange={(e) => onFormChange({ includeHashtags: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900">Add hashtags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={form.useTrendingTopics}
                  onChange={(e) => onFormChange({ useTrendingTopics: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900">Use trending topics</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasNoPersonas ? (
            <Button
              onClick={() => router.push('/personas')}
              className="h-10 px-6 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-all active:scale-95"
            >
              Set up your voice first
            </Button>
          ) : (
            <>
              <Button
                onClick={onBulkGenerate}
                disabled={loading || !isPromptValid}
                variant="outline"
                className="h-10 px-4 text-zinc-700 text-sm font-semibold border-zinc-200 hover:bg-zinc-50 rounded-xl disabled:opacity-50"
              >
                <Layers className="h-4 w-4 mr-2 text-zinc-400" />
                Generate {bulkCount} posts
              </Button>
              <Button
                onClick={onGenerate}
                disabled={loading || !isPromptValid}
                className="h-10 px-6 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create post'
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ComposerSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm mb-8">
      <div className="h-4 w-32 bg-zinc-100 rounded mb-4 animate-pulse" />
      <div className="relative mb-4">
        <div className="w-full h-32 bg-zinc-50 rounded-xl animate-pulse" />
        <div className="absolute bottom-3 right-3 h-8 w-24 bg-white border border-zinc-100 rounded-lg animate-pulse" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 bg-zinc-100 rounded-lg animate-pulse" />
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-zinc-100 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-zinc-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}