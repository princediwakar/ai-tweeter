import { accountService } from './accountService';
import { getPersona, getAllPersonasFromDb } from './db';
import type { Persona } from './types';

export type { Persona };
export type PersonaConfig = Persona;
export interface PersonaTopic {
  key: string;
  displayName: string;
}

// Hardcoded fallback list is now empty as we move to DB
export const PERSONAS: readonly Persona[] = [];

export type PersonaKey = typeof PERSONAS[number]['key'];

export async function getPersonaByKey(key: string): Promise<Persona | undefined> {
  if (!key) return undefined;
  const persona = await getPersona(key);
  return persona || undefined;
}

export async function selectPersonaByWeight(): Promise<Persona> {
  const personas = await getAllPersonasFromDb();
  const randomIndex = Math.floor(Math.random() * personas.length);
  return personas[randomIndex];
}

export async function getAllPersonas(): Promise<Persona[]> {
  return await getAllPersonasFromDb();
}

export const personas = PERSONAS.map(p => {
  const emojiMatch = p.name.match(/\p{Emoji}/u);
  return {
      id: p.key,
      name: p.name,
      emoji: emojiMatch ? emojiMatch[0] : '🗣️',
      description: p.description,
  };
});

const FALLBACK_ACCOUNT_PERSONA_MAPPING: Record<string, string[]> = {
  'gibbi_ai': ['english_vocab_builder'],
  'princediwakar25': ['satirist', 'pattern_spotter', 'business_storyteller', 'cricket_storyteller', 'linkedin_analyst'],
};

export async function getAllowedPersonasForHandle(twitterHandle: string): Promise<string[]> {
  if (!twitterHandle) return [];
  const cleanHandle = twitterHandle.replace('@', '').toLowerCase();

  try {
    const account = await accountService.getAccountByTwitterHandle(cleanHandle);
    if (account && account.personas && account.personas.length > 0) {
      return account.personas;
    }
  } catch (e) {
    console.warn('Failed to get DB personas, using fallback:', e);
  }

  return FALLBACK_ACCOUNT_PERSONA_MAPPING[cleanHandle] || [];
}

export function isPersonaAllowedForHandle(personaKey: string, twitterHandle: string): boolean {
  const allowedPersonas = FALLBACK_ACCOUNT_PERSONA_MAPPING[twitterHandle.replace('@', '').toLowerCase()] || [];
  return allowedPersonas.includes(personaKey);
}

export async function getRandomPersonaForHandle(twitterHandle: string, personaKeys?: string[]): Promise<Persona> {
  const allowedPersonas = await getAllowedPersonasForHandle(twitterHandle);
  
  let eligiblePersonas = allowedPersonas;
  if (personaKeys && personaKeys.length > 0) {
    eligiblePersonas = personaKeys.filter(key => allowedPersonas.includes(key));
  }
  if (eligiblePersonas.length === 0) eligiblePersonas = allowedPersonas;
  
  if (eligiblePersonas.length === 0) {
    throw new Error(`No personas allowed for handle: ${twitterHandle}`);
  }
  
  const randomKey = eligiblePersonas[Math.floor(Math.random() * eligiblePersonas.length)];
  const persona = await getPersonaByKey(randomKey);
  if (!persona) throw new Error(`Persona not found: ${randomKey}`);
  return persona;
}

export default PERSONAS;
