'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Clock } from 'lucide-react';
import PersonaEditor from '@/components/personas/PersonaEditor';
import NavigationLayout from '@/components/NavigationLayout';
import { useTweetDashboard } from '@/hooks/useTweetDashboard';
import { Persona, PersonaSchedule } from '@/components/personas/types';
import DeleteConfirmDialog from '@/components/personas/DeleteConfirmDialog';
import ScheduleDialog from '@/components/personas/ScheduleDialog';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatScheduleTime(schedule: PersonaSchedule): string {
  const hours = Math.floor(schedule.start_time / 60);
  const mins = schedule.start_time % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

function formatScheduleDays(schedule: PersonaSchedule): string {
  if (!schedule.days_of_week || schedule.days_of_week.length === 0) return 'No days';
  if (schedule.days_of_week.length === 7) return 'Every day';
  // JS getDay(): Sun=0, Mon=1, ..., Sat=6
  // Weekdays: Mon-Fri (1-5)
  const hasMonToFri = [1,2,3,4,5].every(d => schedule.days_of_week.includes(d));
  const hasSatSun = schedule.days_of_week.includes(0) || schedule.days_of_week.includes(6);
  if (schedule.days_of_week.length === 5 && hasMonToFri && !hasSatSun) return 'Weekdays';
  // Weekends: Sat, Sun (0, 6)
  if (schedule.days_of_week.length === 2 && schedule.days_of_week.includes(0) && schedule.days_of_week.includes(6)) return 'Weekends';
  return schedule.days_of_week.map(d => DAYS[d]).join(', ');
}

export default function PersonasPage() {
  const { accounts, initialLoading } = useTweetDashboard();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [schedulePersonaId, setSchedulePersonaId] = useState<string | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [currentSchedules, setCurrentSchedules] = useState<PersonaSchedule[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  
  useEffect(() => {
    fetch(`/api/personas`)
      .then(res => res.json())
      .then(data => {
        setPersonas(data.personas || []);
      })
      .catch(console.error);
  }, []);

  if (initialLoading) {
    return (
      <NavigationLayout>
        <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </NavigationLayout>
    );
  }

  const selectedAccount = selectedAccountId 
    ? accounts.find(a => a.id === selectedAccountId)
    : accounts[0];

  const handleDeletePersona = () => {
    if (!deletingId) return;
    
    fetch(`/api/personas?id=${deletingId}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || 'Failed to delete'); });
      }
      setPersonas(prev => prev.filter(p => p.id !== deletingId));
    })
    .catch(error => {
      console.error('Error deleting persona:', error);
      alert('Failed to delete persona');
    })
    .finally(() => {
      setDeletingId(null);
    });
  };

  const handleScheduleClick = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    setCurrentSchedules(persona?.schedules || []);
    setSchedulePersonaId(personaId);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedules = async (forms: { days_of_week: number[]; start_time: number }[]) => {
    if (!schedulePersonaId || !selectedAccount) return;
    
    const persona = personas.find(p => p.id === schedulePersonaId);
    const existingSchedules = persona?.schedules || [];
    
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const existing = existingSchedules[i];
      
      const payload = {
        connected_account_id: selectedAccount.id,
        name: `Schedule ${i + 1}`,
        persona_id: schedulePersonaId,
        days_of_week: form.days_of_week,
        start_time: form.start_time,
        end_time: form.start_time,
        is_active: true,
      };
      
      if (existing) {
        await fetch(`/api/accounts/${selectedAccount.id}/schedules/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/accounts/${selectedAccount.id}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    }
    
    const res = await fetch(`/api/personas`);
    const data = await res.json();
    setPersonas(data.personas || []);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedAccount) return;
    
    try {
      await fetch(`/api/accounts/${selectedAccount.id}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      setCurrentSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const platforms = ['twitter', 'linkedin'];
  const groupedByPlatform = platforms.map(platform => {
    const platformAccounts = accounts.filter(a => {
      const p = (a.platform || '').toLowerCase();
      // Twitter: exact match
      if (platform === 'twitter') return p === 'twitter';
      // LinkedIn: match 'linkedin' OR no platform (legacy accounts without platform field)
      if (platform === 'linkedin') return p === 'linkedin' || p === '' || !a.platform;
      return false;
    });
    return {
      platform,
      accounts: platformAccounts.map(account => ({
        account,
        personas: personas.filter(p => p.connected_account_id === account.id)
      }))
    };
  }).filter(g => g.accounts.length > 0);

  // Debug: log accounts and their platforms
  console.log('Accounts:', accounts.map(a => ({ id: a.id, name: a.name, platform: a.platform })));

  return (
    <NavigationLayout>
      <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="pb-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">AI Personas</h1>
          <p className="text-gray-500 text-sm">Create and manage AI voices</p>
        </div>

        {accounts.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <p className="text-gray-500">No accounts connected</p>
          </div>
        ) : (
          <>
            {selectedAccount && (
              <div className="border border-gray-200 rounded-xl p-6">
                <PersonaEditor 
                  accountId={selectedAccount.id} 
                  platform={selectedAccount.platform as 'twitter' | 'linkedin'}
                  accountName={selectedAccount.name || undefined}
                  onAccountChange={setSelectedAccountId}
                  accounts={accounts}
                  selectedAccountId={selectedAccountId}
                  editingPersona={editingPersona}
                  onEditComplete={() => {
                    setEditingPersona(null);
                    fetch(`/api/personas`).then(res => res.json()).then(data => setPersonas(data.personas || []));
                  }}
                />
              </div>
            )}
          </>
        )}

        <div className="space-y-8">
          <h2 className="text-xl font-bold text-gray-900">All Personas</h2>
          
          {accounts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No accounts connected</p>
          ) : (
            <div className="space-y-8">
              {groupedByPlatform.map(({ platform, accounts: platformAccounts }) => (
                <div key={platform} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900 capitalize">{platform}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">{platformAccounts.length} accounts</span>
                  </div>
                  
                  {platformAccounts.map(({ account, personas: accountPersonas }) => (
                    <div key={account.id} className="space-y-3 pl-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <span className="font-medium text-gray-900">{(account.name || account.twitter_handle)} ({account.platform === 'linkedin' ? 'LinkedIn' : 'Twitter'})</span>
                      </div>
                      <PersonaListByAccount 
                        personas={accountPersonas}
                        onDelete={(id) => setDeletingId(id)}
                        onEdit={(persona) => setEditingPersona(persona)}
                        onSchedule={(id) => handleScheduleClick(id)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeletePersona}
      />

      <ScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        schedules={currentSchedules}
        onSave={handleSaveSchedules}
        onDeleteSchedule={handleDeleteSchedule}
      />
    </NavigationLayout>
  );
}

function PersonaListByAccount({ 
  personas,
  onDelete,
  onEdit,
  onSchedule,
}: { 
  personas: Persona[];
  onDelete?: (id: string) => void;
  onEdit?: (persona: Persona) => void;
  onSchedule?: (id: string) => void;
}) {
  if (personas.length === 0) {
    return <p className="text-gray-400 text-sm pl-4">No personas</p>;
  }

  return (
    <div className="space-y-2 pl-4">
      {personas.map(persona => (
        <div key={persona.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-800">{persona.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${persona.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                {persona.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 mr-2">
                {persona.topics?.slice(0, 2).join(', ')}
              </span>
              <button
                onClick={() => onEdit?.(persona)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete?.(persona.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {persona.schedules && persona.schedules.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3 h-3" />
                <span>Schedules:</span>
              </div>
              {persona.schedules.map(schedule => (
                <span key={schedule.id} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                  {formatScheduleDays(schedule)} at {formatScheduleTime(schedule)}
                </span>
              ))}
              <button
                onClick={() => onSchedule?.(persona.id)}
                className="ml-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded"
              >
                Edit Schedule
              </button>
            </div>
          )}
          
          {(!persona.schedules || persona.schedules.length === 0) && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>No schedule set</span>
              </div>
              <button
                onClick={() => onSchedule?.(persona.id)}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 rounded"
              >
                Set Schedule
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}