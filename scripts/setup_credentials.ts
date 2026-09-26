import { platformSettings } from '../lib/platformSettings';
import * as dotenv from 'dotenv';

// Load the environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Setting up Twitter credentials...');
  if (process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET) {
    await platformSettings.updateTwitterCredentials({
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
    });
    console.log('✅ Twitter credentials updated successfully.');
  } else {
    console.log('⚠️ Twitter credentials missing in .env.local (OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET).');
  }

  console.log('\nSetting up LinkedIn credentials...');
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    await platformSettings.updateLinkedInCredentials({
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    });
    console.log('✅ LinkedIn credentials updated successfully.');
  } else {
    console.log('⚠️ LinkedIn credentials missing in .env.local (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET).');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error setting up credentials:', err);
  process.exit(1);
});
