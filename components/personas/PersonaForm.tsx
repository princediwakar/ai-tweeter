// components/personas/PersonaForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { EditablePersona } from './types';

interface PersonaFormProps {
  data: EditablePersona;
  onChange: (data: EditablePersona) => void;
  prefix?: string;
}

export default function PersonaForm({ data, onChange, prefix = 'form' }: PersonaFormProps) {
  const [topicsText, setTopicsText] = useState(data.topics.join(', '));
  const [rssText, setRssText] = useState(data.rss_sources.join('\n'));

  useEffect(() => {
    const parsedTopics = topicsText.split(/[,\n]/).map(t => t.trim()).filter(Boolean);
    if (parsedTopics.join(',') !== data.topics.join(',')) {
      setTopicsText(data.topics.join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.topics]);

  useEffect(() => {
    const parsedRss = rssText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (parsedRss.join(',') !== data.rss_sources.join(',')) {
      setRssText(data.rss_sources.join('\n'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rss_sources]);

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
          placeholder="Persona name"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Bio / Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 resize-none"
          rows={4}
          placeholder="How should this voice sound? What kind of content do they share?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tone</label>
          <input
            type="text"
            value={data.tone}
            onChange={(e) => onChange({ ...data, tone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            placeholder="e.g., professional, witty"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Topics (comma separated or Enter)</label>
          <input
            type="text"
            value={topicsText}
            onChange={(e) => {
              setTopicsText(e.target.value);
              onChange({ ...data, topics: e.target.value.split(/[,\n]/).map(t => t.trim()).filter(Boolean) });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            placeholder="AI, startups, productivity"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Min Characters</label>
          <input
            type="number"
            value={data.min_length}
            onChange={(e) => onChange({ ...data, min_length: parseInt(e.target.value) || 50 })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            min={50}
            max={500}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Max Characters</label>
          <input
            type="number"
            value={data.max_length}
            onChange={(e) => onChange({ ...data, max_length: parseInt(e.target.value) || 280 })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            min={50}
            max={3000}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">RSS Sources (one per line, or comma separated)</label>
        <textarea
          value={rssText}
          onChange={(e) => {
            setRssText(e.target.value);
            onChange({ 
              ...data, 
              rss_sources: e.target.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean) 
            });
          }}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 resize-none font-mono text-sm"
          rows={4}
          placeholder="https://example.com/feed.xml"
        />
        <p className="text-xs text-gray-500 mt-1">Enter RSS feed URLs, one per line</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id={`${prefix}_active`}
          checked={data.is_active}
          onChange={(e) => onChange({ ...data, is_active: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor={`${prefix}_active`} className="text-sm font-medium text-gray-700">Active</label>
      </div>
    </div>
  );
}