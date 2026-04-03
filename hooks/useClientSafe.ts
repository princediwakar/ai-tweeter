import { useEffect, useState } from 'react';

/**
 * Hook to safely handle client-side only rendering to avoid hydration mismatches
 * Returns true only after the component has mounted on the client
 */
export function useClientSafe(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  return isClient;
}

/**
 * Hook that returns a formatted date only after client-side hydration
 * This prevents hydration mismatches with date/time formatting
 */
export function useClientSafeDate(date: Date | null, formatter: (date: Date) => string): string {
  const isClient = useClientSafe();
  
  if (!date) return '';
  
  // During SSR and before hydration, return a simple fallback
  if (!isClient) {
    return 'Loading...';
  }
  
  // After hydration, use the actual formatter
  return formatter(date);
}