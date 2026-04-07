'use client';

import { CheckCircle2, Clock, Trash2, Send, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tweet, Persona } from '@/types/dashboard';
import { ConnectedAccount } from '@/lib/types';

interface ObservationDeckProps {
  personas: Persona[];
  tweets: Tweet[];
  isLoading: boolean;
  onPostTweet: (id: string, platform: 'twitter' | 'linkedin') => void;
  onDeleteTweet: (id: string) => void;
  loadingState: boolean;
  accounts: ConnectedAccount[];
}

export function ObservationDeck({ personas, tweets, isLoading, onPostTweet, onDeleteTweet, loadingState, accounts }: ObservationDeckProps) {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {personas.map((p) => (
          <div key={p.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between h-48 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full z-10" />
            <div>
              <span className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">
                <span>{p.emoji}</span> {p.name}
              </span>
              <div className="h-3 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-zinc-800 rounded animate-pulse mt-3" />
              <div className="h-3 w-2/3 bg-zinc-800 rounded animate-pulse mt-3" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 animate-pulse flex items-center gap-2">
              <RotateCcw size={14} className="animate-spin" /> Engine drafting...
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-zinc-300 rounded-xl bg-zinc-50/50 text-center">
        <AlertCircle className="h-8 w-8 text-zinc-400 mb-3" />
        <p className="text-sm font-semibold text-zinc-900">No active profiles</p>
        <p className="text-xs text-zinc-500 mt-1">Navigate to Profiles to initialize your first automated profile.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {personas.map((persona) => {
        const latestTweet = tweets.find((t) => t.persona === persona.name);

        return (
          <div key={persona.id} className="group p-6 bg-white border border-zinc-200 shadow-sm rounded-xl flex flex-col gap-4 hover:border-zinc-400 hover:shadow-md transition-all duration-200">
            {/* High-Contrast Header */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Profile</span>
                <span className="flex items-center gap-2 text-sm font-bold text-zinc-900">
                  <span>{persona.emoji}</span> {persona.name}
                </span>
              </div>
              
              {latestTweet ? (
                latestTweet.status === 'posted' ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    <CheckCircle2 size={12} className="text-emerald-500"/> Posted
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <Clock size={12} className="text-amber-500" /> Pending
                  </span>
                )
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-md">Standby</span>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-zinc-50/50 rounded-lg p-4 border border-zinc-100">
              {latestTweet ? (
                <p className="text-sm text-zinc-800 leading-relaxed font-medium">
                  {latestTweet.content}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 italic font-medium">Awaiting next cycle. The engine is dormant for this profile.</p>
              )}
            </div>

            {/* Interventions */}
            <div className="flex items-center justify-between pt-2">
               <span className="text-xs text-zinc-400 font-medium">
                 {latestTweet ? new Date(latestTweet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
               </span>
               {latestTweet && (
                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                   {latestTweet.status !== 'posted' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-8 px-3 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white"
                        onClick={() => onPostTweet(latestTweet.id, 'twitter')}
                        disabled={loadingState}
                      >
                        <Send size={12} className="mr-1.5" /> Push
                      </Button>
                   )}
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="h-8 px-3 text-xs font-bold text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200"
                     onClick={() => onDeleteTweet(latestTweet.id)}
                     disabled={loadingState}
                   >
                     <Trash2 size={12} className="mr-1.5" /> Scrub
                   </Button>
                 </div>
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
}