'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Persona, PersonaEditorProps, EditablePersona, ScheduleFormData, PersonaSchedule } from './types';
import { getDefaultEditablePersona } from './utils';
import PersonaForm from './PersonaForm';
import ScheduleDialog from './ScheduleDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface ExtendedPersonaEditorProps extends PersonaEditorProps {
  onAccountChange?: (accountId: string) => void;
  accounts?: { id: string; name: string | null; twitter_handle: string; platform?: string }[];
  selectedAccountId?: string | null;
  editingPersona?: Persona | null;
  onEditComplete?: () => void;
}

export default function PersonaEditor(props: ExtendedPersonaEditorProps) {
  const { accountId, platform = 'twitter', accountName, onAccountChange, accounts, selectedAccountId, editingPersona, onEditComplete } = props;
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [prompt, setPrompt] = useState('');
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
    
    fetch('/api/personas')
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
      });
      setTimeout(() => {
        document.getElementById('edit-persona-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [editingPersona]);

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10 || generationInProgress.current) {
      return;
    }
    
    setIsGenerating(true);
    setGeneratedPreview(null);
    generationInProgress.current = true;
    
    try {
      const res = await fetch('/api/personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          connected_account_id: currentAccountId,
          platform: currentPlatform,
          account_name: currentAccountName
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate persona');
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
      });
    } catch (error) {
      console.error('Error generating persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate persona');
    } finally {
      setIsGenerating(false);
      generationInProgress.current = false;
    }
  };

  const handleConfirmCreate = async () => {
    if (!generatedPreview) return;
    
    setIsCreating(true);
    
    try {
      const res = await fetch('/api/personas', {
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
          config: { auto_generated: true, original_prompt: prompt },
          is_active: generatedPreview.is_active,
          is_default: false,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save persona');
      }
      
      setPrompt('');
      setGeneratedPreview(null);
      loadPersonas();
      if (props.onPersonaUpdate) {
        props.onPersonaUpdate();
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      alert('Failed to save persona');
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    
    fetch(`/api/personas?id=${deletingId}`, { 
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
      alert('Failed to delete persona');
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
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const res = await fetch('/api/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...editData,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      setEditingId(null);
      setEditData(getDefaultEditablePersona());
      loadPersonas();
      onEditComplete?.();
    } catch (error) {
      console.error('Error updating persona:', error);
      alert('Failed to update persona');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGeneratedPreview(null);
    setEditData(getDefaultEditablePersona());
  };

  const handleScheduleClick = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    setCurrentSchedules(persona?.schedules || []);
    setSchedulePersonaId(personaId);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedules = async (forms: ScheduleFormData[]) => {
    if (!schedulePersonaId || !currentAccountId) return;
    
    const persona = personas.find(p => p.id === schedulePersonaId);
    const existingSchedules = persona?.schedules || [];
    
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const existing = existingSchedules[i];
      
      const payload = {
        connected_account_id: currentAccountId,
        name: `Schedule ${i + 1}`,
        persona_id: schedulePersonaId,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.start_time,
        is_active: true,
      };
      
      if (existing) {
        await fetch(`/api/accounts/${currentAccountId}/schedules/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/accounts/${currentAccountId}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    }
    
    loadPersonas();
    if (props.onPersonaUpdate) {
      props.onPersonaUpdate();
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!currentAccountId) return;
    
    try {
      await fetch(`/api/accounts/${currentAccountId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      loadPersonas();
      setCurrentSchedules(prev => prev.filter(s => s.id !== scheduleId));
      if (props.onPersonaUpdate) {
        props.onPersonaUpdate();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
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
        <h2 className="text-xl font-bold text-gray-900">Create Persona</h2>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-indigo-900">AI Persona Generator</h3>
        </div>

        {accounts && accounts.length > 1 && (
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700">Account:</label>
            <select
              value={currentAccountId}
              onChange={(e) => onAccountChange?.(e.target.value)}
              className="flex-1 max-w-xs border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {(account.name || account.twitter_handle)} ({account.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'})
                </option>
              ))}
            </select>
          </div>
        )}
        
        <p className="text-sm text-indigo-700 mb-4">
          Describe what kind of content you want to post on {currentPlatform === 'linkedin' ? 'LinkedIn' : 'Twitter'}. The AI will create a custom persona with RSS sources and recommended settings.
        </p>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={currentPlatform === 'linkedin' 
            ? "e.g., I want to share insights about AI product development, leadership lessons, and industry trends for professionals..."
            : "e.g., I want to post about AI news, tech startups, and productivity tips for founders..."
          }
          className="w-full px-4 py-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
          rows={3}
          disabled={isGenerating}
        />
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-indigo-500">
            {prompt.length < 10 ? 'Minimum 10 characters' : 'Ready to generate'}
          </span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || prompt.trim().length < 10}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Persona
              </>
            )}
          </button>
        </div>
        
        {generatedPreview && (
          <div className="mt-6 bg-white border border-indigo-200 rounded-lg p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-indigo-900">Review & Edit Persona</h4>
              <button
                type="button"
                onClick={() => setGeneratedPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                ×
              </button>
            </div>
            
            <PersonaForm data={generatedPreview} onChange={setGeneratedPreview} prefix="preview" />
            
            <div className="mt-6 pt-4 border-t border-indigo-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setGeneratedPreview(null)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                disabled={isCreating}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Persona'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {editingId && (
        <div id="edit-persona-form" className="bg-white border-2 border-indigo-500 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Persona</h3>
          <PersonaForm data={editData} onChange={setEditData} prefix="edit" />
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
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