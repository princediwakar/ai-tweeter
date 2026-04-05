import { connectedAccountsService } from '../lib/connectedAccounts';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function run() {
  console.log('--- Social Infrastructure Audit ---');
  try {
    const result = await (connectedAccountsService as any).sqlWithRetry`SELECT * FROM connected_accounts`;
    const rows = result.rows;
    console.log(`Total DB Rows Found: ${rows.length}`);
    
    rows.forEach((row: any) => {
      console.log(`- [${row.platform.toUpperCase()}] ${row.account_username} (ID: ${row.id})`);
      console.log(`  Access Token Enc: ${!!row.access_token_encrypted ? 'YES' : 'NO'}`);
      console.log(`  Refresh Token Enc: ${!!row.refresh_token_encrypted ? 'YES' : 'NO'}`);
      console.log(`  Is Active: ${row.is_active}`);
    });
  } catch (err) {
    console.error('Audit Failed:', err);
  }
}

run();
