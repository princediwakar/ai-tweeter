'use client';

import { useState, useEffect } from 'react';
import { Schedule, CreateScheduleInput } from '@/lib/scheduleService';
import { Persona } from '@/lib/personaService';
import { Clock, Calendar, Zap, Sparkles, X, Check, Edit } from 'lucide-react';

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface ConnectedAccount {
  id: string;
  platform: 'twitter' | 'linkedin';
  account_username: string;
  account_name: string;
  is_active: boolean;
}

interface ScheduleBuilderProps {
  accountId: string;
  onScheduleUpdate?: () => void;
}

export default function ScheduleBuilder(props: ScheduleBuilderProps) {
  const { accountId } = props;
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateScheduleInput>({
    connected_account_id: accountId,
    name: '',
    timezone: 'Asia/Kolkata',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: 540,
    end_time: 540,
    is_active: true,
    persona_id: '',
  });

  // Single parallel data fetch on mount - only fetch if accountId exists
  useEffect(() => {
    if (!accountId) return;
    
    setLoading(true);
    
    Promise.all([
      fetch('/api/connected-accounts').then(r => r.json()),
      fetch(`/api/accounts/${accountId}/personas`).then(r => r.json()),
      fetch(`/api/accounts/${accountId}/schedules`).then(r => r.json())
    ])
    .then(([accountsData, personasData, schedulesData]) => {
      setAccounts(accountsData.accounts || []);
      setPersonas(personasData.personas || []);
      setSchedules(schedulesData.schedules || []);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [accountId]);

  const fetchSchedules = (accountId: string) => {
    fetch(`/api/accounts/${accountId}/schedules`)
      .then(res => res.json())
      .then(data => {
        setSchedules(data.schedules || []);
      })
      .catch(error => {
        console.error('Error fetching schedules:', error);
      });
  };

  // Reset form when accountId changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, connected_account_id: accountId }));
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !formData.persona_id) return;

    try {
      const url = editingId
        ? `/api/accounts/${accountId}/schedules/${editingId}`
        : `/api/accounts/${accountId}/schedules`;

      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to save schedule');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        connected_account_id: accountId,
        name: '',
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        start_time: 540,
        end_time: 540,
        is_active: true,
        persona_id: '',
      });

      fetchSchedules(accountId);
      if (props.onScheduleUpdate) {
        props.onScheduleUpdate();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setFormData({
      connected_account_id: schedule.connected_account_id,
      name: schedule.name,
      timezone: schedule.timezone,
      days_of_week: schedule.days_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      is_active: schedule.is_active,
      persona_id: schedule.persona_id || '',
    });
    setEditingId(schedule.id);
    setShowForm(true);
  };

  const handleDeleteClick = (scheduleId: string) => {
    setDeletingId(scheduleId);
  };

  const confirmDelete = () => {
    if (!deletingId || !accountId) return;

    fetch(`/api/accounts/${accountId}/schedules/${deletingId}`, {
      method: 'DELETE',
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to delete');
      fetchSchedules(accountId);
    })
    .catch(error => {
      console.error('Error deleting schedule:', error);
    })
    .finally(() => {
      setDeletingId(null);
    });
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const toggleDay = (day: number) => {
    const current = formData.days_of_week || [];
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setFormData({ ...formData, days_of_week: newDays });
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number => {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
  };

  const getPlatformBadge = (platform: string) => {
    const styles = platform === 'twitter' 
      ? 'bg-black text-white' 
      : 'bg-blue-700 text-white';
    const label = platform === 'twitter' ? 'Twitter' : 'LinkedIn';
    return <span className={`text-xs px-2 py-0.5 rounded ${styles}`}>{label}</span>;
  };

  const getPersonaName = (personaId: string | undefined) => {
    if (!personaId) return null;
    const persona = personas.find(p => p.id === personaId);
    return persona?.name || null;
  };

  const getPersonaEmoji = (personaId: string | undefined) => {
    if (!personaId) return null;
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return null;
    if (persona.name?.includes('Vocabulary')) return '🏆';
    if (persona.name?.includes('Business')) return '📈';
    if (persona.name?.includes('Cricket')) return '🏏';
    if (persona.name?.includes('Signal')) return '💡';
    if (persona.name?.includes('Pattern')) return '🔍';
    return '🎭';
  };

  const currentAccount = accounts.find(a => a.id === accountId);
  const selectedPersona = personas.find(p => p.id === formData.persona_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No connected accounts.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Schedules</h2>
          {currentAccount && (
            <div className="flex items-center gap-2">
              {getPlatformBadge(currentAccount.platform)}
              <span className="text-sm text-gray-500">
                {currentAccount.account_name || (currentAccount.platform === 'linkedin' ? 'LinkedIn' : 'Twitter')}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
              setFormData({
              connected_account_id: accountId,
              name: '',
              days_of_week: [0, 1, 2, 3, 4, 5, 6],
              start_time: 540,
              end_time: 540,
              is_active: true,
              persona_id: personas[0]?.id || '',
            });
          }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {personas.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            Create a persona first to set up automated posting schedules.
          </p>
        </div>
      )}

      {schedules.length === 0 && !showForm && personas.length > 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No schedules yet</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Schedule' : 'New Schedule'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="e.g., Morning Posts"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Sparkles className="w-4 h-4 inline mr-1" />
                Persona
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personas.map(persona => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, persona_id: persona.id })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      formData.persona_id === persona.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {persona.name?.includes('Vocabulary') ? '🏆' : 
                         persona.name?.includes('Business') ? '📈' : 
                         persona.name?.includes('Cricket') ? '🏏' :
                         persona.name?.includes('Signal') ? '💡' :
                         persona.name?.includes('Pattern') ? '🔍' : '🎭'}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">{persona.name}</span>
                      {formData.persona_id === persona.id && (
                        <Check className="w-4 h-4 text-indigo-600 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {personas.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Create a persona first from the Personas tab.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Days of Week
              </label>
              <div className="flex gap-2">
                {DAYS.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                      (formData.days_of_week || []).includes(day.value)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Post Time
              </label>
              <input
                type="time"
                value={formatTime(formData.start_time || 540)}
                onChange={e => setFormData({ ...formData, start_time: parseTime(e.target.value), end_time: parseTime(e.target.value) })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!formData.persona_id || personas.length === 0}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? 'Update' : 'Create'} Schedule
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {schedules.map(schedule => {
          const scheduleAccount = accounts.find(a => a.id === schedule.connected_account_id);
          const persona = personas.find(p => p.id === schedule.persona_id);
          
          return (
            <div
              key={schedule.id}
              className={`bg-white border rounded-xl p-4 transition-all hover:shadow-sm ${
                !schedule.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                    {!schedule.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {DAYS.filter(d => schedule.days_of_week.includes(d.value)).map(d => d.label).join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(schedule.start_time)}
                    </span>
                  </div>
                  
                  {persona && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg">{getPersonaEmoji(persona.id)}</span>
                      <span className="text-sm text-indigo-600 font-medium">{persona.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(schedule.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Schedule?</h3>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. The schedule will be permanently deleted.
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
