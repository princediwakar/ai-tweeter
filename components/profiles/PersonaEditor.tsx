// components/profiles/PersonaEditor.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Sparkles, UserCheck, LayoutTemplate, Newspaper } from 'lucide-react';
import { Persona, PersonaEditorProps, EditablePersona, ScheduleFormData, PersonaSchedule } from './types';
import { getDefaultEditablePersona } from './utils';
import PersonaForm from './PersonaForm';
import ScheduleDialog from './ScheduleDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { getDisplayUsername } from '@/lib/linkedin';

const PREDEFINED_OPTIONS = [
  { id: 'saas_operator', title: 'The SaaS Operator', desc: 'Pragmatic, growth-focused, execution-oriented' },
  { id: 'developer', title: 'The Builder / Engineer', desc: 'Technical, fast-moving, authentic' },
  { id: 'marketer', title: 'The Growth Marketer', desc: 'Psychology, unit economics, engaging' },
  { id: 'data_scientist', title: 'The AI/Data Engineer', desc: 'Analytical, anti-hype, grounded' },
];

interface ExtendedPersonaEditorProps extends PersonaEditorProps {
  onAccountChange?: (accountId: string) => void;
  accounts?: { id: string; name: string | null; account_username: string; platform?: string; profile_url?: string | null }[];
  selectedAccountId?: string | null;
  editingPersona?: Persona | null;
  onEditComplete?: () => void;
}

