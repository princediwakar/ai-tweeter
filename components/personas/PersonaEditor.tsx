'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, Trash2, Edit2, Check, X } from 'lucide-react';
import { usePersonas } from '@/hooks/usePersonas';

interface Persona {
  id: string;
  connected_account_id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  rss_sources?: string[];
  min_length: number;
  max_length: number;
  tone?: string;
  topics?: string[];
  is_active: boolean;
  is_default: boolean;
}

interface PersonaEditorProps {
  accountId: string;
  platform?: string;
  accountName?: string;
  onPersonaUpdate?: () => void;
}

interface EditablePersona {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  min_length: number;
  max_length: number;
  rss_sources: string[];
  is_active: boolean;
}

export default function PersonaEditor(props: PersonaEditorProps) {
  const { accountId, platform = 'twitter', accountName } = props;
  const { fetchPersonas } = usePersonas();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  
  // AI generation state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<EditablePersona | null>(null);
  const generationInProgress = useRef(false);
  
  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditablePersona>({
    name: '',
    description: '',
    tone: '',
    topics: [],
    min_length: 100,
    max_length: 280,
    rss_sources: [],
    is_active: true,
  });

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Single fetch on mount
  useEffect(() => {
    if (!accountId) return;
    
    setLoading(true);
    
    fetch(`/api/personas`)
      .then(res => res.json())
      .then(data => {
        const filtered = (data.personas || []).filter((p: Persona) => p.connected_account_id === accountId);
        setPersonas(filtered);
      })
      .catch(error => {
        console.error('Error fetching personas:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId]);

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
          connected_account_id: accountId,
          platform,
          account_name: accountName
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate persona');
      }
      
      // Set preview as editable form
      setGeneratedPreview({
        name: data.generated.name || '',
        description: data.generated.description || '',
        tone: data.generated.tone || '',
        topics: data.generated.topics || [],
        min_length: data.generated.min_length || (platform === 'linkedin' ? 600 : 100),
        max_length: data.generated.max_length || (platform === 'linkedin' ? 2500 : 280),
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
          connected_account_id: accountId,
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
      
      // Reset state
      setPrompt('');
      setGeneratedPreview(null);
      fetchPersonas();
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

  const handleDeleteClick = (personaId: string) => {
    setDeletingId(personaId);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    
    console.log('Deleting persona:', deletingId);
    
    fetch(`/api/personas?id=${deletingId}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to delete'); });
      }
      console.log('Delete successful, refreshing...');
      fetchPersonas();
    })
    .catch(error => {
      console.error('Error deleting persona:', error);
      alert('Failed to delete persona');
    })
    .finally(() => {
      setDeletingId(null);
    });
  };

  const cancelDelete = () => {
    console.log('Delete cancelled for:', deletingId);
    setDeletingId(null);
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
      setEditData({
        name: '',
        description: '',
        tone: '',
        topics: [],
        min_length: 100,
        max_length: 280,
        rss_sources: [],
        is_active: true,
      });
      fetchPersonas();
    } catch (error) {
      console.error('Error updating persona:', error);
      alert('Failed to update persona');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setGeneratedPreview(null);
    setEditData({
      name: '',
      description: '',
      tone: '',
      topics: [],
      min_length: 100,
      max_length: 280,
      rss_sources: [],
      is_active: true,
    });
  };

  // Helper to render editable form fields
  const renderEditableForm = (
    data: EditablePersona,
    onChange: (data: EditablePersona) => void,
    isPreview: boolean = false
  ) => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
          placeholder="Persona name"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 resize-none"
          rows={4}
          placeholder="Describe this persona's writing style and focus..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tone</label>
          <input
            type="text"
            value={data.tone}
            onChange={(e) => onChange({ ...data, tone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            placeholder="e.g., professional, witty"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Topics (comma separated or Enter)</label>
          <input
            type="text"
            value={data.topics.join(', ')}
            onChange={(e) => onChange({ ...data, topics: e.target.value.split(/[,\n]/).map(t => t.trim()).filter(Boolean) })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            placeholder="AI, startups, productivity"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Min Characters</label>
          <input
            type="number"
            value={data.min_length}
            onChange={(e) => onChange({ ...data, min_length: parseInt(e.target.value) || 50 })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            min={50}
            max={500}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Max Characters</label>
          <input
            type="number"
            value={data.max_length}
            onChange={(e) => onChange({ ...data, max_length: parseInt(e.target.value) || 280 })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            min={50}
            max={3000}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">RSS Sources (one per line)</label>
        <textarea
          value={data.rss_sources.join('\n')}
          onChange={(e) => onChange({ ...data, rss_sources: e.target.value.split('\n').filter(line => line.trim()) })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              const textarea = e.currentTarget;
              const cursorPos = textarea.selectionStart;
              const value = textarea.value;
              const newValue = value.slice(0, cursorPos) + '\n' + value.slice(cursorPos);
              onChange({ ...data, rss_sources: newValue.split('\n').filter(line => line.trim()) });
              setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = cursorPos + 1;
              }, 0);
            }
          }}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 resize-none font-mono text-sm"
          rows={4}
          placeholder="https://example.com/feed.xml"
        />
        <p className="text-xs text-gray-500 mt-1">Enter RSS feed URLs, one per line</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={`${isPreview ? 'preview' : 'edit'}_active`}
          checked={data.is_active}
          onChange={(e) => onChange({ ...data, is_active: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor={`${isPreview ? 'preview' : 'edit'}_active`} className="text-sm font-medium text-gray-700">Active</label>
      </div>
    </div>
  );

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
        <h2 className="text-xl font-bold text-gray-900">AI Personas</h2>
      </div>

      {/* AI Persona Generator */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-indigo-900">Create AI Persona</h3>
        </div>
        
        <p className="text-sm text-indigo-700 mb-4">
          Describe what kind of content you want to post on {platform === 'linkedin' ? 'LinkedIn' : 'Twitter'}. The AI will create a custom persona with RSS sources and recommended settings.
        </p>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={platform === 'linkedin' 
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
        
        {/* Generated Preview - Now editable */}
        {generatedPreview && (
          <div className="mt-6 bg-white border border-indigo-200 rounded-lg p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-indigo-900">Review & Edit Persona</h4>
              <button
                type="button"
                onClick={() => setGeneratedPreview(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {renderEditableForm(generatedPreview, setGeneratedPreview, true)}
            
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
                  <>
                    <Check className="w-4 h-4" />
                    Create Persona
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Personas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Personas</h3>
        
        {personas.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
            No personas yet. Use the AI generator above to create one!
          </div>
        )}
        
        {personas.map(persona => (
          <div
            key={persona.id}
            className={`bg-white border rounded-xl p-5 ${!persona.is_active ? 'opacity-60' : ''} ${editingId === persona.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200'}`}
          >
            {editingId === persona.id ? (
              /* Edit Mode - Same as preview form */
              <div>
                {renderEditableForm(editData, setEditData)}
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                  >
                    <Check className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                    {persona.name}
                    {persona.is_default && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Default</span>
                    )}
                    {!persona.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                    )}
                  </h3>
                  {persona.description && (
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{persona.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">Length: {persona.min_length}-{persona.max_length}</span>
                    {persona.rss_sources && persona.rss_sources.length > 0 && (
                      <span className="bg-gray-100 px-2 py-1 rounded">RSS: {persona.rss_sources.length} sources</span>
                    )}
                    {persona.tone && (
                      <span className="bg-gray-100 px-2 py-1 rounded">Tone: {persona.tone}</span>
                    )}
                  </div>
                  {persona.topics && persona.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {persona.topics.map((topic, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    type="button"
                    onClick={() => handleEditClick(persona)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(persona.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Persona?</h3>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. The persona will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}