/**
 * Feature Matrix Configuration
 * Defines which features are available for each role/subscription tier combination
 */

import { ROLES, SUBSCRIPTION_TIERS, PROFESSIONAL_TYPES } from './authorizationUtils';

// Feature flags for each combination of role + subscription tier + professional type
export const FEATURE_MATRIX = {
  // PUBLIC USER - Very limited features
  [ROLES.PUBLIC]: {
    [SUBSCRIPTION_TIERS.FREE]: {
      [null]: {
        // Public features
        'view:listings': true,
        'view:public_profiles': true,
        'contact:form': true, // Limited contact form
      },
    },
  },

  // BASIC USER - Free authenticated user
  [ROLES.BASIC_USER]: {
    [SUBSCRIPTION_TIERS.FREE]: {
      [null]: {
        // All basic features
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'view:interests': true,
        'view:saved_searches': true,
        // Professional features disabled
        'manage:professional_profile': false,
        'list:properties': false,
        'manage:listings': false,
        'view:analytics': false,
        'manage:agents': false,
        'portfolio:management': false,
      },
    },
  },

  // PROFESSIONAL USER - Paid subscription
  [ROLES.PROFESSIONAL_USER]: {
    // Professional Tier (Monthly/$29, Yearly/$290)
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
      // Agent
      [PROFESSIONAL_TYPES.AGENT]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        'list:properties': true,
        'max_listings': 5,
        'manage:listings': true,
        'view:analytics': true,
        'featured:listings': 1,
        'export:contacts': false,
        'api:access': false,
        'white_label': false,
        // Broker features
        'manage:agents': false,
        'company:branding': false,
        // Investor features
        'portfolio:management': false,
        'fractional:investing': false,
      },
      // Broker
      [PROFESSIONAL_TYPES.BROKER]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        // Agent features
        'list:properties': false,
        'manage:listings': false,
        'view:analytics': true,
        // Broker features
        'manage:agents': true,
        'max_agents': 5,
        'company:branding': true,
        'export:contacts': true,
        'api:access': false,
        'white_label': false,
        // Investor features
        'portfolio:management': false,
        'fractional:investing': false,
      },
      // Investor
      [PROFESSIONAL_TYPES.INVESTOR]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        // Agent/Broker features
        'list:properties': false,
        'manage:agents': false,
        // Investor features
        'portfolio:management': true,
        'fractional:investing': true,
        'advanced:analytics': false,
        'export:portfolio': false,
        'api:access': false,
      },
      // Realtor Partner
      [PROFESSIONAL_TYPES.REALTOR_PARTNER]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        'api:access': true,
        'white_label': false,
        'export:contacts': true,
      },
    },

    // Premium Tier (Monthly/$99, Yearly/$990)
    [SUBSCRIPTION_TIERS.PREMIUM]: {
      // Agent - Premium
      [PROFESSIONAL_TYPES.AGENT]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        'list:properties': true,
        'max_listings': -1, // Unlimited
        'manage:listings': true,
        'view:analytics': true,
        'advanced:analytics': true,
        'featured:listings': -1, // Unlimited
        'export:contacts': true,
        'api:access': false,
        'white_label': false,
        'crm:access': true,
        'email:campaigns': true,
        // Broker features
        'manage:agents': false,
        'company:branding': false,
        // Investor features
        'portfolio:management': false,
        'fractional:investing': false,
      },
      // Broker - Premium
      [PROFESSIONAL_TYPES.BROKER]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        // Agent features
        'list:properties': false,
        'manage:listings': false,
        'view:analytics': true,
        // Broker features
        'manage:agents': true,
        'max_agents': -1, // Unlimited
        'company:branding': true,
        'export:contacts': true,
        'api:access': true,
        'white_label': true,
        'custom:domain': true,
        'crm:access': true,
        'advanced:analytics': true,
        // Investor features
        'portfolio:management': false,
        'fractional:investing': false,
      },
      // Investor - Premium
      [PROFESSIONAL_TYPES.INVESTOR]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        // Agent/Broker features
        'list:properties': false,
        'manage:agents': false,
        // Investor features
        'portfolio:management': true,
        'fractional:investing': true,
        'advanced:analytics': true,
        'export:portfolio': true,
        'api:access': true,
        'performance:reports': true,
      },
      // Realtor Partner - Premium
      [PROFESSIONAL_TYPES.REALTOR_PARTNER]: {
        'view:listings': true,
        'view:public_profiles': true,
        'save:properties': true,
        'contact:professionals': true,
        'access:dashboard': true,
        'manage:own_profile': true,
        'manage:professional_profile': true,
        'api:access': true,
        'white_label': true,
        'export:contacts': true,
        'custom:domain': true,
        'advanced:analytics': true,
      },
    },
  },

  // SUPER ADMIN - Full access
  [ROLES.SUPER_ADMIN]: {
    [SUBSCRIPTION_TIERS.FREE]: { // Tier/type don't matter for admin
      [null]: {
        // Return object indicating full access
        '*': true, // Wildcard indicates all features
      },
    },
  },
};

/**
 * Feature categories for UI organization
 */
export const FEATURE_CATEGORIES = {
  BASIC: {
    label: 'Basic Features',
    features: ['view:listings', 'view:public_profiles', 'save:properties', 'access:dashboard'],
    icon: 'CheckCircle',
  },
  AGENT_FEATURES: {
    label: 'Agent Features',
    features: ['list:properties', 'manage:listings', 'view:analytics', 'featured:listings'],
    icon: 'Home',
  },
  BROKER_FEATURES: {
    label: 'Broker Features',
    features: ['manage:agents', 'company:branding', 'export:contacts', 'crm:access'],
    icon: 'Users',
  },
  INVESTOR_FEATURES: {
    label: 'Investor Features',
    features: ['portfolio:management', 'fractional:investing', 'advanced:analytics'],
    icon: 'TrendingUp',
  },
  PREMIUM_FEATURES: {
    label: 'Premium Features',
    features: ['api:access', 'white_label', 'custom:domain', 'email:campaigns'],
    icon: 'Star',
  },
};

/**
 * Feature availability depends on what tier/type can access it
 */
export const FEATURE_REQUIREMENTS = {
  // Basic features available to all authenticated users
  'view:listings': { minRole: ROLES.BASIC_USER },
  'save:properties': { minRole: ROLES.BASIC_USER },
  'contact:professionals': { minRole: ROLES.BASIC_USER },

  // Professional features
  'list:properties': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PROFESSIONAL },
  'manage:listings': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PROFESSIONAL },
  'view:analytics': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PROFESSIONAL },

  // Broker features
  'manage:agents': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PROFESSIONAL, type: PROFESSIONAL_TYPES.BROKER },
  'company:branding': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PROFESSIONAL, type: PROFESSIONAL_TYPES.BROKER },

  // Premium only
  'advanced:analytics': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PREMIUM },
  'api:access': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PREMIUM },
  'white_label': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PREMIUM },
};

export default FEATURE_MATRIX;
