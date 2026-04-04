'use client';

import { useState, useEffect } from 'react';

interface Persona {
  id: string;
  account_id: string;
  name: string;
  description: string;
  persona_config: Record<string, unknown>;
  base_persona: string | null;
  min_length: number;
  max_length: number;
  is_active: boolean;
}

interface CreatePersonaInput {
  account_id: string;
  name: string;
  description?: string;
  persona_config?: Record<string, unknown>;
  base_persona?: string;
  min_length?: number;
  max_length?: number;
  is_active?: boolean;
}

interface PersonaEditorProps {
  accountId: string;
}

const BASE_PERSONAS = [
  { value: 'linkedin_analyst', label: 'LinkedIn Analyst' },
  { value: 'pattern_spotter', label: 'Pattern Spotter' },
  { value: 'satirist', label: 'Satirist' },
  { value: 'english_vocab_builder', label: 'English Vocab Builder' },
  { value: 'business_storyteller', label: 'Business Storyteller' },
  { value: 'cricket_storyteller', label: 'Cricket Storyteller' },
];

export default function PersonaEditor({ accountId }: PersonaEditorProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePersonaInput>({
    account_id: accountId,
    name: '',
    description: '',
    base_persona: 'linkedin_analyst',
    min_length: 100,
    max_length: 280,
    is_active: true,
    persona_config: {},
  });

  useEffect(() => {
    fetchPersonas();
  }, [accountId]);

  const fetchPersonas = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas`);
      const data = await res.json();
      setPersonas(data.personas || []);
    } catch (error) {
      console.error('Error fetching personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId
        ? `/api/accounts/${accountId}/personas/${editingId}`
        : `/api/accounts/${accountId}/personas`;
      
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save persona');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({
        account_id: accountId,
        name: '',
        description: '',
        base_persona: 'linkedin_analyst',
        min_length: 100,
        max_length: 280,
        is_active: true,
        persona_config: {},
      });
      
      fetchPersonas();
    } catch (error) {
      console.error('Error saving persona:', error);
      alert('Failed to save persona');
    }
  };

  const handleEdit = (persona: Persona) => {
    setFormData({
      account_id: persona.account_id,
      name: persona.name,
      description: persona.description,
      base_persona: persona.base_persona || 'linkedin_analyst',
      min_length: persona.min_length,
      max_length: persona.max_length,
      is_active: persona.is_active,
      persona_config: persona.persona_config,
    });
    setEditingId(persona.id);
    setShowForm(true);
  };

  const handleDelete = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return;
    
    try {
      const res = await fetch(`/api/accounts/${accountId}/personas/${personaId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete persona');
      }
      
      fetchPersonas();
    } catch (error) {
      console.error('Error deleting persona:', error);
      alert('Failed to delete persona');
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading personas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">AI Personas</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              account_id: accountId,
              name: '',
              description: '',
              base_persona: 'linkedin_analyst',
              min_length: 100,
              max_length: 280,
              is_active: true,
              persona_config: {},
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Persona
        </button>
      </div>

      {personas.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No custom personas. Create one to customize content generation.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Persona' : 'Create Persona'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Persona Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Tech Analyst"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Base Persona</label>
              <select
                value={formData.base_persona}
                onChange={e => setFormData({ ...formData, base_persona: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                {BASE_PERSONAS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
              placeholder="Describe this persona..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Min Length</label>
              <input
                type="number"
                value={formData.min_length}
                onChange={e => setFormData({ ...formData, min_length: parseInt(e.target.value) })}
                min={50}
                max={500}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Max Length</label>
              <input
                type="number"
                value={formData.max_length}
                onChange={e => setFormData({ ...formData, max_length: parseInt(e.target.value) })}
                min={50}
                max={1000}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Create'} Persona
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {personas.map(persona => (
          <div
            key={persona.id}
            className={`bg-white border rounded-lg p-4 ${!persona.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {persona.name}
                  {!persona.is_active && (
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Inactive</span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Base: {BASE_PERSONAS.find(p => p.value === persona.base_persona)?.label || persona.base_persona}
                </p>
                {persona.description && (
                  <p className="text-xs text-gray-500 mt-1">{persona.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Length: {persona.min_length} - {persona.max_length} chars
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(persona)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(persona.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}