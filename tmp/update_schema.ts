import { sql } from '@vercel/postgres';

async function main() {
  try {
    console.log('Adding profile_image_url column to connected_accounts table...');
    await sql`ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS profile_image_url TEXT`;
    console.log('Successfully added profile_image_url column.');
    
    // Also check current constraints
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_namespace n ON n.oid = c.connamespace 
      WHERE n.nspname = 'public' AND conrelid = 'connected_accounts'::regclass
    `;
    console.log('Current constraints on connected_accounts:');
    console.log(JSON.stringify(constraints.rows, null, 2));
    
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

main();
