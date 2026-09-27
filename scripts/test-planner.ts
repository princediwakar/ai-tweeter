import { sql } from '@vercel/postgres';
import { nextPostPlanner } from '../lib/brandEngine/NextPostPlanner';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log("Fetching a brand profile...");
  const res = await sql`SELECT id FROM brand_profiles LIMIT 1`;
  const brandId = res.rows[0]?.id;
  
  if (!brandId) {
    console.error("No brand found");
    return;
  }
  
  console.log(`Testing planner for brand: ${brandId}`);
  
  const plan = await nextPostPlanner.plan(brandId, 'twitter');
  console.log("Plan generated:");
  console.log(JSON.stringify(plan, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
