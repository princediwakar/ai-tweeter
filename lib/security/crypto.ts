// lib/security/crypto.ts
// Centralized encryption/decryption engine - single source of truth for all credential encryption
// Uses AES-256-GCM with scrypt key derivation

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-key-change-me';

// --- TOKEN CACHING (Performance for high-frequency decryption) ---
interface TokenCacheEntry {
  decrypted: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

function getCachedToken(key: string): string | null {
  const entry = tokenCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) tokenCache.delete(key);
    return null;
  }
  return entry.decrypted;
}

function setCachedToken(key: string, decrypted: string): void {
  if (tokenCache.size >= MAX_CACHE_SIZE) {
    const firstKey = tokenCache.keys().next().value;
    if (firstKey) tokenCache.delete(firstKey);
  }
  tokenCache.set(key, { decrypted, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
}

function clearCache(): void {
  tokenCache.clear();
}

// --- ENCRYPTION ENGINE ---

/**
 * Encrypt a string using AES-256-GCM
 * @param text - Plain text to encrypt (null/undefined returns null)
 * @returns Encrypted string in format "iv:authTag:ciphertext" or null
 */
export function encrypt(text: string | null): string | null {
  if (!text) return null;
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedText - Encrypted string in format "iv:authTag:ciphertext"
 * @returns Decrypted plain text, or original string if invalid format
 */
export function decrypt(encryptedText: string | null): string {
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText || '';
  }
  
  try {
    // Check cache first
    const cacheKey = `decrypt:${encryptedText.substring(0, 50)}`;
    const cached = getCachedToken(cacheKey);
    if (cached) return cached;
    
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    setCachedToken(cacheKey, decrypted);
    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e);
    return '';
  }
}

// --- HASHING UTILITIES ---

/**
 * Generate a SHA-256 hash of a string
 */
export function hashSHA256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a random token (e.g., for OAuth state)
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// --- EXPORTS ---

export { clearCache };
export default { encrypt, decrypt, hashSHA256, generateRandomToken, clearCache };