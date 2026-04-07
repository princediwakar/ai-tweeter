// app/personas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Pencil, Trash2, Clock, Cpu, User, Zap } from 'lucide-react';
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
  if (!schedule.days_of_week || schedule.days_of_week.length === 0) return 'Unscheduled';
  if (schedule.days_of_week.length === 7) return 'Continuous (Daily)';
  const hasMonToFri = [1,2,3,4,5].every(d => schedule.days_of_week.includes(d));
  const hasSatSun = schedule.days_of_week.includes(0) || schedule.days_of_week.includes(6);
  if (schedule.days_of_week.length === 5 && hasMonToFri && !hasSatSun) return 'Business Days';
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
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-4">
            <div className="h-8 bg-zinc-100 rounded w-48 animate-pulse" />
            <div className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-64 bg-zinc-50 rounded-xl border border-zinc-200 animate-pulse" />
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
        return res.json().then(err => { throw new Error(err.error || 'Failed to terminate model'); });
      }
      setPersonas(prev => prev.filter(p => p.id !== deletingId));
    })
    .catch(error => {
      console.error('Error terminating model:', error);
      alert('Failed to terminate model');
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

  const handleSaveSchedules = async (forms: { days_of_week: number[]; start_time: number; timezone: string }[]) => {
    if (!schedulePersonaId || !selectedAccount) return;
    
    const persona = personas.find(p => p.id === schedulePersonaId);
    const existingSchedules = persona?.schedules || [];
    
    try {
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const existing = existingSchedules[i];
        
        const payload = {
          connected_account_id: selectedAccount.id,
          name: `Cadence ${i + 1}`,
          persona_id: schedulePersonaId,
          days_of_week: form.days_of_week,
          start_time: form.start_time,
          end_time: form.start_time + 60,
          is_active: true,
          timezone: form.timezone,
        };
        
        let res;
        if (existing) {
          res = await fetch(`/api/accounts/${selectedAccount.id}/schedules/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`/api/accounts/${selectedAccount.id}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || `Failed to update Cadence ${i + 1}`);
        }
      }
      
      const res = await fetch(`/api/personas`);
      const data = await res.json();
      setPersonas(data.personas || []);
      setScheduleDialogOpen(false);
    } catch (error) {
      console.error('Error updating cadence:', error);
      alert(error instanceof Error ? error.message : 'Failed to update cadence');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!selectedAccount) return;
    
    try {
      const res = await fetch(`/api/accounts/${selectedAccount.id}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete cadence");
      
      setCurrentSchedules(prev => prev.filter(s => s.id !== scheduleId));
      
      const updatedPersonas = await fetch(`/api/personas`).then(r => r.json());
      setPersonas(updatedPersonas.personas || []);
    } catch (error) {
      console.error('Error deleting cadence:', error);
      alert('Failed to delete cadence');
    }
  };

  const platforms = ['twitter', 'linkedin'];
  const groupedByPlatform = platforms.map(platform => {
    const platformAccounts = accounts.filter(a => {
      const p = (a.platform || '').toLowerCase();
      if (platform === 'twitter') return p === 'twitter';
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

  const editorAccounts = accounts.map(a => ({
    id: a.id,
    name: a.name ?? null,
    account_username: a.account_username,
    platform: a.platform
  }));

  return (
    <NavigationLayout>
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="pb-6 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-5 w-5 text-zinc-900" />
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">My Voices</h1>
            </div>
            <p className="text-zinc-500 text-sm">Create and manage your content voices.</p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-12 text-center">
            <User className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-900">No accounts connected</p>
            <p className="text-xs text-zinc-500 mt-1">Connect an account to create your voice.</p>
          </div>
        ) : (
          <>
            {selectedAccount && (
              <div className="border border-zinc-200 bg-white rounded-2xl shadow-sm p-6">
                <PersonaEditor 
                  accountId={selectedAccount.id} 
                  platform={selectedAccount.platform as 'twitter' | 'linkedin'}
                  accountName={selectedAccount.name || undefined}
                  onAccountChange={setSelectedAccountId}
                  accounts={editorAccounts}
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

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-zinc-900">Your Voices</h2>
          
          {accounts.length === 0 ? (
            <p className="text-zinc-400 text-sm italic">No accounts connected yet.</p>
          ) : (
            <div className="space-y-8">
              {groupedByPlatform.map(({ platform, accounts: platformAccounts }) => (
                <div key={platform} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-zinc-100 pb-2">
                    <span className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">{platform}</span>
                  </div>
                  
                  {platformAccounts.map(({ account, personas: accountPersonas }) => (
                    <div key={account.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-700">{(account.name || account.account_username)}</span>
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
    return <p className="text-zinc-400 text-sm pl-6 italic">No voices created yet.</p>;
  }

  return (
    <div className="space-y-2 pl-6 border-l border-zinc-100 ml-1.5">
      {personas.map(persona => (
        <div key={persona.id} className="p-4 bg-white border border-zinc-200 rounded-xl space-y-3 shadow-sm hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-zinc-900 text-sm">{persona.name}</span>
              <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm border ${persona.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                {persona.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                {persona.is_active ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 mr-2">
                {persona.topics?.slice(0, 2).join(', ')}
              </span>
              <button
                onClick={() => onEdit?.(persona)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete?.(persona.id)}
                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
            {persona.schedules && persona.schedules.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Posts:</span>
                </div>
                {persona.schedules.map(schedule => (
                  <span key={schedule.id} className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md">
                    {formatScheduleDays(schedule)} at {formatScheduleTime(schedule)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>No posting schedule set</span>
              </div>
            )}
            
            <button
              onClick={() => onSchedule?.(persona.id)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Set schedule →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}