# Role-Based Access Control (RBAC) Implementation Plan

## Simplified 4-Tier Role System

### Role Definitions

```
1. PUBLIC USER (Not Authenticated)
   - Can browse property listings
   - Can view public agent profiles
   - Cannot save properties
   - Cannot contact agents directly
   - Prompted to sign up for enhanced features

2. BASIC USER (Free Plan - Signed In)
   - Browse property listings
   - View public agent profiles
   - Save properties to favorites
   - Contact agents via form
   - Access basic dashboard
   - No professional features (cannot list as agent/broker)
   - Tier: "free"

3. PROFESSIONAL USER (Paid Plan - Signed In)
   - All Basic User features
   - Enhanced features based on selected profession:
     ├─ Agent: Manage agent profile, list properties, see analytics
     ├─ Broker: Manage broker company, manage agents, company dashboard
     ├─ Investor: Access crypto investment features, portfolio management
     └─ Realtor Partner: Additional API access, white-label options
   - Professional Dashboard
   - Priority support
   - Feature-rich tools per selected role
   - Tier: "professional" or "premium"

4. SUPER ADMIN (Support/Management)
   - Full system access
   - Manage all users and subscriptions
   - Verify professional credentials
   - Access analytics and reporting
   - Manage feature flags and system settings
   - Tier: "admin"
```

### Current State Analysis (SIMPLIFIED)

### Existing Systems:
- **Auth Context** (`auth-context.js`): Handles Supabase authentication, session management
- **Role Selector** (`RoleSelector.js`): Allows users to select roles during profile creation
- **Available Roles**: `user`, `agent`, `broker`, `crypto_investor`
- **Database**: Supabase with `users` table
- **Current Fields**: `id`, `email`, `created_at`, `updated_at`, `hasprofile`, and profile data fields
- **Profile Types**: 1=Agent, 2=Buyer, 3=Seller, 4=Investor

### Issues to Address:
1. Roles stored in `formData` but unclear how they're persisted to database
2. No role-based access control implemented in routes/components
3. No permission system for restricting features by role
4. No admin dashboard for managing agents/brokers
5. Profile creation not clearly linked to roles

---

## Proposed RBAC Architecture

### 1. Database Schema Updates

