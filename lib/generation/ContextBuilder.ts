// lib/generation/ContextBuilder.ts
// Unified context resolution - handles persona selection, account resolution, and data context
// Replaces scattered logic in generationProcessing.ts, generationService.ts, threadGenerationService.ts

import {
  getPersonaByKey,
  selectPersonaByWeight,
  getRandomPersonaForHandle,
  isPersonaAllowedForHandle,
  getAllPersonas,
  type Persona,
} from "@/lib/personas";
import { connectedAccountsService, type ConnectedAccount } from "../connectedAccounts";
import { getRecentPatternData } from "../db";
import type { TweetGenerationConfig } from "./types";

export interface ContextBuilderResult {
  persona: Persona;
  account: ConnectedAccount | null;
  dataContext: string;
  formatRules: string[];
}

export interface GenerationOptions {
  threadMode?: boolean;
  threadTemplate?: string;
  topic?: string;
  sourceContext?: string;
}

/**
 * Build generation context - resolves persona, account, and data
 * Single entry point replacing scattered logic across generationProcessing.ts, generationService.ts
 */
export async function buildGenerationContext(
  config: TweetGenerationConfig
): Promise<ContextBuilderResult> {
  const { connected_account_id, persona: personaKey, sourceContext } = config;

  // 1. Resolve Account
  let account: ConnectedAccount | null = null;
  if (connected_account_id && connected_account_id !== "fallback") {
    account = await connectedAccountsService.getById(connected_account_id).catch(() => null);
  }

  // 2. Resolve Persona
  const resolvedPersona = await resolvePersona(personaKey, account);
  
  // 3. Resolve Data Context
  let dataContext = sourceContext || "";
  
  // Fetch recent patterns for RSS-based personas if no source context provided
  if (connected_account_id && account && !dataContext) {
    const allPersonas = await getAllPersonas();
    const rssPersonaKeys = allPersonas
      .filter(p => p.rss_sources && p.rss_sources.length > 0)
      .map(p => p.key);
    
    if (resolvedPersona.key && rssPersonaKeys.includes(resolvedPersona.key)) {
      const recentData = await getRecentPatternData(connected_account_id, 5);
      config.recentPatterns = recentData.patterns;
      config.usedSourceUrls = recentData.usedSourceUrls;
    }
  }

  // 4. Extract Format Rules from persona config
  const pConfig = (resolvedPersona.config as Record<string, unknown>) || {};
  const formatRules = Array.isArray(pConfig.format_rules) 
    ? pConfig.format_rules as string[] 
    : [];

  return {
    persona: resolvedPersona,
    account,
    dataContext,
    formatRules,
  };
}

/**
 * Resolve persona based on config and account constraints
 */
async function resolvePersona(
  personaKey: string | undefined,
  account: ConnectedAccount | null
): Promise<Persona> {
  let persona: Persona | undefined;

  if (personaKey) {
    // Check if persona is allowed for this account
    if (account && !isPersonaAllowedForHandle(personaKey, account.account_username)) {
      console.warn(`⚠️ Persona ${personaKey} not allowed for account, falling back.`);
      persona = await getRandomPersonaForHandle(account.account_username);
    } else {
      persona = await getPersonaByKey(personaKey);
    }
  }

  if (!persona) {
    if (account) {
      persona = await getRandomPersonaForHandle(account.account_username).catch(() => selectPersonaByWeight());
    } else {
      persona = await selectPersonaByWeight();
    }
  }

  if (!persona) {
    throw new Error("No valid persona found in database");
  }

  return persona;
}

/**
 * Check if persona supports threads
 */
export async function personaSupportsThreads(personaKey: string): Promise<boolean> {
  const persona = await getPersonaByKey(personaKey);
  if (!persona) return false;
  
  const pConfig = (persona.config as Record<string, unknown>) || {};
  return Boolean(pConfig.supports_threads);
}

/**
 * Get all personas that support threads
 */
export async function getThreadCapablePersonas(): Promise<Persona[]> {
  const allPersonas = await getAllPersonas();
  return allPersonas.filter(p => {
    const pConfig = (p.config as Record<string, unknown>) || {};
    return Boolean(pConfig.supports_threads);
  });
}

export default { buildGenerationContext, personaSupportsThreads, getThreadCapablePersonas };