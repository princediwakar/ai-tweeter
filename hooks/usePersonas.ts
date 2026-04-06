// hooks/usePersonas.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { UserPersona } from '@/lib/types';

export function usePersonas() {
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/personas');
      if (!response.ok) throw new Error('Failed to fetch personas');
      const data = await response.json();
      setPersonas(data.personas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const createPersona = useCallback(async (data: {
    name: string;
    connected_account_id: string;
    description?: string;
    rss_sources?: string[];
    config?: Record<string, unknown>;
    min_length?: number;
    max_length?: number;
    tone?: string;
    topics?: string[];
    is_active?: boolean;
    is_default?: boolean;
  }) => {
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create persona');
      }
      
      const result = await response.json();
      toast.success('Persona created!');
      await fetchPersonas();
      return result.persona;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create persona');
      throw err;
    }
  }, [fetchPersonas]);

  const updatePersona = useCallback(async (id: string, data: Partial<UserPersona>) => {
    try {
      const response = await fetch('/api/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      
      // FIXED: Actually read the backend error
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update persona');
      }

      toast.success('Persona updated');
      await fetchPersonas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update persona');
      // FIXED: Throw error back to component so the modal doesn't falsely close
      throw err; 
    }
  }, [fetchPersonas]);

  const deletePersona = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/personas?id=${id}`, { method: 'DELETE' });
      
      // FIXED: Read backend error
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete persona');
      }

      toast.success('Persona deleted');
      await fetchPersonas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete persona');
      // FIXED: Throw error back to component
      throw err;
    }
  }, [fetchPersonas]);

  const activePersonas = personas.filter(p => p.is_active);

  return {
    personas,
    activePersonas,
    loading,
    error,
    fetchPersonas,
    createPersona,
    updatePersona,
    deletePersona,
  };
}