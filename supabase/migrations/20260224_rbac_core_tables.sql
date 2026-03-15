-- RBAC Core Tables Migration
-- Phase 1: Core RBAC Infrastructure

-- ==============================================
-- 1. ALTER USERS TABLE - Add RBAC fields
-- ==============================================

-- Add new columns to users table for RBAC
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'basic_user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Subscription management fields  
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Feature flags storage
ALTER TABLE users ADD COLUMN IF NOT EXISTS features_enabled JSONB DEFAULT '{}';

-- Additional profile fields if not exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Make stripe_customer_id unique (only if not null)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_stripe_customer_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist
  NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_professional_type ON users(professional_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Add comment explaining role values
COMMENT ON COLUMN users.role IS 'User role: public, basic_user, professional_user, super_admin';
COMMENT ON COLUMN users.subscription_tier IS 'Subscription tier: free, professional, premium';
COMMENT ON COLUMN users.professional_type IS 'Professional type: agent, broker, investor, realtor_partner';
COMMENT ON COLUMN users.subscription_status IS 'Subscription status: none, active, cancelled, expired';

-- ==============================================
-- 2. CREATE PROFESSIONAL_PROFILES TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile Type
  profile_type TEXT NOT NULL,  -- 'agent', 'broker', 'investor', 'realtor_partner'
  
  -- Basic Info
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  
  -- Agent-Specific Fields
  agent_license_number TEXT,
  agent_mls_id TEXT,
  agent_agency_name TEXT,
  agent_agency_mls_id TEXT,
  agent_years_experience INTEGER,
  
  -- Broker-Specific Fields
  broker_company_name TEXT,
  broker_license_number TEXT,
  broker_mls_id TEXT,
  broker_company_address TEXT,
  broker_company_phone TEXT,
  broker_company_logo_url TEXT,
  broker_max_agents INTEGER DEFAULT 10,
  
  -- Investor-Specific Fields
  investor_portfolio_value DECIMAL(15,2),
  investor_investment_focus TEXT,  -- 'fractional', 'full_ownership', 'both'
  
  -- Contact Preferences
  preferred_contact_method TEXT DEFAULT 'email',  -- 'email', 'phone', 'both'
  show_phone BOOLEAN DEFAULT TRUE,
  show_email BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  
  -- Social/Web presence
  website_url TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for professional_profiles
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_type ON professional_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_is_published ON professional_profiles(is_published);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_agent_mls_id ON professional_profiles(agent_mls_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_broker_mls_id ON professional_profiles(broker_mls_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_is_verified ON professional_profiles(is_verified);

-- Unique constraints for license numbers (per type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_agent_license ON professional_profiles(agent_license_number) WHERE agent_license_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_broker_license ON professional_profiles(broker_license_number) WHERE broker_license_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_agent_mls ON professional_profiles(agent_mls_id) WHERE agent_mls_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_broker_mls ON professional_profiles(broker_mls_id) WHERE broker_mls_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE professional_profiles IS 'Unified table for all professional user profiles (agents, brokers, investors, partners)';
COMMENT ON COLUMN professional_profiles.profile_type IS 'Type of professional: agent, broker, investor, realtor_partner';
COMMENT ON COLUMN professional_profiles.agent_mls_id IS 'MLS ID for matching agent to Trestle listings';

-- ==============================================
-- 3. CREATE SUBSCRIPTION_PLANS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL UNIQUE,  -- 'free', 'professional', 'premium'
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  
  -- Features per professional type
  features JSONB NOT NULL DEFAULT '{}',
  
  -- Limits
  max_listings INTEGER,
  max_agents INTEGER,
  api_calls_per_month INTEGER,
  
  -- Display
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  -- Stripe integration
  stripe_monthly_price_id TEXT,
  stripe_yearly_price_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default subscription plans
INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, features, max_listings, max_agents, description, display_order)
VALUES 
  (
    'Free', 
    'free', 
    0, 
    0, 
    '{"agent": {"enabled": false}, "broker": {"enabled": false}, "investor": {"enabled": false}, "realtor_partner": {"enabled": false}}',
    0,
    0,
    'Browse listings, save favorites, contact agents',
    1
  ),
  (
    'Professional', 
    'professional', 
    29.00, 
    290.00,
    '{"agent": {"enabled": true, "list_properties": 5, "analytics": true, "featured_listing": 1}, "broker": {"enabled": true, "manage_agents": 5, "company_branding": true, "analytics": true}, "investor": {"enabled": true, "portfolio": true, "fractional_investing": true}, "realtor_partner": {"enabled": true, "api_access": false}}',
    5,
    5,
    'Professional features for agents, brokers, and investors',
    2
  ),
  (
    'Premium', 
    'premium', 
    99.00, 
    990.00,
    '{"agent": {"enabled": true, "list_properties": -1, "analytics": true, "featured_listing": -1, "advanced_analytics": true}, "broker": {"enabled": true, "manage_agents": -1, "company_branding": true, "analytics": true, "white_label": true, "api_access": true}, "investor": {"enabled": true, "portfolio": true, "fractional_investing": true, "advanced_analytics": true}, "realtor_partner": {"enabled": true, "api_access": true, "white_label": true}}',
    -1,
    -1,
    'Unlimited professional features with API access',
    3
  )
ON CONFLICT (tier) DO NOTHING;

-- ==============================================
-- 4. CREATE ROLE_PERMISSIONS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,  -- 'public', 'basic_user', 'professional_user', 'super_admin'
  permission TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(role, permission)
);

-- Seed permissions for each role
INSERT INTO role_permissions (role, permission, description) VALUES
  -- Public User (not authenticated)
  ('public', 'view:listings', 'View property listings'),
  ('public', 'view:public_profiles', 'View public agent/broker profiles'),
  
  -- Basic User (free, authenticated)
  ('basic_user', 'view:listings', 'View property listings'),
  ('basic_user', 'view:public_profiles', 'View public profiles'),
  ('basic_user', 'save:properties', 'Save properties to favorites'),
  ('basic_user', 'contact:professionals', 'Contact agents/brokers'),
  ('basic_user', 'access:dashboard', 'Access user dashboard'),
  ('basic_user', 'manage:own_profile', 'Manage own user profile'),
  
  -- Professional User (paid, enhanced features based on type)
  ('professional_user', 'view:listings', 'View property listings'),
  ('professional_user', 'view:public_profiles', 'View public profiles'),
  ('professional_user', 'save:properties', 'Save properties'),
  ('professional_user', 'contact:professionals', 'Contact professionals'),
  ('professional_user', 'access:dashboard', 'Access professional dashboard'),
  ('professional_user', 'manage:own_profile', 'Manage own user profile'),
  ('professional_user', 'manage:professional_profile', 'Manage professional profile'),
  ('professional_user', 'list:properties', 'List properties (agent/broker)'),
  ('professional_user', 'manage:listings', 'Edit own listings'),
  ('professional_user', 'view:analytics', 'View profile analytics'),
  ('professional_user', 'access:professional_features', 'Access professional features'),
  
  -- Super Admin
  ('super_admin', 'manage:all', 'Full system access'),
  ('super_admin', 'verify:professionals', 'Verify professional credentials'),
  ('super_admin', 'manage:users', 'Manage all users'),
  ('super_admin', 'manage:subscriptions', 'Manage user subscriptions'),
  ('super_admin', 'access:admin_dashboard', 'Access admin dashboard'),
  ('super_admin', 'view:system_analytics', 'View system analytics'),
  ('super_admin', 'manage:feature_flags', 'Manage feature flags'),
  ('super_admin', 'manage:plans', 'Manage subscription plans')
ON CONFLICT (role, permission) DO NOTHING;

-- ==============================================
-- 5. CREATE TRIGGER FOR updated_at
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for professional_profiles
DROP TRIGGER IF EXISTS professional_profiles_updated_at ON professional_profiles;
CREATE TRIGGER professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscription_plans
DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on professional_profiles
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view published profiles
CREATE POLICY "Public can view published profiles"
  ON professional_profiles
  FOR SELECT
  USING (is_published = true);

-- Policy: Users can view and edit their own profile
CREATE POLICY "Users can manage own professional profile"
  ON professional_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Super admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON professional_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Enable RLS on subscription_plans (public read)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read subscription plans
CREATE POLICY "Anyone can view subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can modify plans
CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Enable RLS on role_permissions (public read)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions
  FOR SELECT
  USING (true);

-- ==============================================
-- 7. HELPER FUNCTIONS
-- ==============================================

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM users WHERE id = user_id;
  
  -- Super admin has all permissions
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if the permission exists for the user's role
  RETURN EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE role = user_role 
    AND permission = required_permission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE(permission TEXT, description TEXT) AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = user_id;
  
  IF user_role = 'super_admin' THEN
    -- Return all permissions for super admin
    RETURN QUERY 
      SELECT DISTINCT rp.permission, rp.description 
      FROM role_permissions rp;
  ELSE
    RETURN QUERY 
      SELECT rp.permission, rp.description 
      FROM role_permissions rp 
      WHERE rp.role = user_role;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upgrade user to professional
CREATE OR REPLACE FUNCTION upgrade_to_professional(
  user_id UUID, 
  prof_type TEXT, 
  tier TEXT DEFAULT 'professional'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET 
    role = 'professional_user',
    subscription_tier = tier,
    professional_type = prof_type,
    subscription_status = 'active',
    subscription_started_at = NOW(),
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION user_has_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_to_professional TO authenticated;
