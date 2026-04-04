-- Migration: Add user tables for SaaS multi-tenancy
-- Run with: psql "$DATABASE_URL" -f scripts/migrate-user-tables.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create users table (NextAuth.js compatible)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified TIMESTAMP,
  image TEXT,
  hashed_password TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- 2. Create sessions table (NextAuth.js compatible)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

-- 3. Create user_accounts table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_accounts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, account_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_account_id ON user_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON user_accounts(role);

-- 4. Add owner_id column to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);

-- 5. Create default admin user and assign existing accounts
-- Note: This creates a default admin user with email 'admin@example.com'
-- You should update this email and set a real password after migration
DO $$
DECLARE
  admin_user_id UUID;
  account_record RECORD;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id FROM users WHERE email = 'admin@example.com';

  IF admin_user_id IS NULL THEN
    -- Create admin user
    INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
    VALUES (uuid_generate_v4(), 'Admin User', 'admin@example.com', NOW(), NOW(), NOW())
    RETURNING id INTO admin_user_id;

    RAISE NOTICE 'Created admin user with ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
  END IF;

  -- Assign all existing accounts to admin user as owner
  FOR account_record IN SELECT id FROM accounts WHERE owner_id IS NULL
  LOOP
    -- Insert into user_accounts if not already exists
    INSERT INTO user_accounts (user_id, account_id, role, created_at)
    VALUES (admin_user_id, account_record.id, 'owner', NOW())
    ON CONFLICT (user_id, account_id) DO NOTHING;

    -- Update account owner_id
    UPDATE accounts SET owner_id = admin_user_id WHERE id = account_record.id;
  END LOOP;

  RAISE NOTICE 'Assigned existing accounts to admin user';
END $$;

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Verify migration
SELECT
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM sessions) as session_count,
  (SELECT COUNT(*) FROM user_accounts) as user_account_count,
  (SELECT COUNT(*) FROM accounts WHERE owner_id IS NOT NULL) as accounts_with_owner;

-- Show summary
SELECT 'Migration completed successfully' as status;