#### A. Users Table Enhanced Fields
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS (
  -- Authentication & Status
  role TEXT DEFAULT 'basic_user',             -- 'public', 'basic_user', 'professional_user', 'super_admin'
  subscription_tier TEXT DEFAULT 'free',      -- 'free', 'professional', 'premium'
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Professional Info (if professional_user)
  professional_type TEXT,                     -- 'agent', 'broker', 'investor', 'realtor_partner'
  
  -- Profile Data
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  
  -- Subscription Management
  subscription_started_at TIMESTAMP,
  subscription_expires_at TIMESTAMP,
  subscription_status TEXT,                   -- 'active', 'cancelled', 'expired'
  stripe_customer_id TEXT UNIQUE,             -- For payment processing
  
  -- Account Metadata
  metadata JSONB DEFAULT '{}',                -- Flexible storage for role-specific data
  features_enabled JSONB DEFAULT '{}',        -- Feature flags per subscription
  
  -- Timestamps
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_professional_type ON users(professional_type);
CREATE INDEX idx_users_is_active ON users(is_active);
```

#### B. Professional Profiles Table (UNIFIED - replaces separate agent/broker tables)
```sql
CREATE TABLE IF NOT EXISTS professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Profile Type
  profile_type TEXT NOT NULL,                 -- 'agent', 'broker', 'investor', 'realtor_partner'
  
  -- Basic Info
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  
  -- Agent-Specific Fields
  agent_license_number TEXT UNIQUE,
  agent_mls_id TEXT UNIQUE,                   -- Link to Trestle listings
  agent_agency_name TEXT,
  agent_agency_mls_id TEXT,
  agent_years_experience INTEGER,
  
  -- Broker-Specific Fields
  broker_company_name TEXT,
  broker_license_number TEXT UNIQUE,
  broker_mls_id TEXT UNIQUE,
  broker_company_address TEXT,
  broker_company_phone TEXT,
  broker_company_logo_url TEXT,
  broker_max_agents INTEGER DEFAULT 10,
  
  -- Investor-Specific Fields
  investor_portfolio_value DECIMAL(15,2),
  investor_investment_focus TEXT,             -- 'fractional', 'full_ownership', 'both'
  
  -- Contact Preferences
  preferred_contact_method TEXT,              -- 'email', 'phone', 'both'
  show_phone BOOLEAN DEFAULT TRUE,
  show_email BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,          -- Admin verification
  is_published BOOLEAN DEFAULT FALSE,         -- Public profile visibility
  verification_date TIMESTAMP,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX idx_professional_profiles_type ON professional_profiles(profile_type);
CREATE INDEX idx_professional_profiles_is_published ON professional_profiles(is_published);
CREATE INDEX idx_professional_profiles_agent_mls_id ON professional_profiles(agent_mls_id);
```

#### C. Subscription Plans Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                         -- 'Free', 'Professional', 'Premium'
  tier TEXT NOT NULL UNIQUE,                  -- 'free', 'professional', 'premium'
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  
  -- Features
  features JSONB NOT NULL DEFAULT '{}',       -- {agent: {...}, broker: {...}, investor: {...}}
  max_listings INTEGER,
  max_agents (for brokers) INTEGER,
  api_calls_per_month INTEGER,
  
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default plans
INSERT INTO subscription_plans (name, tier, features, description) VALUES
('Free', 'free', 
  '{"agent": {"enabled": false}, "broker": {"enabled": false}, "investor": {"enabled": false}}',
  'Browse listings, contact agents'),
('Professional', 'professional',
  '{"agent": {"list_properties": 5, "analytics": true}, "broker": {"manage_agents": 5}, "investor": {"portfolio": true}}',
  'Professional features based on role'),
('Premium', 'premium',
  '{"agent": {"list_properties": -1, "analytics": true}, "broker": {"manage_agents": -1}, "investor": {"portfolio": true, "advanced_analytics": true}}',
  'Unlimited professional features');
```

#### D. Simplified Permissions Table (NEW)
```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,                         -- 'public', 'basic_user', 'professional_user', 'super_admin'
  permission TEXT NOT NULL,
  description TEXT,
  
  UNIQUE(role, permission)
);

-- Seed permissions
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

-- Professional User (paid, enhanced features based on type)
('professional_user', 'view:listings', 'View property listings'),
('professional_user', 'view:public_profiles', 'View public profiles'),
('professional_user', 'save:properties', 'Save properties'),
('professional_user', 'contact:professionals', 'Contact professionals'),
('professional_user', 'access:dashboard', 'Access professional dashboard'),
('professional_user', 'manage:professional_profile', 'Manage professional profile'),
('professional_user', 'list:properties', 'List properties (agent/broker)'),
('professional_user', 'manage:listings', 'Edit own listings'),
('professional_user', 'view:analytics', 'View profile analytics'),

-- Super Admin
('super_admin', 'manage:all', 'Full system access'),
('super_admin', 'verify:professionals', 'Verify professional credentials'),
('super_admin', 'manage:subscriptions', 'Manage user subscriptions'),
('super_admin', 'access:admin_dashboard', 'Access admin dashboard'),
('super_admin', 'view:analytics', 'View system analytics');
```

---

### 2. Authorization System

#### A. Utility Functions (NEW FILE: `lib/authorizationUtils.js`)

```javascript
/**
 * Check if user has specific role
 */
export const hasRole = (user, role) => {
  return user?.role === role;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (user) => {
  return user && user.role !== 'public';
};

/**
 * Check if user is professional (paid subscription)
 */
export const isProfessional = (user) => {
  return user?.role === 'professional_user' || user?.role === 'super_admin';
};

/**
 * Check if user is basic/free user
 */
export const isBasicUser = (user) => {
  return user?.role === 'basic_user';
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = (user) => {
  return user?.role === 'super_admin';
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (user, permission) => {
  if (!user?.role) return false;
  
  const rolePermissions = {
    'public': ['view:listings', 'view:public_profiles'],
    'basic_user': ['view:listings', 'view:public_profiles', 'save:properties', 
                   'contact:professionals', 'access:dashboard'],
    'professional_user': ['view:listings', 'view:public_profiles', 'save:properties',
                          'contact:professionals', 'access:dashboard', 'manage:professional_profile',
                          'list:properties', 'manage:listings', 'view:analytics'],
    'super_admin': ['manage:all']
  };
  
  return rolePermissions[user.role]?.includes(permission) || false;
};

/**
 * Get user's professional type (if applicable)
 */
export const getProfessionalType = (user) => {
  return user?.professional_type || null; // 'agent', 'broker', 'investor', 'realtor_partner'
};

/**
 * Get available features for user based on subscription
 */
export const getAvailableFeatures = (user) => {
  if (!isProfessional(user)) {
    return {
      agent: { enabled: false },
      broker: { enabled: false },
      investor: { enabled: false }
    };
  }
  
  // In production, fetch from subscription_plans table
  // For now, return full features for professional users
  return {
    agent: { enabled: true, list_properties: -1, analytics: true },
    broker: { enabled: true, manage_agents: -1, analytics: true },
    investor: { enabled: true, portfolio: true, advanced_analytics: true },
    realtor_partner: { enabled: true, api_access: true }
  };
};
```

#### B. Protected Route HOC (NEW FILE: `components/ProtectedRoute.js`)

```javascript
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { hasRole, hasPermission, isAuthenticated } from '../lib/authorizationUtils';

/**
 * Protect routes that require authentication
 */
export const withAuthProtection = (Component, redirectTo = '/login') => {
  return function ProtectedComponent(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated(user)) {
        router.push(redirectTo);
      }
    }, [loading, user, router]);

    if (loading) return <LoadingSpinner />;
    if (!isAuthenticated(user)) return null;

    return <Component {...props} />;
  };
};

/**
 * Protect routes that require specific role
 */
export const withRoleProtection = (Component, requiredRole, redirectTo = '/unauthorized') => {
  return function ProtectedComponent(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !hasRole(user, requiredRole)) {
        router.push(redirectTo);
      }
    }, [loading, user, router]);

    if (loading) return <LoadingSpinner />;
    if (!hasRole(user, requiredRole)) return null;

    return <Component {...props} />;
  };
};

/**
 * Protect routes that require specific permission
 */
export const withPermissionProtection = (Component, requiredPermission, redirectTo = '/unauthorized') => {
  return function ProtectedComponent(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !hasPermission(user, requiredPermission)) {
        router.push(redirectTo);
      }
    }, [loading, user, router]);

    if (loading) return <LoadingSpinner />;
    if (!hasPermission(user, requiredPermission)) return null;

    return <Component {...props} />;
  };
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

#### C. Auth Context Enhancement (MODIFY: `context/auth-context.js`)

Add to returned context:
```javascript
{
  // Existing fields
  user: { 
    // Existing fields...
    role: 'basic_user' | 'professional_user' | 'super_admin',
    subscription_tier: 'free' | 'professional',
    professional_type: 'agent' | 'broker' | 'investor' | null,
    subscription_expires_at: timestamp
  },
  
  // New helper methods
  hasRole: (role) => user?.role === role,
  hasPermission: (permission) => checkPermission(user, permission),
  isProfessional: () => user?.role === 'professional_user',
  isBasicUser: () => user?.role === 'basic_user',
  isSuperAdmin: () => user?.role === 'super_admin',
  getProfessionalType: () => user?.professional_type,
}
```

---

### 3. Feature Rollout Strategy

#### Phase 1: Core RBAC Infrastructure (THIS SPRINT)
- [ ] Create database migrations
  - [ ] Alter users table (add role, subscription_tier, professional_type, etc.)
  - [ ] Create professional_profiles table
  - [ ] Create subscription_plans table
  - [ ] Create role_permissions table with seed data
- [ ] Create authorization utilities (authorizationUtils.js)
- [ ] Create protected route HOC (ProtectedRoute.js)
- [ ] Enhance auth context with role/permission methods
- [ ] Update create-profile to assign roles based on selection
- [ ] Create role-based redirect logic in _app.js

#### Phase 2: Professional Profile Management
- [ ] Create professional profile form component
- [ ] Save professional profiles to database
- [ ] Create professional profile dashboard
- [ ] Implement profile visibility toggle (is_published)
- [ ] Add verification badge system

#### Phase 3: Agent Profile Pages (Dynamic)
- [ ] Create /agents/[agentSlug] dynamic route
- [ ] Fetch agent data from professional_profiles table
- [ ] Integrate with getAgentProperties (use agent_mls_id)
- [ ] Add public agent listing/directory

#### Phase 4: Subscription & Payment
- [ ] Integrate Stripe payment
- [ ] Create subscription management page
- [ ] Implement subscription tier enforcement
- [ ] Feature flag system per subscription

#### Phase 5: Admin Dashboard
- [ ] Super admin dashboard
- [ ] User/subscription management
- [ ] Professional verification interface
- [ ] System analytics

#### Phase 6: Access Control Enforcement
- [ ] Implement route protection throughout app
- [ ] Add permission checks to components
- [ ] Create "upgrade to professional" prompts
- [ ] Audit logging

---

### 4. Role Hierarchy & Permissions Matrix

```
PUBLIC USER (Not Authenticated)
│
├─ View listings
├─ View public agent/broker profiles
└─ Prompted to sign up

     ↓ (Sign Up - Free)

BASIC USER (Free - Authenticated)
│
├─ All Public permissions
├─ Save properties
├─ Contact professionals
├─ User dashboard
└─ Cannot access professional features

     ↓ (Upgrade to Paid)

PROFESSIONAL USER (Paid - Authenticated)
│
├─ All Basic User permissions
├─ Manage professional profile
├─ List properties (agent/broker only)
├─ View analytics
├─ Professional dashboard
└─ Role-specific features

     ↓ (Make Admin)

SUPER ADMIN (Support/System)
│
└─ Full system access
  ├─ Manage all users
  ├─ Verify professionals
  ├─ Manage subscriptions
  └─ Access analytics

Subscription Tier Mapping:
├─ Free → basic_user (limited features)
├─ Professional → professional_user + professional_type (enhanced features)
└─ Premium → professional_user + professional_type (unlimited features)
```

---

### 5. Implementation Details

#### Professional Type Options (within professional_user role):
- **Agent**: List properties, view analytics, manage agent profile
- **Broker**: Manage company, manage agents, broker dashboard
- **Investor**: Portfolio management, fractional ownership
- **Realtor Partner**: API access, white-label options

#### Subscription Tier Features:

**Free (Basic User)**
```json
{
  "can_list_properties": false,
  "can_manage_agents": false,
  "can_access_api": false,
  "property_listings_limit": 0,
  "agent_management_limit": 0
}
```

**Professional (Professional User)**
```json
{
  "agent": {
    "can_list_properties": true,
    "property_listings_limit": 5,
    "analytics_enabled": true,
    "featured_listing": true
  },
  "broker": {
    "can_manage_agents": true,
    "agent_management_limit": 5,
    "company_branding": true,
    "analytics_enabled": true
  },
  "investor": {
    "portfolio_enabled": true,
    "fractional_investing": true
  }
}
```

**Premium (Professional User - Unlimited)**
```json
{
  "agent": {
    "property_listings_limit": -1,
    "featured_listings": -1,
    "advanced_analytics": true
  },
  "broker": {
    "agent_management_limit": -1,
    "white_label": true,
    "api_access": true
  },
  "investor": {
    "portfolio_enabled": true,
    "advanced_analytics": true
  }
}
```

---

### 6. Implementation Checklist

**Database Setup (Phase 1):**
- [ ] Create users table migration
- [ ] Create professional_profiles table migration
- [ ] Create subscription_plans table migration
- [ ] Create role_permissions table migration
- [ ] Seed subscription_plans and role_permissions tables
- [ ] Add indexes for performance

**Auth Context & Utilities (Phase 1):**
- [ ] Create authorizationUtils.js
- [ ] Create ProtectedRoute.js components
- [ ] Enhance auth-context.js with role methods
- [ ] Update auth initialization to fetch professional_profiles

**Create Profile Flow (Phase 1-2):**
- [ ] Update RoleSelector to distinguish free vs paid
- [ ] Update create-profile to save role to users table
- [ ] Create ProfessionalProfileForm component
- [ ] Add database save logic for professional_profiles

**Professional Profile Features (Phase 2-3):**
- [ ] Professional profile management page
- [ ] Public profile pages (/agents/[slug], /brokers/[slug])
- [ ] Agent property listing integration
- [ ] Profile verification workflow

**Payment & Subscriptions (Phase 4):**
- [ ] Stripe integration
- [ ] Subscription checkout flow
- [ ] Subscription management dashboard
- [ ] Feature enforcement by tier

**Admin Dashboard (Phase 5):**
- [ ] User management interface
- [ ] Subscription management interface
- [ ] Professional verification interface
- [ ] System analytics dashboard

---

### 7. Data Flow Diagram

```
Signup Flow:
  User Registration
    ↓
  Auth Session Created (role: 'basic_user', subscription_tier: 'free')
    ↓
  Choose Professional Type (optional)
    ├─ No → Remain basic_user
    └─ Yes → Create professional_profiles record
       ↓
    Upgrade to Professional
       ├─ Stripe Checkout
       ├─ Payment Processed
       └─ Update: role: 'professional_user', subscription_tier: 'professional'
          Update professional_profiles.is_published: true (after verification)

Route/Component Access:
  /public-pages → Available to public, basic_user, professional_user
  /dashboard → Requires basic_user or professional_user
  /professional/[feature] → Requires professional_user role
  /admin → Requires super_admin role
```

---

## Key Implementation Answers

### 1. Agent Matching to Trestle
**Solution**: Use `agent_mls_id` stored in professional_profiles
- When agent creates profile, they enter their MLS ID
- Use this to fetch properties via getAgentProperties({ mls_id: user.professional_type_mls_id })

### 2. Broker-Agent Relationship
**Solution**: Simple 1:N relationship via professional_profiles.user_id
- Brokers (professional_type='broker') can add/remove agents
- Create junction table if complex hierarchy needed later
- For now: agents select broker during onboarding

### 3. Subscription Model
**Solution**:
- Free tier: basic_user, limited access
- Professional tier: $29/month or $290/year (adjustable)
- Stripe handles payment and renewal
- features_enabled JSONB controls what's available

### 4. Professional Verification
**Solution**:
- Manual verification by super_admin for now
- Admin checks MLS license number and verifies legitimacy
- is_verified flag in professional_profiles
- Display verification badge on public profiles
- Future: Auto-verify via MLS API integration

### 5. Profile Visibility
**Solution**:
- is_published flag in professional_profiles
- Auto-set to true after verification by admin
- Professional can toggle visibility in dashboard
- Unpublished profiles still accessible via direct URL (but not listed)

### 6. Backward Compatibility
**Solution**:
- No migration needed initially (fresh start with clear role system)
- Old sessionStorage roles ignored
- If needed later, can create one-time migration script
- Focus on clean new system

---

## Next Steps to Confirm

1. ✅ **4-Tier Role System** - Confirmed
2. ✅ **Simplified Professional Types** - Confirmed
3. **Payment Provider**: Stripe or other?
4. **Professional Tier Pricing**: $29/month, $290/year?
5. **MLS ID Verification**: Manual or auto-API?
6. **When to start Phase 2**: After Phase 1 complete?

---

## Quick Summary

This simplified 4-tier system:
- **Easy to understand**: Public → Basic (Free) → Professional (Paid) → Admin
- **Flexible**: Professional tier supports multiple role types (agent, broker, investor)
- **Payment-ready**: Subscription tier directly controls feature access
- **Scalable**: Easy to add new professional types without changing core role structure
- **Maintenance-friendly**: Single professional_profiles table instead of separate agent/broker tables

