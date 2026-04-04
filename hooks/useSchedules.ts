import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { UserSchedule, ConnectedAccount, UserPersona } from '@/lib/types';

export function useSchedules() {
  const [schedules, setSchedules] = useState<UserSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schedules');
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = useCallback(async (data: {
    name: string;
    description?: string;
    connected_account_id: string;
    persona_id?: string;
    cron_expression?: string;
    timezone?: string;
    use_trending?: boolean;
    include_hashtags?: boolean;
    bulk_count?: number;
  }) => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create schedule');
      }
      
      const result = await response.json();
      toast.success('Schedule created!');
      await fetchSchedules();
      return result.schedule;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
      throw err;
    }
  }, [fetchSchedules]);

  const updateSchedule = useCallback(async (id: string, data: Partial<UserSchedule>) => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (!response.ok) throw new Error('Failed to update');
      toast.success('Schedule updated');
      await fetchSchedules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Schedule deleted');
      await fetchSchedules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }, [fetchSchedules]);

  const toggleSchedule = useCallback(async (id: string, is_active: boolean) => {
    await updateSchedule(id, { is_active });
  }, [updateSchedule]);

  const activeSchedules = schedules.filter(s => s.is_active);

  return {
    schedules,
    activeSchedules,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
  };
}
