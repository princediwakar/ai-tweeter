#!/usr/bin/env node
/**
 * Script to add missing days_of_week column to account_schedules table.
 * Run with: POSTGRES_URL='your_connection_string' node add-days-of-week-column.mjs
 */

import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

async function addMissingColumn() {
  try {
    console.log('Checking if column days_of_week exists in account_schedules table...');

    // Check if column exists
    const checkResult = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'account_schedules'
        AND column_name = 'days_of_week';
    `;

    if (checkResult.rows.length > 0) {
      console.log('✅ Column days_of_week already exists.');
      return;
    }

    console.log('Column days_of_week not found. Adding column...');

    // Add column with default value
    await sql`
      ALTER TABLE account_schedules
      ADD COLUMN days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}';
    `;

    console.log('✅ Successfully added days_of_week column to account_schedules table.');

    // Optional: Update existing rows to have the default value
    await sql`
      UPDATE account_schedules
      SET days_of_week = '{0,1,2,3,4,5,6}'
      WHERE days_of_week IS NULL;
    `;

    console.log('✅ Updated existing rows with default days_of_week value.');

  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addMissingColumn();