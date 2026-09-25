'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function BrandsDashboard() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brand-profiles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBrands(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Your Brands</h1>
        <Link 
          href="/brands/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          Add New Brand
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading brands...</div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-xl font-medium text-gray-700 mb-2">No brands found</h2>
          <p className="text-gray-500 mb-6">Create your first brand to start automating your social media.</p>
          <Link href="/brands/new" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
            Get Started
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {brands.map(brand => (
            <Link href={`/brands/${brand.id}`} key={brand.id}>
              <div className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition cursor-pointer group">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold group-hover:text-blue-600">{brand.brand_name}</h2>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    brand.onboarding_status === 'active' ? 'bg-green-100 text-green-700' :
                    brand.onboarding_status === 'ready' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {brand.onboarding_status}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{brand.brand_url || 'No URL provided'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
