'use client';

import { useState, useEffect, useCallback } from 'react';
import NavigationLayout from '@/components/NavigationLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';
import { usePersonas } from '@/hooks/usePersonas';
import { useSchedules } from '@/hooks/useSchedules';
import { Loader2, Twitter, Linkedin, Plus, Trash2, Edit, Power, Calendar, User, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';

const CRON_OPTIONS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9am', value: '0 9 * * *' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'personas' | 'schedules'>('accounts');
  
  const { accounts, twitterAccounts, linkedinAccounts, loading: accountsLoading, connectAccount, disconnectAccount, fetchAccounts } = useConnectedAccounts();
  const { personas, activePersonas, loading: personasLoading, createPersona, deletePersona } = usePersonas();
  const { schedules, activeSchedules, loading: schedulesLoading, createSchedule, deleteSchedule, toggleSchedule } = useSchedules();

  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: '', description: '', tone: '', topics: '' });
  
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    connected_account_id: '',
    persona_id: '',
    cron_expression: '0 * * * *',
  });

  const handleCreatePersona = async () => {
    if (!newPersona.name) {
      toast.error('Persona name is required');
      return;
    }
    await createPersona({
      name: newPersona.name,
      description: newPersona.description,
      tone: newPersona.tone,
      topics: newPersona.topics.split(',').map(t => t.trim()).filter(Boolean),
    });
    setNewPersona({ name: '', description: '', tone: '', topics: '' });
    setShowPersonaForm(false);
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.name || !newSchedule.connected_account_id) {
      toast.error('Name and account are required');
      return;
    }
    await createSchedule({
      name: newSchedule.name,
      connected_account_id: newSchedule.connected_account_id,
      persona_id: newSchedule.persona_id || undefined,
      cron_expression: newSchedule.cron_expression,
    });
    setNewSchedule({ name: '', connected_account_id: '', persona_id: '', cron_expression: '0 * * * *' });
    setShowScheduleForm(false);
  };

  const handleConnectDemo = async (platform: 'twitter' | 'linkedin') => {
    await connectAccount(platform, {
      account_username: `demo_${platform}_${Date.now()}`,
      account_name: `Demo ${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
      access_token: 'demo_token',
    });
  };

  const initiateOAuth = useCallback(async (platform: 'twitter' | 'linkedin') => {
    try {
      const response = await fetch('/api/connected-accounts/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: platform === 'twitter' ? 'initiate_twitter' : 'initiate_linkedin' 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Failed to initiate OAuth');
        return;
      }
      
      const { authUrl } = data;
      window.open(authUrl, '_blank', 'width=600,height=700');
      toast.success('Please authorize in the new window');
    } catch (err) {
      console.error('OAuth error:', err);
      toast.error('Failed to start OAuth');
    }
  }, []);

  return (
    <NavigationLayout>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-4 border-border pb-6">
          <div>
            <h1 className="text-3xl font-display-brutal tracking-tight text-foreground">
              SETTINGS
            </h1>
            <p className="text-muted-foreground font-mono-brutal text-sm mt-2">
              MANAGE YOUR CONNECTED ACCOUNTS, PERSONAS & SCHEDULES
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'accounts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('accounts')}
            className="border-2 border-border font-mono-brutal"
          >
            <User className="w-4 h-4 mr-2" />
            ACCOUNTS
          </Button>
          <Button
            variant={activeTab === 'personas' ? 'default' : 'outline'}
            onClick={() => setActiveTab('personas')}
            className="border-2 border-border font-mono-brutal"
          >
            <Settings className="w-4 h-4 mr-2" />
            PERSONAS
          </Button>
          <Button
            variant={activeTab === 'schedules' ? 'default' : 'outline'}
            onClick={() => setActiveTab('schedules')}
            className="border-2 border-border font-mono-brutal"
          >
            <Calendar className="w-4 h-4 mr-2" />
            SCHEDULES
          </Button>
        </div>

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Twitter */}
              <Card className="border-4 border-border">
                <CardHeader className="border-b-4 border-border bg-accent">
                  <CardTitle className="flex items-center gap-2 font-display-brutal">
                    <Twitter className="w-5 h-5 text-primary" />
                    TWITTER
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {twitterAccounts.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground font-mono-brutal text-sm mb-4">
                        NO TWITTER ACCOUNTS CONNECTED
                      </p>
                      <Button onClick={() => initiateOAuth('twitter')} className="font-mono-brutal">
                        <Twitter className="w-4 h-4 mr-2" />
                        CONNECT TWITTER
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {twitterAccounts.map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">@{acc.account_username}</p>
                            <p className="text-xs text-muted-foreground">
                              Connected {new Date(acc.connected_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => disconnectAccount(acc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* LinkedIn */}
              <Card className="border-4 border-border">
                <CardHeader className="border-b-4 border-border bg-accent">
                  <CardTitle className="flex items-center gap-2 font-display-brutal">
                    <Linkedin className="w-5 h-5 text-secondary" />
                    LINKEDIN
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {linkedinAccounts.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground font-mono-brutal text-sm mb-4">
                        NO LINKEDIN ACCOUNTS CONNECTED
                      </p>
                      <Button onClick={() => initiateOAuth('linkedin')} className="font-mono-brutal">
                        <Linkedin className="w-4 h-4 mr-2" />
                        CONNECT LINKEDIN
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkedinAccounts.map(acc => (
                        <div key={acc.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">@{acc.account_username}</p>
                            <p className="text-xs text-muted-foreground">
                              Connected {new Date(acc.connected_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="destructive" size="sm" onClick={() => disconnectAccount(acc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PERSONAS TAB */}
        {activeTab === 'personas' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setShowPersonaForm(!showPersonaForm)} className="font-mono-brutal">
                <Plus className="w-4 h-4 mr-2" />
                NEW PERSONA
              </Button>
            </div>

            {showPersonaForm && (
              <Card className="border-4 border-border">
                <CardContent className="p-4 space-y-4">
                  <Input
                    placeholder="Persona name"
                    value={newPersona.name}
                    onChange={e => setNewPersona({ ...newPersona, name: e.target.value })}
                    className="border-2 border-border"
                  />
                  <Textarea
                    placeholder="Description"
                    value={newPersona.description}
                    onChange={e => setNewPersona({ ...newPersona, description: e.target.value })}
                    className="border-2 border-border"
                  />
                  <Input
                    placeholder="Tone (e.g., funny, serious, inspirational)"
                    value={newPersona.tone}
                    onChange={e => setNewPersona({ ...newPersona, tone: e.target.value })}
                    className="border-2 border-border"
                  />
                  <Input
                    placeholder="Topics (comma separated)"
                    value={newPersona.topics}
                    onChange={e => setNewPersona({ ...newPersona, topics: e.target.value })}
                    className="border-2 border-border"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreatePersona} className="font-mono-brutal">CREATE</Button>
                    <Button variant="outline" onClick={() => setShowPersonaForm(false)} className="font-mono-brutal">CANCEL</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map(persona => (
                <Card key={persona.id} className="border-4 border-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold">{persona.name}</h3>
                      <Button variant="destructive" size="sm" onClick={() => deletePersona(persona.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{persona.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-1">
                      {persona.tone && (
                        <span className="text-xs bg-primary/20 px-2 py-1 rounded">{persona.tone}</span>
                      )}
                      {persona.topics?.slice(0, 2).map((t, i) => (
                        <span key={i} className="text-xs bg-secondary/20 px-2 py-1 rounded">{t}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULES TAB */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowScheduleForm(!showScheduleForm)} 
                className="font-mono-brutal"
                disabled={twitterAccounts.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                NEW SCHEDULE
              </Button>
            </div>

            {showScheduleForm && (
              <Card className="border-4 border-border">
                <CardContent className="p-4 space-y-4">
                  <Input
                    placeholder="Schedule name"
                    value={newSchedule.name}
                    onChange={e => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    className="border-2 border-border"
                  />
                  <select
                    value={newSchedule.connected_account_id}
                    onChange={e => setNewSchedule({ ...newSchedule, connected_account_id: e.target.value })}
                    className="w-full p-2 border-2 border-border bg-background"
                  >
                    <option value="">Select account</option>
                    {twitterAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>@{acc.account_username}</option>
                    ))}
                  </select>
                  <select
                    value={newSchedule.persona_id}
                    onChange={e => setNewSchedule({ ...newSchedule, persona_id: e.target.value })}
                    className="w-full p-2 border-2 border-border bg-background"
                  >
                    <option value="">Select persona (optional)</option>
                    {activePersonas.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={newSchedule.cron_expression}
                    onChange={e => setNewSchedule({ ...newSchedule, cron_expression: e.target.value })}
                    className="w-full p-2 border-2 border-border bg-background"
                  >
                    {CRON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateSchedule} className="font-mono-brutal">CREATE</Button>
                    <Button variant="outline" onClick={() => setShowScheduleForm(false)} className="font-mono-brutal">CANCEL</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {schedules.map(schedule => (
                <Card key={schedule.id} className={`border-4 border-border ${!schedule.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{schedule.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {schedule.cron_expression} • {schedule.bulk_count} tweet(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleSchedule(schedule.id, !schedule.is_active)}
                      >
                        <Power className={`w-4 h-4 ${schedule.is_active ? 'text-green-500' : 'text-red-500'}`} />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteSchedule(schedule.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </NavigationLayout>
  );
}
