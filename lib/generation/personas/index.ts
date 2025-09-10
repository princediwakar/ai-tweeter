import { EnglishVocabBuilderGenerator } from './englishVocabBuilder';
import { SatiristGenerator } from './satirist';
import { BusinessStorytellerGenerator } from './businessStoryteller';
import { CricketStorytellerGenerator } from './cricketStoryteller';
import type { PersonaGenerator } from './base';

export const PERSONA_GENERATORS: Record<string, PersonaGenerator> = {
  'english_vocab_builder': new EnglishVocabBuilderGenerator(),
  'satirist': new SatiristGenerator(),
  'business_storyteller': new BusinessStorytellerGenerator(),
  'cricket_storyteller': new CricketStorytellerGenerator()
};

export function getPersonaGenerator(personaKey: string): PersonaGenerator | undefined {
  return PERSONA_GENERATORS[personaKey];
}

export * from './base';
export * from './englishVocabBuilder';
export * from './satirist';
export * from './businessStoryteller';
export * from './cricketStoryteller';