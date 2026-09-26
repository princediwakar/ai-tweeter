import { AnalyzedBrand } from '@/lib/services/brandAnalyzer';

export interface OnboardingState {
  step: number;
  connectedPlatforms: string[];
  sourceUrl: string;
  brandProfile?: AnalyzedBrand;
  regenerationCount: number;
  postFrequency: number;
  postTime: 'morning' | 'afternoon' | 'evening';
}