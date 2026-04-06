'use client';

import Dashboard from '@/components/dashboard/Dashboard';
import NavigationLayout from '@/components/NavigationLayout';

export default function Home() {
  return (
    <NavigationLayout>
      <Dashboard />
    </NavigationLayout>
  );
}