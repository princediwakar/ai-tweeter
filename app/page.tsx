'use client';

import MinimalDashboard from '@/components/dashboard/MinimalDashboard';
import NavigationLayout from '@/components/NavigationLayout';

export default function Home() {
  return (
    <NavigationLayout>
      <MinimalDashboard />
    </NavigationLayout>
  );
}