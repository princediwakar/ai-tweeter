import { PersonaSchedule, DAYS } from './types';

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function formatScheduleSummary(schedule: PersonaSchedule): string {
  const days = schedule.days_of_week.map(d => DAYS.find(dd => dd.value === d)?.label).join(', ');
  return `${days} at ${formatTime(schedule.start_time)}`;
}

export function formatScheduleSummaryShort(schedule: PersonaSchedule): string {
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const activeDays = schedule.days_of_week.map(d => dayLabels[d]).join('');
  return `${activeDays} ${formatTime(schedule.start_time)}`;
}

export function getDefaultEditablePersona(): EditablePersona {
  return {
    name: '',
    description: '',
    tone: '',
    topics: [],
    min_length: 100,
    max_length: 280,
    rss_sources: [],
    is_active: true,
  };
}

export function getDefaultScheduleForm(): ScheduleFormData {
  return { days_of_week: [1, 2, 3, 4, 5], start_time: 540 };
}

type EditablePersona = {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  min_length: number;
  max_length: number;
  rss_sources: string[];
  is_active: boolean;
};

type ScheduleFormData = {
  days_of_week: number[];
  start_time: number;
};
