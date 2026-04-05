Plan: Implement Persona System for AI Tweeter                                                                               
                                                                                                                             
 Context                                                                                                                     
                                                                                                                             
 User reported an empty dropdown in the tweet generation text box, likely related to persona selector. They want:            
 1. A default persona created for every account based on their LinkedIn/Twitter profile                                      
 2. Ability for users to create personas for each account
 3. Make personas & schedules as intuitive as possible

 User also noted: "some of the scripts maybe outdated since we modified the db tables etc."

 New Specific Requirements from User:
 1. Default Personas:
   - Twitter accounts: "Pattern Spotter" as default persona
   - LinkedIn accounts: "Business Analyst" as default persona (user selected name)
 2. RSS Sources: Each persona should have ability to add RSS sources
 3. Account-Specific Personas: Personas should be per account, not shared across accounts (no mix and match)
 4. Base Persona Field: Remove base_persona field entirely (user decision)
 5. Future Enhancement: AI-generated personas based on user content preferences (users describe what they want to post, AI
 creates personas they can modify)

 Current State Analysis

 1. Empty Dropdown Issue

 - Location: components/dashboard/MinimalComposer.tsx (lines 41-55)
 - Data Source: useTweetDashboard hook fetches personas from /api/accounts/${accountId}/personas (deprecated endpoint)
 - Root Cause: Personas array is empty because:
   - No personas exist in database for the account/user
   - Seed script (seed-user-data.ts) may not have run or failed
   - Database schema mismatch between old (custom_personas) and new (personas) tables

 2. Database Schema Issues

 - Old System: custom_personas table (linked to account_id)
 - New System: personas table (linked to user_id) - SaaS migration
 - Migration Status: Incomplete - both tables may exist, APIs reference both
 - Scripts Potentially Outdated: User mentioned DB table modifications

 3. Persona System

 - Built-in Personas: 6 personas defined in lib/personas.ts
 - Default Assignment: Hardcoded mapping for specific Twitter handles
 - Profile Data: Minimal collection (name, username, image URL) - no bio/industry data
 - Persona Creation: Manual via PersonaEditor, no automatic creation on account connection

 4. Account Profile Integration

 - Twitter Profile: Basic fields only (no bio, location, website)
 - LinkedIn Profile: Basic OpenID Connect data (no headline, industry, summary)
 - No Intelligent Inference: Cannot derive personas from profile data

 5. Outdated Scripts (Critical Issue)

 The user confirmed scripts are outdated due to DB table modifications. Found major inconsistencies:

 Outdated Scripts:
 - scripts/seed-user-data.ts: References old accounts, custom_personas, account_schedules tables
 - scripts/create-persona-table.ts: Creates old custom_personas table (should create personas)
 - scripts/create-schedule-table.ts: Creates old account_schedules table (should create schedules)
 - scripts/migrate-user-tables.sql: References old accounts table
 - lib/customPersonaService.ts: References custom_personas table

 Correct New Schema:
 - scripts/migrate-saas-platform.sql: Defines new SaaS schema (connected_accounts, personas, schedules)
 - scripts/cleanup-old-data.sql: Cleans up old tables
 - app/api/personas/route.ts: Uses new personas table

 User Confirmation: Database is using new schema (connected_accounts, personas, schedules). However, personas table
 currently links to user_id but needs to link to connected_account_id for account-specific personas.

 Schema Transition State:
 - System uses both old and new table references
 - Migration API (/api/admin/migrate-saas) exists but standalone scripts are outdated
 - Need to update all scripts to use new schema before proceeding

 Key Problems to Solve

 1. Empty Dropdown: Ensure personas are created/fetched properly
 2. Default Persona Creation: Create personas automatically when accounts are connected
 3. Profile Analysis: Enhance profile data collection for intelligent persona suggestions
 4. Script Updates: Update outdated scripts to match current database schema
 5. UI Intuitiveness: Improve persona and schedule creation UX
 6. Account-Persona Relationship: Current schema links personas to user_id, but user wants personas per account (no mix and
 match)
 7. RSS Integration: Personas need ability to store/manage RSS sources
 8. Base Persona Clarification: Understand and clarify "base persona" concept

 Implementation Approach

 Phase 1: Update Database Schema & Scripts (Foundation)

 Prerequisite: Must fix script/schema inconsistencies and update schema for new requirements.

 1. Audit Current Database State: Check which tables exist and their structure
 2. Update Personas Table Schema (modify migrate-saas-platform.sql):
   - Change personas.user_id to personas.connected_account_id (personas per account, not per user)
   - Add rss_sources JSONB column for storing RSS feed URLs
   - Add is_default boolean column to identify default personas
   - Remove base_persona column (user decision to simplify)
 3. Update seed-user-data.ts:
   - Replace accounts references with connected_accounts
   - Replace custom_personas with personas
   - Replace account_schedules with schedules
   - Update foreign key relationships to use connected_account_id
 4. Update/Remove Outdated Table Creation Scripts:
   - Update create-persona-table.ts to create updated personas table or delete
   - Update create-schedule-table.ts to create schedules table or delete
   - Update migrate-user-tables.sql to remove old accounts references
 5. Update lib/customPersonaService.ts:
   - Rename to personaService.ts
   - Update to use personas table with connected_account_id foreign key
   - Add methods for managing RSS sources
 6. Verify Migration Path: Ensure cleanup-old-data.sql removes old tables, migrate-saas-platform.sql has updated schema
 7. Run Updated Seed Script: Populate database with test data using new schema

 Phase 2: Fix Empty Dropdown (Immediate UI Fix)

 1. Update useTweetDashboard.ts: Switch from deprecated /api/accounts/${accountId}/personas to /api/personas
 2. Verify API Endpoint: Ensure /api/personas returns correct data for current user
 3. Test Persona Fetching: Verify dropdown populates with data
 4. Add Fallback Logic: If no personas exist, show helpful message or create default

 Phase 3: Automatic Default Persona Creation & RSS Integration

 1. Default Persona Rules:
   - Twitter accounts: Automatically create "Pattern Spotter" persona (from lib/personas.ts)
   - LinkedIn accounts: Automatically create "Business Analyst" persona (user-selected name)
   - Mark these as is_default = true in database
 2. Enhance OAuth Callbacks: Add automatic persona creation after successful account connection
 3. RSS Sources Management:
   - Add UI to persona editor for adding/removing RSS feed URLs
   - Store RSS sources in rss_sources JSONB column
   - Validate RSS feed URLs
 4. Persona Naming Improvements:
   - Review and improve persona names for clarity
   - Ensure LinkedIn persona has professional, business-appropriate name

 Phase 4: Intuitive Persona Management & UX Improvements

 1. Remove Base Persona Field:
   - Remove base_persona column from personas table schema
   - Update all code references to base_persona (remove or handle migration)
   - Simplify persona creation - no need to reference built-in persona types
 2. Simplified Persona Editor:
   - Streamline persona creation UI in PersonaEditor.tsx
   - Add RSS sources management section
   - Remove base_persona selection field entirely
 3. Account-Persona Association:
   - Clear visual linkage between accounts and personas in UI
   - Filter personas by connected account in dropdowns
   - Ensure "no mix and match" - personas only show for their account
 4. Future Enhancement Note (AI-generated personas):
   - Plan for future feature: Ask users what content they want to post
   - Use AI to generate persona configurations based on user preferences
   - Users can modify AI-generated personas

 Phase 5: Schedule System Improvements

 1. Visual Schedule Builder: Drag-and-drop or calendar-based interface
 2. Persona Scheduling: Associate personas with specific time slots
 3. Content Calendar View: Show scheduled posts across accounts/personas

 Critical Files to Modify

 Database Schema & Scripts (Priority 1 - Foundation)

 - scripts/migrate-saas-platform.sql - Update personas table schema:
   - Change user_id → connected_account_id (personas per account)
   - Add rss_sources JSONB column for RSS feed URLs
   - Add is_default BOOLEAN column for default personas
   - Remove base_persona column (user decision)
 - scripts/seed-user-data.ts - Update to use new schema with correct foreign keys
 - scripts/create-persona-table.ts - Update or delete (redundant with migrate-saas-platform.sql)
 - scripts/create-schedule-table.ts - Update or delete
 - scripts/cleanup-old-data.sql - Verify removes old tables correctly
 - lib/customPersonaService.ts - Rename to personaService.ts, update for new schema

 Persona Fetching & Dropdown Fix (Priority 2 - Immediate UI)

 - hooks/useTweetDashboard.ts - Update to fetch personas by connected_account_id not user_id
 - app/api/personas/route.ts - Update CRUD operations for connected_account_id and add RSS handling
 - components/dashboard/MinimalComposer.tsx - Dropdown that shows account-specific personas
 - components/dashboard/ManualGeneration.tsx - Dropdown with debug info

 Default Persona Creation (Priority 3)

 - app/auth/twitter/callback/route.ts - Create "Pattern Spotter" persona for new Twitter accounts
 - app/auth/linkedin/callback/route.ts - Create "Business Analyst" persona for new LinkedIn accounts
 - lib/personas.ts - Improve persona names, especially LinkedIn persona

 Persona Management UI & RSS (Priority 4)

 - components/personas/PersonaEditor.tsx - Add RSS sources management, remove base_persona handling
 - app/personas/page.tsx - Personas management page showing account-specific personas
 - lib/personaService.ts (renamed from customPersonaService) - Add RSS management methods

 Account-Persona Association (Priority 5)

 - components/dashboard/ModernAccountSelector.tsx - Show which personas belong to which account
 - hooks/usePersonas.ts - Update to filter personas by connected_account_id
 - Any other components that display personas - ensure they filter by account

 Verification

 1. Dropdown Test: Verify personas appear in tweet generation dropdown
 2. Account Connection Test: Connect new account, verify default persona created
 3. Persona Creation Test: Create custom persona, verify it appears in dropdown
 4. Schedule Test: Create schedule with persona, verify it works with auto-post

 