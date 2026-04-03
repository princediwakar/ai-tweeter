
import { accountService } from './accountService';
import { 
  PERSONAS, 
  getAllowedPersonasForHandle, 
  getPersonaByKey, 
  getRandomPersonaForHandle,
  PersonaConfig 
} from './personas';

export async function getAllowedPersonasForAccount(accountId: string): Promise<string[]> {
  try {
    const account = await accountService.getAccount(accountId);
    if (!account) return [];
    return getAllowedPersonasForHandle(account.twitter_handle);
  } catch (error) {
    console.error(`Failed to get account for ID ${accountId}:`, error);
    return [];
  }
}

export async function isPersonaAllowedForAccount(personaKey: string, accountId: string): Promise<boolean> {
  const allowedPersonas = await getAllowedPersonasForAccount(accountId);
  return allowedPersonas.includes(personaKey);
}

export async function getRandomPersonaForAccount(accountId: string, personaKeys?: string[]): Promise<PersonaConfig> {
  const account = await accountService.getAccount(accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);
  return getRandomPersonaForHandle(account.twitter_handle, personaKeys);
}
