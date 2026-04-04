import { sql } from '@vercel/postgres';
import { encrypt } from '../lib/connectedAccounts';

async function test() {
  const userId = '3804825d-251f-42ee-9af2-0bc4906b328a'; // A real ID from your DB
  const finalAccountId = 'pending'; // This might be the issue if it's not a UUID
  const username = 'testuser';
  const name = 'Test User';
  const profileId = '12345';
  const accessToken = 'abc';
  const refreshToken = 'def';
  const expiresAtStr = new Date().toISOString();

  try {
    console.log('Testing INSERT with ON CONFLICT...');
    await sql`
      INSERT INTO connected_accounts (
        user_id, account_id, platform, account_username, account_name, name,
        platform_user_id, access_token_encrypted, refresh_token_encrypted,
        token_expires_at, is_active, connected_at, profile_image_url
      )
      VALUES (
        ${userId}, ${finalAccountId}, 'twitter', ${username}, ${name}, ${name},
        ${profileId}, ${encrypt(accessToken)}, ${encrypt(refreshToken)},
        ${expiresAtStr}, true, NOW(), null
      )
      ON CONFLICT (user_id, platform, account_username) 
      DO UPDATE SET 
        account_id = EXCLUDED.account_id,
        account_name = EXCLUDED.account_name,
        name = EXCLUDED.name,
        platform_user_id = EXCLUDED.platform_user_id,
        access_token_encrypted = EXCLUDED.access_token_encrypted,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        token_expires_at = EXCLUDED.token_expires_at,
        is_active = true,
        last_used_at = NOW()
    `;
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
