// components/dashboard/Composer.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface Persona {
  id: string;
  name: string;
  emoji: string;
  key?: string;
  is_active?: boolean;
  connected_account_id: string;
}

interface Account {
  id: string;
  platform: string;
  account_username: string;
}

interface ComposerProps {
  personas: Persona[];
  accounts: Account[];
  selectedVoiceId: string;
  onVoiceChange: (id: string) => void;
  onGenerate: () => void;
  generating: boolean;
}

export default function Composer({ 
  personas, 
  accounts, 
  selectedVoiceId, 
  onVoiceChange,
  onGenerate,
  generating 
}: ComposerProps) {
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wasGenerating = useRef(false);

  const selectedPersona = personas.find(p => p.id === selectedVoiceId);

  // Handle click outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVoiceSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle the state transitions flawlessly
  useEffect(() => {
    if (generating) {
      wasGenerating.current = true;
      setJustFinished(false);
    } else if (!generating && wasGenerating.current) {
      setJustFinished(true);
      wasGenerating.current = false;
      const timer = setTimeout(() => setJustFinished(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [generating]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[min(calc(100vw-2rem),600px)] z-50 flex justify-center transition-all duration-300 ease-out">
      
      {/* Main Composer Pill */}
      <div className={`relative bg-white border shadow-sm flex items-center p-1.5 transition-all duration-500 ${
        generating ? 'border-indigo-200 shadow-indigo-100 rounded-2xl' : 
        justFinished ? 'border-emerald-200 shadow-emerald-100 rounded-2xl' : 
        'border-zinc-200 rounded-2xl'
      }`}>
        
        {/* Left: Persona Selector */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => !generating && setShowVoiceSelector(!showVoiceSelector)}
            disabled={generating}
            className={`flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl transition-all ${
              generating ? 'opacity-50 cursor-not-allowed' : 'bg-zinc-50 hover:bg-zinc-100 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white border border-zinc-200 shadow-sm text-xs">
              {selectedPersona?.emoji || '🎙️'}
            </div>
            <span className="text-sm font-medium text-zinc-900 max-w-[120px] truncate">
              {selectedPersona ? selectedPersona.name : 'Select Profile'}
            </span>
            <ChevronRight
              className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${showVoiceSelector ? 'rotate-90' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {showVoiceSelector && personas.length > 0 && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 w-64 bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden origin-bottom-left animate-in fade-in slide-in-from-bottom-2">
              <div className="px-4 py-3 border-b border-zinc-100">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Active Profiles
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {personas.map((voice) => {
                  const voiceAccount = accounts.find(a => a.id === voice.connected_account_id);
                  return (
                    <button
                      key={voice.id}
                      onClick={() => {
                        onVoiceChange(voice.id);
                        setShowVoiceSelector(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-all ${
                        selectedVoiceId === voice.id ? 'bg-zinc-50 ring-1 ring-zinc-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-zinc-100 shadow-sm text-lg">
                        {voice.emoji || '🎙️'}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 truncate">
                          {voice.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate mt-0.5">
                          <PlatformIcon
                            platform={(voiceAccount?.platform === 'linkedin' ? 'linkedin' : 'twitter') || 'twitter'}
                            className="w-3.5 h-3.5"
                          />
                          <span className="truncate">
                            {voiceAccount?.platform === 'twitter' ? '@' : ''}
                            {voiceAccount?.account_username}
                          </span>
                        </div>
                      </div>
                      {voice.is_active && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full ml-2 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-200 mx-2 shrink-0" />

        {/* Right: Action Area */}
        <div className="flex-shrink-0">
          {generating ? (
             <div className="flex items-center gap-2 px-6 py-2 bg-zinc-50 text-zinc-600 rounded-xl border border-zinc-100">
               <Loader2 className="h-4 w-4 animate-spin" />
               <span className="text-sm font-medium">Generating...</span>
             </div>
          ) : justFinished ? (
             <div className="flex items-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 animate-in fade-in zoom-in-95">
               <CheckCircle2 className="h-4 w-4" />
               <span className="text-sm font-medium">Ready</span>
             </div>
          ) : (
            <button
              onClick={onGenerate}
              disabled={!selectedVoiceId}
              className={`group flex items-center gap-2 px-6 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
                !selectedVoiceId 
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]'
              }`}
            >
              <Sparkles className={`h-4 w-4 ${selectedVoiceId ? 'text-zinc-400 group-hover:text-white transition-colors' : ''}`} />
              <span>Generate</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}