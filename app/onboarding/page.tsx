import type { Metadata } from 'next';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';

export const metadata: Metadata = {
  title: 'Get Started — AutoGrowth AI',
  description: 'Set up your AI-powered social media presence in minutes.',
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
