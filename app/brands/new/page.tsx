'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewBrand() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/brand-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_name: name, brand_url: url })
      });

      if (!res.ok) throw new Error('Failed to create brand');

      const data = await res.json();
      router.push(`/brands/${data.id}?onboarding=true`);
    } catch (error) {
      console.error(error);
      alert('Error creating brand profile');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-20 px-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold mb-4">Build Your Brand Engine</h1>
        <p className="text-xl text-gray-600">Enter your website URL and we'll automatically learn your brand voice, value props, and target audience.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Acme Corp"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website URL (Important!)</label>
            <input 
              type="url" 
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="https://acmecorp.com"
            />
            <p className="mt-2 text-sm text-gray-500">We'll crawl this to extract your brand knowledge.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading || !name}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Initializing Engine...' : 'Start 5-Minute Autopilot'}
          </button>
        </form>
      </div>
    </div>
  );
}
