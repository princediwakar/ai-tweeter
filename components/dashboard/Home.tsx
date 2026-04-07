
'use client';

import { useState } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import { Check, Edit2, RefreshCw, Send, PlusCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  // Mock state: In reality, fetch this from your new /api/drafts endpoint
  const [drafts, setDrafts] = useState([
    { id: 1, personaName: 'Product Pulse India', platform: 'LinkedIn', content: 'Just wrapped up a fascinating conversation about AI in B2B SaaS. The biggest takeaway? Stop building features looking for problems. Start with the workflow pain points. \n\nWhat is the biggest workflow bottleneck your team faces today?' },
    { id: 2, personaName: 'Startup Insights', platform: 'Twitter', content: 'Founders overcomplicate pricing. If your software saves a company $10k a month, charging $50/mo isn\'t "competitive"—it\'s signaling that your product isn\'t actually doing what you claim. Price on value.' }
  ]);

  const [idea, setIdea] = useState('');

  return (
      <div className="space-y-10 animate-in fade-in duration-500">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Good morning.</h1>
          <p className="text-sm text-zinc-500 mt-1">Here is what your AI assistant has prepared for you today.</p>
        </div>

        {/* Section 1: Needs Review (The Hook) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Ready for Review</h2>
            <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-200">
              {drafts.length} Pending
            </span>
          </div>

          {drafts.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-sm">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-900">All caught up!</p>
              <p className="text-xs text-zinc-500 mt-1">Your next batch of posts is currently being drafted.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-1 rounded-md">
                        {draft.personaName}
                      </span>
                      <span className="text-xs text-zinc-500">{draft.platform}</span>
                    </div>
                    <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {draft.content}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-100">
                    <Button className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 h-9 text-xs rounded-xl">
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Approve
                    </Button>
                    <Button variant="outline" className="h-9 px-3 border-zinc-200 text-zinc-600 rounded-xl">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" className="h-9 px-3 border-zinc-200 text-zinc-600 rounded-xl">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: The Upcoming Queue */}
        <section className="space-y-4 pt-6 border-t border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Upcoming Schedule</h2>
          
          <div className="bg-white border border-zinc-200 rounded-2xl p-2 shadow-sm">
            {/* Mock Timeline Items */}
            <div className="flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-xl transition-colors border-b border-zinc-50">
              <div className="w-12 text-center">
                <p className="text-xs font-bold text-zinc-900">Today</p>
                <p className="text-xs text-zinc-500">2:00 PM</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-zinc-300"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900">LinkedIn Post</p>
                <p className="text-xs text-zinc-500">Product Pulse India • Awaiting generation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 hover:bg-zinc-50 rounded-xl transition-colors">
              <div className="w-12 text-center">
                <p className="text-xs font-bold text-zinc-900">Tmrw</p>
                <p className="text-xs text-zinc-500">9:45 AM</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-zinc-300"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900">Twitter Thread</p>
                <p className="text-xs text-zinc-500">Startup Insights • Awaiting generation</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Quick Idea (Replaces the massive Composer) */}
        <section className="fixed bottom-6 left-0 right-0 lg:pl-64 pointer-events-none">
          <div className="max-w-3xl mx-auto px-6">
            <div className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-2 flex items-center gap-2 pointer-events-auto transition-transform hover:-translate-y-1">
              <div className="p-2 bg-zinc-100 rounded-xl">
                <PlusCircle className="w-5 h-5 text-zinc-500" />
              </div>
              <input 
                type="text" 
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Drop a quick idea or link here, and we'll draft it..." 
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-zinc-400 outline-none px-2"
              />
              <Button disabled={!idea} className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl h-10 px-4">
                <Send className="w-4 h-4 mr-2" /> Draft
              </Button>
            </div>
          </div>
        </section>

      </div>
  );
}