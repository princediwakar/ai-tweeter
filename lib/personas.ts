// lib/personas.ts - Persona operations (all DB-driven)
import { getPersona, getAllPersonasFromDb, sqlWithRetry } from './db';
import { connectedAccountsService } from './connectedAccounts';
import type { Persona } from './types';

export type { Persona };
export type PersonaConfig = Persona;

// All personas come from DB - no hardcoded list
export const PERSONAS: readonly Persona[] = [];
export type PersonaKey = string;

export async function getPersonaByKey(key: string): Promise<Persona | undefined> {
  if (!key) return undefined;
  const persona = await getPersona(key);
  return persona || undefined;
}

export async function getAllPersonas(): Promise<Persona[]> {
  return getAllPersonasFromDb();
}

export async function selectPersonaByWeight(): Promise<Persona> {
  const personas = await getAllPersonasFromDb();
  if (personas.length === 0) {
    throw new Error('No personas found in database');
  }
  const randomIndex = Math.floor(Math.random() * personas.length);
  return personas[randomIndex];
}

export async function getAllowedPersonasForHandle(twitterHandle: string): Promise<string[]> {
  if (!twitterHandle) return [];
  const cleanHandle = twitterHandle.replace('@', '').toLowerCase();

  try {
      const account = await connectedAccountsService.getByTwitterHandle(cleanHandle);
    if (account) {
      // Get active personas from personas table
      const { rows } = await sqlWithRetry<{ key: string }>`
        SELECT key FROM personas 
        WHERE connected_account_id = ${account.id} AND is_active = true
      `;
      if (rows.length > 0) {
        return rows.map(r => r.key).filter(Boolean);
      }
    }
  } catch (e) {
    console.warn('Failed to get personas from account:', e);
  }

  return [];
}

// FIXED: Actually checking permissions now. It is now ASYNC.
export async function isPersonaAllowedForHandle(personaKey: string, twitterHandle: string): Promise<boolean> {
  const allowedPersonas = await getAllowedPersonasForHandle(twitterHandle);
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