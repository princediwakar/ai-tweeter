export interface OnboardingState {
  step: number;
  connectedPlatforms: string[];
  prompt: string;
  generatedPersonas: {
    twitter?: GeneratedPersona;
    linkedin?: GeneratedPersona;
  };
  regenerationCount: number;
  postFrequency: number;
  postTime: 'morning' | 'afternoon' | 'evening';
}

export interface GeneratedPersona {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
}