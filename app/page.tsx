import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardClient from './DashboardClient';

export default async function Page({ 
  searchParams 
}: { 
  searchParams: Promise<{ brandId?: string }> 
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const resolvedParams = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Forward cookies so the API routes can authenticate
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';
  
  const brandParam = resolvedParams.brandId ? `?brandId=${resolvedParams.brandId}` : '';
  
  // Fetch data on the server in parallel
  const [dashRes, accountsRes] = await Promise.all([
    fetch(`${baseUrl}/api/dashboard${brandParam}`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store'
    }),
    fetch(`${baseUrl}/api/social-accounts`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store'
    })
  ]);

  const dashboardData = await dashRes.json();
  const accountsData = await accountsRes.json();

  return (
    <DashboardClient 
      initialData={dashboardData.error ? null : dashboardData} 
      initialAccounts={accountsData.success ? accountsData.accounts : null} 
    />
  );
}
