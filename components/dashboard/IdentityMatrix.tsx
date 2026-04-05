'use client';

import { Persona } from '@/types/dashboard';
import { Plus } from 'lucide-react';

interface IdentityMatrixProps {
  personas: Persona[];
  selectedPersona: string;
  onSelect: (id: string) => void;
}

export function IdentityMatrix({
  personas,
  selectedPersona,
  onSelect
}: IdentityMatrixProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">Identity Matrix</h3>
        <p className="text-xs text-white/40 mt-1 italic">Select a voice to initiate manifestation</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {personas.map((persona) => {
          const isSelected = selectedPersona === persona.id;
          return (
            <button
              key={persona.id}
              onClick={() => onSelect(persona.id)}
              className={`relative px-5 py-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 min-w-[160px] ${
                isSelected 
                  ? 'bg-violet-500/20 border-violet-500/60 shadow-xl shadow-violet-500/20' 
                  : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-3xl">{persona.emoji}</div>
              <div className="flex flex-col items-start">
                <span className={`text-sm font-black tracking-tight transition-colors ${
                  isSelected ? 'text-white' : 'text-white/60'
                }`}>
                  {persona.name}
                </span>
                <span className="text-[8px] text-white/20 uppercase font-black tracking-widest mt-0.5">
                  Identity Active
                </span>
              </div>

              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500 rounded-full blur-sm opacity-50 animate-pulse" />
                    <div className="relative w-4 h-4 bg-violet-500 rounded-full border border-black flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* NEW IDENTITY CTAs */}
        <a
          href="/personas"
          className="px-5 py-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all flex items-center gap-4 group min-w-[160px]"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
            <Plus className="w-5 h-5 text-white/20 group-hover:text-violet-400" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-black text-white/30 group-hover:text-white/60 tracking-tight transition-colors">New Identity</span>
            <span className="text-[8px] text-white/10 uppercase font-black tracking-widest mt-0.5">Forge Voice</span>
          </div>
        </a>
      </div>
    </div>
  );
}
