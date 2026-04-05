'use client';

import { Send, Trash2, ExternalLink, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Tweet } from '@/lib/types';
import { useClientSafe } from '@/hooks/useClientSafe';

interface ArchiveProps {
  tweets: Tweet[];
  onPost: (id: string) => void;
  onDelete: (id: string) => void;
  getQualityColor: (grade: string) => string;
  formatDate: (date: Date | string) => string;
}

export function Archive({
  tweets,
  onPost,
  onDelete,
  getQualityColor,
  formatDate
}: ArchiveProps) {
  const isClient = useClientSafe();

  const upcoming = tweets.filter(t => t.status !== 'posted').sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const history = tweets.filter(t => t.status === 'posted').sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  if (tweets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-white/10" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/20">The Void is Empty</p>
      </div>
    );
  }

  const renderTweet = (tweet: Tweet) => (
    <div 
      key={tweet.id} 
      className="group relative bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              {tweet.status === 'posted' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : tweet.status === 'failed' ? (
                <AlertCircle className="w-3 h-3 text-red-400" />
              ) : (
                <Clock className="w-3 h-3 text-violet-400" />
              )}
              <span className={`text-[10px] uppercase font-black tracking-widest ${
                tweet.status === 'posted' ? 'text-emerald-400/60' : 
                tweet.status === 'failed' ? 'text-red-400/60' : 'text-violet-400/60'
              }`}>
                {tweet.status}
              </span>
            </div>
            
            <span className="text-[10px] text-white/10 font-bold uppercase tracking-tighter">•</span>
            
            <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
              {isClient && tweet.created_at ? formatDate(tweet.created_at) : 'Processing'}
            </span>
          </div>

          <p className="text-sm text-white/80 leading-relaxed font-medium">
            {tweet.content}
          </p>

          {tweet.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {tweet.hashtags.map((h, i) => (
                <span key={i} className="text-[10px] text-white/30 font-bold uppercase tracking-normal px-2 py-0.5 bg-white/5 rounded-md">
                  #{h.replace('#', '')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quality & Actions Column */}
        <div className="flex flex-col items-end gap-6 min-w-[80px]">
          {tweet.qualityScore && (
            <div className="group/grade relative flex flex-col items-center">
              <span className={`text-3xl font-black italic tracking-tighter ${getQualityColor(tweet.qualityScore.grade)}`}>
                {tweet.qualityScore.grade}
              </span>
              <span className="text-[8px] uppercase font-black tracking-[0.2em] text-white/10 group-hover/grade:text-white/30 transition-colors">Grade</span>
            </div>
          )}

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {tweet.twitter_url && (
              <a 
                href={tweet.twitter_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all"
                title="View External"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {(tweet.status === 'ready' || tweet.status === 'failed') && (
              <button
                onClick={() => onPost(tweet.id)}
                className="p-2 rounded-lg bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white transition-all shadow-lg shadow-violet-600/0 hover:shadow-violet-600/20"
                title="Manifest Project"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(tweet.id)}
              className="p-2 rounded-lg bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white transition-all"
              title="Purge Entry"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {tweet.status === 'failed' && tweet.error_message && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
          <p className="text-[10px] text-red-400/80 font-medium">Critical Failure: {tweet.error_message}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-12">
      {/* UPCOMING */}
      {upcoming.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">Upcoming Projections</h3>
            <p className="text-xs text-white/40 mt-1 italic">Manifestations scheduled for digital release</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {upcoming.map(renderTweet)}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">Manifestation Logs</h3>
            <p className="text-xs text-white/40 mt-1 italic">Historical footprint of your identity archive</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {history.map(renderTweet)}
          </div>
        </div>
      )}
    </div>
  );
}
