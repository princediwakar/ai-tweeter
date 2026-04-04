'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Zap, 
  MessageSquare, 
  Hash, 
  TrendingUp,
  X,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GenerateFormState, Persona } from '@/types/dashboard';

interface ModernGenerationProps {
  form: GenerateFormState;
  loading: boolean;
  personas: Persona[];
  bulkCount: number;
  onFormChange: (updates: Partial<GenerateFormState>) => void;
  onGenerate: () => void;
  onBulkGenerate: () => void;
}

const personaCategories = {
  'Insight': ['satirist', 'pattern_spotter'],
  'Story': ['business_storyteller', 'cricket_storyteller'],
  'Learning': ['english_vocab_builder'],
  'Professional': ['linkedin_analyst']
};

export function ModernGeneration({
  form,
  loading,
  personas,
  bulkCount,
  onFormChange,
  onGenerate,
  onBulkGenerate
}: ModernGenerationProps) {
  const [showCustomPrompt, setShowCustomPrompt] = useState(form.customPrompt.trim().length > 0);
  
  const currentPersona = personas.find(p => p.id === form.persona);
  const isCustomMode = form.customPrompt.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            AI Content Generator
          </h2>
          <p className="text-muted-foreground mt-1">Create engaging content powered by AI</p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sources Active
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full">
            <Zap className="h-3.5 w-3.5" />
            AI Ready
          </div>
        </div>
      </div>

      {/* Persona Selector */}
      <div className="bg-card border-2 border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-500" />
            Select Persona
          </h3>
          <span className="text-xs text-muted-foreground">{personas.length} available</span>
        </div>

        {/* Persona Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {personas.map(persona => (
            <button
              key={persona.id}
              onClick={() => onFormChange({ persona: persona.id })}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                form.persona === persona.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border hover:border-violet-500/50 hover:bg-muted'
              }`}
            >
              <div className="text-2xl mb-2">{persona.emoji}</div>
              <div className="text-sm font-medium text-foreground truncate">
                {persona.name}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {persona.description}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Persona Info */}
        {currentPersona && (
          <div className="mt-4 p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{currentPersona.emoji}</div>
              <div>
                <div className="font-semibold text-foreground">{currentPersona.name}</div>
                <div className="text-sm text-muted-foreground">{currentPersona.description}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options & Custom Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Toggles */}
        <div className="bg-card border-2 border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Content Options
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Include Hashtags</span>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${
                form.includeHashtags ? 'bg-violet-500' : 'bg-muted'
              }`}>
                <button
                  onClick={() => onFormChange({ includeHashtags: !form.includeHashtags })}
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.includeHashtags ? 'left-6' : 'left-1'
                  }`}
                />
              </div>
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Use RSS Sources</span>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative ${
                form.useTrendingTopics ? 'bg-violet-500' : 'bg-muted'
              }`}>
                <button
                  onClick={() => onFormChange({ useTrendingTopics: !form.useTrendingTopics })}
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.useTrendingTopics ? 'left-6' : 'left-1'
                  }`}
                />
              </div>
            </label>

            <button
              onClick={() => setShowCustomPrompt(!showCustomPrompt)}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                showCustomPrompt || isCustomMode
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-dashed border-border hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Custom Topic</span>
              </div>
              {isCustomMode ? (
                <span className="text-xs text-amber-500 font-medium">Active</span>
              ) : (
                showCustomPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div className="lg:col-span-2">
          {showCustomPrompt && (
            <div className="bg-card border-2 border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Custom Topic
                </h3>
                {isCustomMode && (
                  <button
                    onClick={() => onFormChange({ customPrompt: '' })}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <textarea
                value={form.customPrompt}
                onChange={(e) => onFormChange({ customPrompt: e.target.value })}
                placeholder="Enter a specific topic for the AI to write about... (e.g., 'AI in Indian startups', 'Mumbai monsoons')"
                className="w-full h-24 bg-muted border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Custom topic overrides RSS sources for personalized content
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Button
              onClick={onGenerate}
              disabled={loading || personas.length === 0}
              className="h-14 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Wand2 className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div>Generate {isCustomMode ? 'Custom' : 'Tweet'}</div>
                    <div className="text-xs text-white/70">
                      {isCustomMode ? 'Using your topic' : form.useTrendingTopics ? 'From RSS' : 'Random topic'}
                    </div>
                  </div>
                </>
              )}
            </Button>
            
            <Button
              onClick={onBulkGenerate}
              disabled={loading || isCustomMode || personas.length === 0}
              className="h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  <div className="text-left">
                    <div>Bulk Generate</div>
                    <div className="text-xs text-white/70">
                      {isCustomMode ? 'Clear custom first' : `${bulkCount} topics at once`}
                    </div>
                  </div>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}