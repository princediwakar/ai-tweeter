'use client';

import { useState, useEffect } from 'react';
import { Schedule, CreateScheduleInput } from '@/lib/scheduleService';

interface ScheduleBuilderProps {
  accountId: string;
}

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export default function ScheduleBuilder({ accountId }: ScheduleBuilderProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateScheduleInput>({
    connected_account_id: accountId,
    name: '',
    timezone: 'UTC',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: 0,
    end_time: 1439,
    is_active: true,
    max_posts_per_day: 10,
  });

  useEffect(() => {
    fetchSchedules();
  }, [accountId]);

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/schedules`);
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        timezone: 'UTC',
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        start_time: 0,
        end_time: 1439,
        is_active: true,
        max_posts_per_day: 10,
      });
      
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
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
      max_posts_per_day: schedule.max_posts_per_day,
    });
    setEditingId(schedule.id);
    setShowForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      const res = await fetch(`/api/accounts/${accountId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete schedule');
      }
      
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
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

  if (loading) {
    return <div className="p-4 text-gray-500">Loading schedules...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Posting Schedules</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              connected_account_id: accountId,
              name: '',
              timezone: 'UTC',
              days_of_week: [0, 1, 2, 3, 4, 5, 6],
              start_time: 0,
              end_time: 1439,
              is_active: true,
              max_posts_per_day: 10,
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Add Schedule
        </button>
      </div>

      {schedules.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No schedules configured. Create one to automate your posting.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Schedule' : 'Create Schedule'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Schedule Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Morning Posts"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select
                value={formData.timezone}
                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Days of Week</label>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    (formData.days_of_week || []).includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={formatTime(formData.start_time || 0)}
                onChange={e => setFormData({ ...formData, start_time: parseTime(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={formatTime(formData.end_time || 1439)}
                onChange={e => setFormData({ ...formData, end_time: parseTime(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Posts Per Day</label>
            <input
              type="number"
              value={formData.max_posts_per_day}
              onChange={e => setFormData({ ...formData, max_posts_per_day: parseInt(e.target.value) })}
              min={1}
              max={50}
              className="w-full px-3 py-2 border rounded-md"
            />
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
              {editingId ? 'Update' : 'Create'} Schedule
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
        {schedules.map(schedule => (
          <div
            key={schedule.id}
            className={`bg-white border rounded-lg p-4 ${!schedule.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {schedule.name}
                  {!schedule.is_active && (
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Inactive</span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {schedule.timezone} • {DAYS.filter(d => schedule.days_of_week.includes(d.value)).map(d => d.label).join(', ')} • {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max {schedule.max_posts_per_day} posts/day
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(schedule)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
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