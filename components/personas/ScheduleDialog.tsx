// components/personas/ScheduleDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, Plus, Trash, Clock } from 'lucide-react';
import { ScheduleFormData, DAYS, PersonaSchedule } from './types';
import { formatTime, getDefaultScheduleForm } from './utils';

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  schedules?: PersonaSchedule[];
  onSave: (forms: ScheduleFormData[]) => Promise<void>;
  onDeleteSchedule?: (scheduleId: string) => Promise<void>;
}

export default function ScheduleDialog({ 
  open, 
  onClose, 
  schedules = [], 
  onSave,
  onDeleteSchedule 
}: ScheduleDialogProps) {
  const [forms, setForms] = useState<ScheduleFormData[]>([getDefaultScheduleForm()]);
  const [formScheduleIds, setFormScheduleIds] = useState<(string | null)[]>([null]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (schedules.length > 0) {
        setForms(schedules.map(s => ({
          days_of_week: s.days_of_week,
          start_time: s.start_time,
        })));
        setFormScheduleIds(schedules.map(s => s.id));
      } else {
        setForms([getDefaultScheduleForm()]);
        setFormScheduleIds([null]);
      }
    }
  }, [open, schedules]);

  const handleAdd = () => {
    setForms([...forms, getDefaultScheduleForm()]);
    setFormScheduleIds([...formScheduleIds, null]);
  };

  const handleChange = (index: number, updates: Partial<ScheduleFormData>) => {
    setForms(forms.map((form, i) => i === index ? { ...form, ...updates } : form));
  };

  const handleToggleDay = (index: number, day: number) => {
    const form = forms[index];
    const newDays = form.days_of_week.includes(day)
      ? form.days_of_week.filter(d => d !== day)
      : [...form.days_of_week, day].sort();
    handleChange(index, { days_of_week: newDays });
  };

  const handleDelete = async (index: number) => {
    const scheduleId = formScheduleIds[index];
    
    // If it exists in the DB, delete it from the DB first
    if (scheduleId && onDeleteSchedule) {
      setDeletingId(scheduleId);
      try {
        await onDeleteSchedule(scheduleId);
      } catch (error) {
        // If DB deletion fails, stop here. Don't remove it from the UI.
        setDeletingId(null);
        return; 
      }
      setDeletingId(null);
    }
    
    // FIXED: Remove from local state whether it was in the DB or just a local unsaved form
    setFormScheduleIds(formScheduleIds.filter((_, i) => i !== index));
    setForms(forms.filter((_, i) => i !== index));
    
    // If they deleted the very last form, give them a fresh empty one so the modal isn't blank
    if (forms.length === 1) {
      setForms([getDefaultScheduleForm()]);
      setFormScheduleIds([null]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(forms);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // FIXED: Validate that no ghost schedules (0 days selected) can be saved
  const isFormValid = forms.every(form => form.days_of_week.length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Schedule Posting Times</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {forms.map((form, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">Schedule #{index + 1}</span>
                {/* FIXED: Trash can is now always available, even for unsaved forms */}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={deletingId === formScheduleIds[index] && deletingId !== null}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete schedule"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {DAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleToggleDay(index, day.value)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        form.days_of_week.includes(day.value)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {form.days_of_week.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">Please select at least one day.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={formatTime(form.start_time)}
                  onChange={(e) => {
                    const [hours, mins] = e.target.value.split(':').map(Number);
                    handleChange(index, { start_time: hours * 60 + mins });
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Schedule
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isFormValid}
            className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Save Schedules"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}