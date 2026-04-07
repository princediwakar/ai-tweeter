'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import NavigationLayout from '@/components/NavigationLayout';
import PersonaEditor from '@/components/profiles/PersonaEditor';
import ScheduleDialog from '@/components/profiles/ScheduleDialog';
import { Twitter, Linkedin, Plus, Settings2, Clock, Trash2, UserCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Persona, PersonaSchedule } from '@/components/profiles/types';

// Helper function to format schedule summary
function formatScheduleSummary(schedule: PersonaSchedule): string {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!schedule.days_of_week || schedule.days_of_week.length === 0) return 'Unscheduled';
  if (schedule.days_of_week.length === 7) return 'Daily';

  const hasMonToFri = [1, 2, 3, 4, 5].every(d => schedule.days_of_week.includes(d));
  const hasSatSun = schedule.days_of_week.includes(0) || schedule.days_of_week.includes(6);

  if (schedule.days_of_week.length === 5 && hasMonToFri && !hasSatSun) return 'Weekdays';
  if (schedule.days_of_week.length === 2 && schedule.days_of_week.includes(0) && schedule.days_of_week.includes(6)) return 'Weekends';

  const dayLabels = schedule.days_of_week.map(d => DAYS[d]).join(', ');

  // Format time
  const hours = Math.floor(schedule.start_time / 60);
  const mins = schedule.start_time % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const timeStr = `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;

  return `${dayLabels} at ${timeStr}`;
}

// Types for the new UI
interface ConnectedAccount {
  id: string;
  platform: 'twitter' | 'linkedin';
  handle: string;
  name: string;
  status: 'active' | 'disconnected';
  personas: Persona[];
}

function AIProfilesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quickConnecting, setQuickConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  // Modal states
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [schedulePersonaId, setSchedulePersonaId] = useState<string | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [currentSchedules, setCurrentSchedules] = useState<PersonaSchedule[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNewPersonaEditor, setShowNewPersonaEditor] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected');
    const handle = searchParams.get('handle');
    if (connected === 'success') {
      toast.success(`Connected @${handle}`);
      router.replace('/profiles');
      fetchData();
    } else if (connected === 'error') {
      const message = searchParams.get('message') || 'Connection failed';
      toast.error(message);
      router.replace('/profiles');
    }
  }, [searchParams, router]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch connected accounts
      const accountsRes = await fetch('/api/accounts');
      const accountsData = await accountsRes.json();
      setConnectedAccounts(accountsData.accounts || []);

      // Fetch personas with schedules
      const profilesRes = await fetch('/api/profiles');
      const profilesData = await profilesRes.json();
      const personas = profilesData.personas || [];

      // Transform data into the new structure
      const transformedAccounts: ConnectedAccount[] = accountsData.accounts.map((account: any) => ({
        id: account.id,
        platform: (account.platform || 'twitter').toLowerCase() as 'twitter' | 'linkedin',
        handle: account.account_username || account.name || '',
        name: account.name || account.account_username || '',
        status: 'active',
        personas: personas.filter((p: Persona) => p.connected_account_id === account.id)
      }));

      setAccounts(transformedAccounts);

      // Set first account as selected for new persona creation
      if (transformedAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(transformedAccounts[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle OAuth connection
  const handleConnect = async (platform: 'twitter' | 'linkedin') => {
    setQuickConnecting(true);
    try {
      await signIn(platform, { callbackUrl: '/profiles?connected=success' });
    } catch (error) {
      console.error(`Failed to initiate ${platform} OAuth:`, error);
      toast.error(`Failed to connect ${platform}`);
      setQuickConnecting(false);
    }
  };

  // Handle persona deletion
  const handleDeletePersona = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`/api/profiles?id=${deletingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete persona');
      }

      toast.success('Persona deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting persona:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete persona');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle schedule click
  const handleScheduleClick = (personaId: string) => {
    const persona = accounts.flatMap(a => a.personas).find(p => p.id === personaId);
    setCurrentSchedules(persona?.schedules || []);
    setSchedulePersonaId(personaId);
    setScheduleDialogOpen(true);
  };

  // Handle save schedules
  const handleSaveSchedules = async (forms: { days_of_week: number[]; start_time: number; timezone: string }[]) => {
    if (!schedulePersonaId) return;

    const persona = accounts.flatMap(a => a.personas).find(p => p.id === schedulePersonaId);
    const account = accounts.find(a => a.personas.some(p => p.id === schedulePersonaId));

    if (!account) {
      toast.error('Account not found');
      return;
    }

    const existingSchedules = persona?.schedules || [];

    try {
      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const existing = existingSchedules[i];

        const payload = {
          connected_account_id: account.id,
          name: `Schedule ${i + 1}`,
          persona_id: schedulePersonaId,
          days_of_week: form.days_of_week,
          start_time: form.start_time,
          end_time: form.start_time + 60,
          is_active: true,
          timezone: form.timezone,
        };

        let res;
        if (existing) {
          res = await fetch(`/api/accounts/${account.id}/schedules/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(`/api/accounts/${account.id}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to update Schedule ${i + 1}`);
        }
      }

      toast.success('Schedule updated');
      fetchData();
      setScheduleDialogOpen(false);
    } catch (error) {
      console.error('Error updating Schedule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update schedule');
    }
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    const account = accounts.find(a =>
      a.personas.some(p => p.schedules?.some(s => s.id === scheduleId))
    );

    if (!account) return;

    try {
      const res = await fetch(`/api/accounts/${account.id}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Failed to delete schedule");

      toast.success('Schedule deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  // Get schedule summary for a persona
  const getPersonaScheduleSummary = (persona: Persona): string => {
    if (!persona.schedules || persona.schedules.length === 0) {
      return 'No schedule set';
    }

    // For now, just show the first schedule
    return formatScheduleSummary(persona.schedules[0]);
  };

  if (loading) {
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

  return (
    <NavigationLayout>
      <div className="space-y-10 max-w-4xl mx-auto">

        {/* Header & Account Connection */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCircle className="h-6 w-6 text-zinc-900" />
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">AI Profiles</h1>
            </div>
            <p className="text-zinc-500 text-sm">Manage your connected channels, voices, and posting schedules.</p>
          </div>

          {/* Connect buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleConnect('twitter')}
              disabled={quickConnecting}
              className="bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white shadow-sm rounded-xl h-10 px-4"
            >
              {quickConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Twitter className="w-4 h-4 mr-2" />}
              Connect X
            </Button>
            <Button
              onClick={() => handleConnect('linkedin')}
              disabled={quickConnecting}
              className="bg-[#0A66C2] hover:bg-[#0958a8] text-white shadow-sm rounded-xl h-10 px-4"
            >
              {quickConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Linkedin className="w-4 h-4 mr-2" />}
              Connect LinkedIn
            </Button>
          </div>
        </div>

        {/* New Persona Editor (shown when "New AI Profile" is clicked) */}
        {showNewPersonaEditor && selectedAccountId && (
          <div className="border border-zinc-200 bg-white rounded-2xl shadow-sm p-6">
            <PersonaEditor
              accountId={selectedAccountId}
              platform={accounts.find(a => a.id === selectedAccountId)?.platform || 'twitter'}
              onPersonaUpdate={() => {
                fetchData();
                setShowNewPersonaEditor(false);
              }}
              onEditComplete={() => {
                setShowNewPersonaEditor(false);
                fetchData();
              }}
            />
          </div>
        )}

        {/* The Roster */}
        <div className="space-y-10">
          {accounts.length === 0 ? (
            <div className="border border-dashed border-zinc-200 bg-zinc-50/50 rounded-2xl p-12 text-center">
              <UserCircle className="h-6 w-6 text-zinc-400 mx-auto mb-3" />
              <h2 className="text-sm font-medium text-zinc-900">No accounts connected</h2>
              <p className="text-xs text-zinc-500 mt-1 mb-6">Connect your social accounts to start building your AI team.</p>
              <Button
                onClick={() => handleConnect('twitter')}
                disabled={quickConnecting}
                className="bg-zinc-900 text-white hover:bg-zinc-800"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Connect Twitter
              </Button>
            </div>
          ) : (
            accounts.map((account) => (
              <section key={account.id} className="space-y-4">

                {/* Account Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                      account.platform === 'twitter' ? 'bg-[#1DA1F2]' : 'bg-[#0A66C2]'
                    }`}>
                      {account.platform === 'twitter' ? <Twitter className="w-5 h-5 text-white" /> : <Linkedin className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">{account.name}</h2>
                      <p className="text-xs text-zinc-500">{account.handle}</p>
                    </div>
                  </div>

                  {/* Create New Persona Button */}
                  <Button
                    variant="outline"
                    className="h-9 px-3 border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50"
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setShowNewPersonaEditor(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> New AI Profile
                  </Button>
                </div>

                {/* Personas List */}
                <div className="grid gap-4 pl-4 border-l-2 border-zinc-100 ml-4">
                  {account.personas.length === 0 ? (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-center">
                      <p className="text-sm text-zinc-500">No personas yet. Create your first voice!</p>
                    </div>
                  ) : (
                    account.personas.map((persona) => (
                      <div key={persona.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:border-zinc-300 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                          {/* Left: Info */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-emerald-500" />
                              <h3 className="text-sm font-semibold text-zinc-900">{persona.name}</h3>
                              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 ml-2">
                                {persona.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mb-3">
                              Focus: <span className="font-medium text-zinc-700">{persona.topics?.slice(0, 3).join(' • ') || 'General'}</span>
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 inline-flex px-2.5 py-1 rounded-md">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              {getPersonaScheduleSummary(persona)}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 sm:border-l sm:border-zinc-100 sm:pl-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-3 text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200"
                              onClick={() => setEditingPersona(persona)}
                            >
                              <Settings2 className="w-3.5 h-3.5 mr-2" /> Edit AI Profile
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-3 text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200"
                              onClick={() => handleScheduleClick(persona.id)}
                            >
                              <Clock className="w-3.5 h-3.5 mr-2" /> Schedule
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl ml-2"
                              onClick={() => setDeletingId(persona.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                        </div>
                      </div>
                    ))
                  )}
                </div>

              </section>
            ))
          )}
        </div>

      </div>

      {/* Edit Persona Modal */}
      {editingPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-zinc-900">Edit Persona</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingPersona(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ×
              </Button>
            </div>
            <PersonaEditor
              accountId={editingPersona.connected_account_id}
              editingPersona={editingPersona}
              onEditComplete={() => {
                setEditingPersona(null);
                fetchData();
              }}
            />
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        schedules={currentSchedules}
        onSave={handleSaveSchedules}
        onDeleteSchedule={handleDeleteSchedule}
      />

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Delete Persona</h3>
            <p className="text-sm text-zinc-600 mb-6">
              Are you sure you want to delete this persona? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeletePersona}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </NavigationLayout>
  );
}

export default function AIProfilesPage() {
  return (
    <Suspense fallback={
      <NavigationLayout>
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="space-y-4">
            <div className="h-8 bg-zinc-100 rounded w-48 animate-pulse" />
            <div className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-64 bg-zinc-50 rounded-xl border border-zinc-200 animate-pulse" />
          </div>
        </div>
      </NavigationLayout>
    }>
      <AIProfilesContent />
    </Suspense>
  );
}