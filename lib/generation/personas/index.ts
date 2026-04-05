// lib/generation/personas/index.ts
import { DatabasePersonaGenerator } from './databasePersona';
import type { PersonaGenerator } from './base';
import type { Persona } from '../../types';

export function getPersonaGenerator(persona: Persona): PersonaGenerator {
  return new DatabasePersonaGenerator(persona);
}

export * from './base';
export * from './databasePersona';