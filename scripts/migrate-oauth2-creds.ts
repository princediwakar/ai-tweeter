import { sql } from '@vercel/postgres';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('NEXTAUTH_SECRET or ENCRYPTION_KEY is required');
}

const key = Buffer.from(ENCRYPTION_KEY, 'base64');
const algorithm = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return iv.toString('base64') + ':' + authTag.toString('base64') + ':' + encrypted;
}

async function main() {
  console.log('🔧 Running migration...\n');

  // 1. Add columns (ignore if already exists)
  console.log('1. Adding columns to accounts table...');
  try {
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_oauth2_client_id_encrypted TEXT`;
    console.log('   ✓ twitter_oauth2_client_id_encrypted');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('   ✓ twitter_oauth2_client_id_encrypted (already exists)');
    } else {
      throw e;
    }
  }

  try {
    await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS twitter_oauth2_client_secret_encrypted TEXT`;
    console.log('   ✓ twitter_oauth2_client_secret_encrypted');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('   ✓ twitter_oauth2_client_secret_encrypted (already exists)');
    } else {
      throw e;
    }
  }

  // 2. Update Gandhi account with OAuth2 credentials
  console.log('\n2. Updating Gandhi account with OAuth2 credentials...');
  
  const gandhiClientId = process.env.GANDHI_OAUTH_CLIENT_ID;
  const gandhiClientSecret = process.env.GANDHI_OAUTH_CLIENT_SECRET;

  if (!gandhiClientId || !gandhiClientSecret) {
    console.log('   ⚠ GANDHI_OAUTH_CLIENT_ID/SECRET not found in env, skipping');
  } else {
    const encryptedClientId = encrypt(gandhiClientId);
    const encryptedClientSecret = encrypt(gandhiClientSecret);

    await sql`
      UPDATE accounts 
      SET twitter_oauth2_client_id_encrypted = ${encryptedClientId},
          twitter_oauth2_client_secret_encrypted = ${encryptedClientSecret}
      WHERE name ILIKE '%gandhi%' OR twitter_handle ILIKE '%gandhi%'
    `;
    console.log('   ✓ Gandhi account updated with OAuth2 credentials');
  }

  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
