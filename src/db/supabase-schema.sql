-- SQL schema for your database
-- Execute this in the Supabase SQL Editor

-- Profile Types Table
CREATE TABLE profile_types (
  id SERIAL PRIMARY KEY,
  profile_type VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

-- Insert default profile types
INSERT INTO profile_types (profile_type, description) 
VALUES 
  ('buyer', 'User looking to purchase'),
  ('seller', 'User looking to sell'),
  ('agent', 'Real estate or other service agent');

-- Roles Table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

-- Insert default roles
INSERT INTO roles (role_name) 
VALUES 
  ('super_admin'),
  ('free_tier'),
  ('guest_tier'),
  ('premium_tier');

-- Users Table
-- Note: Supabase already has an auth.users table, but we'll create a custom users table 
-- that links to it for our application-specific data
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  profile_type_id INTEGER REFERENCES profile_types(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auth Providers Table
CREATE TABLE auth_providers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id)
);

-- User Roles (Join Table)
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Create functions to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_auth_providers_modtime
BEFORE UPDATE ON auth_providers
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view and edit their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Similar policies for auth_providers
CREATE POLICY "Users can view own auth providers" ON auth_providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own auth providers" ON auth_providers
  FOR ALL USING (auth.uid() = user_id);

-- For user_roles, may need admin-specific policies
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create a view for user data with profile type and roles
CREATE VIEW user_profiles AS
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.phone,
  pt.profile_type,
  array_agg(r.role_name) as roles,
  u.created_at
FROM 
  users u
LEFT JOIN 
  profile_types pt ON u.profile_type_id = pt.id
LEFT JOIN 
  user_roles ur ON u.id = ur.user_id
LEFT JOIN 
  roles r ON ur.role_id = r.id
GROUP BY 
  u.id, pt.profile_type;