export default function PersonaEditor(props: ExtendedPersonaEditorProps) {
  const { accountId, platform = 'twitter', accountName, onAccountChange, accounts, selectedAccountId, editingPersona, onEditComplete } = props;
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined');
  const [selectedPredefined, setSelectedPredefined] = useState<string>('saas_operator');
  const [includeRss, setIncludeRss] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<EditablePersona | null>(null);
  const generationInProgress = useRef(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditablePersona>(getDefaultEditablePersona());

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulePersonaId, setSchedulePersonaId] = useState<string | null>(null);
  const [currentSchedules, setCurrentSchedules] = useState<PersonaSchedule[]>([]);

  const currentAccountId = selectedAccountId || accountId;
  const currentPlatform = accounts?.find(a => a.id === currentAccountId)?.platform || platform;
  const currentAccountName = accounts?.find(a => a.id === currentAccountId)?.name || accountName;

  const loadPersonas = useCallback(() => {
    if (!currentAccountId) return;
    
    setLoading(true);
    
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        const filtered = (data.personas || []).filter((p: Persona) => p.connected_account_id === currentAccountId);
        setPersonas(filtered);
      })
      .catch(error => {
        console.error('Error fetching personas:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentAccountId]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  useEffect(() => {
    if (editingPersona) {
      setEditingId(editingPersona.id);
      setEditData({
        name: editingPersona.name,
        description: editingPersona.description,
        tone: editingPersona.tone || '',
        topics: editingPersona.topics || [],
        min_length: editingPersona.min_length,
        max_length: editingPersona.max_length,
        rss_sources: editingPersona.rss_sources || [],
        is_active: editingPersona.is_active,
        config: editingPersona.config,
      });
      setTimeout(() => {
        document.getElementById('edit-persona-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [editingPersona]);

  const handleGenerate = async () => {
    if ((mode === 'custom' && (!prompt.trim() || prompt.length < 10)) || generationInProgress.current) {
      return;
    }
    
    setIsGenerating(true);
    setGeneratedPreview(null);
    generationInProgress.current = true;
    
    try {
      const res = await fetch('/api/profiles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: mode === 'custom' ? prompt.trim() : '',
          connected_account_id: currentAccountId,
          platform: currentPlatform,
          account_name: currentAccountName,
          predefined_key: mode === 'predefined' ? selectedPredefined : undefined,
          include_rss: mode === 'custom' ? includeRss : false,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate profile');
      }
      
      setGeneratedPreview({
        name: data.generated.name || '',
        description: data.generated.description || '',
        tone: data.generated.tone || '',
        topics: data.generated.topics || [],
        min_length: data.generated.min_length || (currentPlatform === 'linkedin' ? 600 : 100),
        max_length: data.generated.max_length || (currentPlatform === 'linkedin' ? 2500 : 280),
        rss_sources: data.generated.rss_sources || [],
        is_active: true,
        config: data.generated.config,
      });
    } catch (error) {
      console.error('Error generating persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate profile');
    } finally {
      setIsGenerating(false);
      generationInProgress.current = false;
    }
  };

  const handleConfirmCreate = async () => {
    if (!generatedPreview) return;
    
    setIsCreating(true);
    
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connected_account_id: currentAccountId,
          name: generatedPreview.name,
          description: generatedPreview.description,
          tone: generatedPreview.tone,
          topics: generatedPreview.topics,
          min_length: generatedPreview.min_length,
          max_length: generatedPreview.max_length,
          rss_sources: generatedPreview.rss_sources,
          config: { 
            ...generatedPreview.config,
            auto_generated: true, 
            original_prompt: prompt 
          },
          is_active: generatedPreview.is_active,
          is_default: false,
        }),
      });
      
      // FIXED: Actually read the API error message instead of ignoring it
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }
      
      setPrompt('');
      setGeneratedPreview(null);
      loadPersonas();
      if (props.onPersonaUpdate) {
        props.onPersonaUpdate();
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    
    fetch(`/api/profiles?id=${deletingId}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to delete'); });
      }
      loadPersonas();
    })
    .catch(error => {
      console.error('Error deleting persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete profile');
    })
    .finally(() => {
      setDeletingId(null);
    });
  };

  const handleEditClick = (persona: Persona) => {
    setEditingId(persona.id);
    setGeneratedPreview(null);
    setEditData({
      name: persona.name,
      description: persona.description,
      tone: persona.tone || '',
      topics: persona.topics || [],
      min_length: persona.min_length,
      max_length: persona.max_length,
      rss_sources: persona.rss_sources || [],
      is_active: persona.is_active,
      config: persona.config,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const res = await fetch('/api/profiles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...editData,
        }),
      });
      
      // FIXED: Actually read the API error message
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update');
      }
      
      setEditingId(null);
      setEditData(getDefaultEditablePersona());
      loadPersonas();
      onEditComplete?.();
    } catch (error) {
      console.error('Error updating persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  const handleSaveSchedules = async (forms: ScheduleFormData[]) => {
    if (!schedulePersonaId || !currentAccountId) return;
    
    try {
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        
        const payload = {
          connected_account_id: currentAccountId,
          name: `Schedule ${i + 1}`,
          persona_id: schedulePersonaId,
          days_of_week: form.days_of_week,
          start_time: form.start_time,
          end_time: form.start_time + 60, // A window of 60 minutes
          is_active: true,
        };
        
        let res;
        if (form.id) {
          // ID-based matching: PATCH the exact schedule we know by id
          res = await fetch(`/api/accounts/${currentAccountId}/schedules/${form.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          // No id means this is a brand-new schedule
          res = await fetch(`/api/accounts/${currentAccountId}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || `Failed to save Schedule ${i + 1}`);
        }
      }
      
      loadPersonas();
      if (props.onPersonaUpdate) {
        props.onPersonaUpdate();
      }
      setScheduleDialogOpen(false);
    } catch (error) {
      console.error('Error saving schedules:', error);
      alert(error instanceof Error ? error.message : 'Failed to save schedules');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!currentAccountId) return;
    
    try {
      const res = await fetch(`/api/accounts/${currentAccountId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete schedule");

      loadPersonas();
      setCurrentSchedules(prev => prev.filter(s => s.id !== scheduleId));
      if (props.onPersonaUpdate) {
        props.onPersonaUpdate();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-indigo-500/20 rounded-full relative">
          <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-zinc-900">{editingPersona ? 'Edit AI Profile' : 'Create an AI Profile'}</h2>
      </div>

      {/* Show preview form if generated, otherwise show generator */}
      {!editingPersona && !generatedPreview && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-zinc-600" />
            <h3 className="text-lg font-semibold text-zinc-900">AI Profile Generator</h3>
          </div>

          {accounts && accounts.length > 1 && (
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-zinc-700">Account:</label>
              <select
                value={currentAccountId}
                onChange={(e) => onAccountChange?.(e.target.value)}
                className="flex-1 max-w-xs border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {getDisplayUsername({
                      platform: (account.platform as 'twitter' | 'linkedin') || 'twitter',
                      account_username: account.account_username,
                      name: account.name,
                      profile_url: account.profile_url,
                    })} ({account.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <p className="text-sm text-zinc-600 mb-4">
            Describe what kind of content you want to post, or pick a predefined template.
          </p>
          
          {/* Tabs */}
          <div className="flex p-1 space-x-1 bg-zinc-100/80 rounded-xl mb-4 max-w-sm">
            <button
              onClick={() => setMode('predefined')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'predefined' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Templates (Fast)
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'custom' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Custom Persona
            </button>
          </div>

          {mode === 'predefined' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PREDEFINED_OPTIONS.map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedPredefined(opt.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedPredefined === opt.id 
                        ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 shadow-sm' 
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className={`h-4 w-4 ${selectedPredefined === opt.id ? 'text-zinc-900' : 'text-zinc-400'}`} />
                      <span className="font-semibold text-zinc-900 text-sm">{opt.title}</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{opt.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400 pt-1 flex items-center gap-1.5">
                <LayoutTemplate className="h-3 w-3" /> Pre-built templates generate content based on past memory and core thesis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={currentPlatform === 'linkedin' 
                  ? "e.g., I want to share insights about AI product development, leadership lessons, and industry trends for professionals..."
                  : "e.g., I want to post about AI news, tech startups, and productivity tips for founders..."
                }
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white text-zinc-900 text-sm resize-none h-24"
                disabled={isGenerating}
              />
              
              <label className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200 bg-white cursor-pointer hover:bg-zinc-50/50 transition-colors">
                <div className="flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={includeRss}
                    onChange={(e) => setIncludeRss(e.target.checked)}
                    className="w-4 h-4 text-zinc-900 bg-zinc-100 border-zinc-300 rounded focus:ring-zinc-900 focus:ring-2"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                    <Newspaper className="h-3.5 w-3.5 text-zinc-500" />
                    Include Industry News & RSS
                  </span>
                  <span className="text-xs text-zinc-500">
                    Automatically finds RSS feeds. Generation takes ~30 seconds longer.
                  </span>
                </div>
              </label>
            </div>
          )}
          
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {mode === 'custom' && prompt.length < 10 ? 'Minimum 10 characters' : 'Ready to customize'}
              </span>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || (mode === 'custom' && prompt.trim().length < 10)}
                className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Persona
                  </>
                )}
              </button>
            </div>
        </div>
      )}

      {generatedPreview && !editingPersona && (
        <div className="bg-white border border-zinc-300 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-zinc-900">Review your AI Profile</h4>
            <button
              type="button"
              onClick={() => {
                setGeneratedPreview(null);
                setPrompt('');
              }}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"
            >
              ×
            </button>
          </div>
          
          <PersonaForm data={generatedPreview} onChange={setGeneratedPreview} prefix="preview" />
          
          <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setGeneratedPreview(null);
                setPrompt('');
              }}
              className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCreate}
              disabled={isCreating}
              className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 flex items-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Persona'
              )}
            </button>
          </div>
        </div>
      )}

      {editingId && (
        <div id="edit-persona-form" className="bg-white border-2 border-zinc-900 rounded-xl p-5">
          <PersonaForm data={editData} onChange={setEditData} prefix="edit" />
          <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditData(getDefaultEditablePersona());
                onEditComplete?.();
              }}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />

      <ScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        schedules={currentSchedules}
        onSave={handleSaveSchedules}
        onDeleteSchedule={handleDeleteSchedule}
      />
    </div>
  );
}