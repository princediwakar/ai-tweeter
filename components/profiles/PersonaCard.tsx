// components/profiles/PersonaCard.tsx
'use client';

import { Edit2, Trash2, Clock, Calendar, Plus } from 'lucide-react';
import { Persona, PersonaSchedule } from './types';
import { formatScheduleSummaryShort } from './utils';

interface PersonaCardProps {
  persona: Persona;
  onEdit: () => void;
  onDelete: () => void;
  onSchedule: () => void;
}

export default function PersonaCard({ persona, onEdit, onDelete, onSchedule }: PersonaCardProps) {
  return (
    <div className={`bg-white border rounded-xl p-5 ${!persona.is_active ? 'opacity-60' : ''} border-zinc-200`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900 flex items-center gap-2 text-lg">
            {persona.name}
            {persona.is_default && (
              <span className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Default</span>
            )}
            {!persona.is_active && (
              <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
            )}
          </h3>
          {persona.description && (
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{persona.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500">
            <span className="bg-zinc-100 px-2 py-1 rounded">Length: {persona.min_length}-{persona.max_length}</span>
            {persona.rss_sources && persona.rss_sources.length > 0 && (
              <span className="bg-zinc-100 px-2 py-1 rounded">RSS: {persona.rss_sources.length} sources</span>
            )}
            {persona.tone && (
              <span className="bg-zinc-100 px-2 py-1 rounded">Tone: {persona.tone}</span>
            )}
          </div>
          {persona.topics && persona.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {persona.topics.map((topic, i) => (
                <span key={i} className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs rounded-full">
                  {topic}
                </span>
              ))}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-700">Schedule</span>
              </div>
              <button
                type="button"
                onClick={onSchedule}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors"
              >
                {persona.schedules && persona.schedules.length > 0 ? (
                  <>
                    <Calendar className="w-4 h-4" />
                    Edit ({persona.schedules.length})
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Set Schedule
                  </>
                )}
              </button>
            </div>
            {persona.schedules && persona.schedules.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {persona.schedules.filter(s => s.is_active).map((schedule) => (
                  <span 
                    key={schedule.id} 
                    className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-700 text-xs rounded-md font-medium"
                  >
                    <Clock className="w-3 h-3" />
                    {formatScheduleSummaryShort(schedule)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
