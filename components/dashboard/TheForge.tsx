'use client';

import { Sparkles, Zap, Hash, TrendingUp, Loader2, Send, Calendar } from 'lucide-react';
import Link from 'next/link';
import { GenerateFormState } from '@/lib/types';
import { Button } from '@/components/ui/button';

import { Persona } from '@/types/dashboard';

interface TheForgeProps {
  form: GenerateFormState;
  loading: boolean;
  personas: Persona[];
  onFormChange: (updates: Partial<GenerateFormState>) => void;
  onGenerate: () => void;
  onBulkGenerate: () => void;
}

export function TheForge({
  form,
  loading,
  personas,
  onFormChange,
  onGenerate,
  onBulkGenerate
}: TheForgeProps) {
  const isCustom = form.customPrompt.trim().length > 0;
  const activePersona = personas.find(p => p.id === form.persona);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic">
              {activePersona ? `Forging: ${activePersona.name}` : 'The Forge'}
            </h2>
            <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">
              {activePersona ? `Identity Synthesis Active` : `Content Manifestation Engine`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Minimal Toggles */}
          <button
            onClick={() => onFormChange({ includeHashtags: !form.includeHashtags })}
            className={`p-2 rounded-lg border transition-all ${
              form.includeHashtags 
                ? 'border-violet-500/50 bg-violet-500/10 text-violet-400' 
                : 'border-white/5 text-white/20 hover:text-white/40'
            }`}
            title="Include Hashtags"
          >
            <Hash className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFormChange({ useTrendingTopics: !form.useTrendingTopics })}
            className={`p-2 rounded-lg border transition-all ${
              form.useTrendingTopics 
                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' 
                : 'border-white/5 text-white/20 hover:text-white/40'
            }`}
            title="Use RSS Sources"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
        <div className="relative flex flex-col bg-black/60 border border-white/5 rounded-2xl overflow-hidden focus-within:border-white/20 transition-colors">
          <textarea
            value={form.customPrompt}
            onChange={(e) => onFormChange({ customPrompt: e.target.value })}
            placeholder="Type a topic, a mood, or leave empty for AI serendipity..."
            className="w-full h-32 bg-transparent p-6 text-white text-lg placeholder:text-white/10 resize-none focus:outline-none"
          />
          
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-white/20 uppercase font-black tracking-widest leading-none">
                {isCustom ? 'Custom Directive Active' : 'Neutral State'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onBulkGenerate}
                disabled={loading}
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
                <span className="text-xs font-bold uppercase tracking-wider">Bulk Forge</span>
              </button>

              <button
                onClick={onGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Link 
        href="/schedules"
        className="flex items-center gap-2 p-4 rounded-xl bg-white/[0.01] border border-dashed border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
      >
        <Calendar className="w-4 h-4 text-white/20 group-hover:text-violet-400 transition-colors" />
        <span className="text-[10px] text-white/20 uppercase font-black tracking-widest group-hover:text-white/40 transition-colors">
          Initialize Automated Rhythm (Scheduling)
        </span>
      </Link>
    </div>
  );
}
