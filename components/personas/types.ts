export interface Persona {
  id: string;
  connected_account_id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  rss_sources?: string[];
  min_length: number;
  max_length: number;
  tone?: string;
  topics?: string[];
  is_active: boolean;
  is_default: boolean;
  schedules?: PersonaSchedule[];
}

export interface PersonaSchedule {
  id: string;
  days_of_week: number[];
  start_time: number;
  is_active: boolean;
}

export interface PersonaEditorProps {
  accountId: string;
  platform?: string;
  accountName?: string;
  onPersonaUpdate?: () => void;
  onAccountChange?: (accountId: string) => void;
  accounts?: { id: string; name: string | null; account_username: string; platform?: string }[];
  selectedAccountId?: string | null;
  editingPersona?: Persona | null;
  onEditComplete?: () => void;
}

export interface EditablePersona {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  min_length: number;
  max_length: number;
  rss_sources: string[];
  is_active: boolean;
  config?: Record<string, any>;
}

export interface ScheduleFormData {
  days_of_week: number[];
  start_time: number;
}

export interface Day {
  value: number;
  label: string;
}

export const DAYS: Day[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];
