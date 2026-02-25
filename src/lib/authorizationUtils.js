/**
 * Authorization Utility Functions
 * Provides role-based access control helpers for the application
 * 
 * Role Hierarchy:
 * - public: Not authenticated
 * - basic_user: Free authenticated user
 * - professional_user: Paid user with professional features
 * - super_admin: Full system access
 */

// Role constants
export const ROLES = {
  PUBLIC: 'public',
  BASIC_USER: 'basic_user',
  PROFESSIONAL_USER: 'professional_user',
  SUPER_ADMIN: 'super_admin',
};

// Professional types
export const PROFESSIONAL_TYPES = {
  AGENT: 'agent',
  BROKER: 'broker',
  INVESTOR: 'investor',
  REALTOR_PARTNER: 'realtor_partner',
};

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PROFESSIONAL: 'professional',
  PREMIUM: 'premium',
};

// Permission constants
export const PERMISSIONS = {
  // Viewing
  VIEW_LISTINGS: 'view:listings',
  VIEW_PUBLIC_PROFILES: 'view:public_profiles',
  VIEW_ANALYTICS: 'view:analytics',
  VIEW_SYSTEM_ANALYTICS: 'view:system_analytics',
  
  // Property actions
  SAVE_PROPERTIES: 'save:properties',
  LIST_PROPERTIES: 'list:properties',
  MANAGE_LISTINGS: 'manage:listings',
  
  // Contact
  CONTACT_PROFESSIONALS: 'contact:professionals',
  
  // Dashboard access
  ACCESS_DASHBOARD: 'access:dashboard',
  ACCESS_ADMIN_DASHBOARD: 'access:admin_dashboard',
  ACCESS_PROFESSIONAL_FEATURES: 'access:professional_features',
  
  // Profile management
  MANAGE_OWN_PROFILE: 'manage:own_profile',
  MANAGE_PROFESSIONAL_PROFILE: 'manage:professional_profile',
  
  // Admin actions
  MANAGE_ALL: 'manage:all',
  MANAGE_USERS: 'manage:users',
  MANAGE_SUBSCRIPTIONS: 'manage:subscriptions',
  MANAGE_FEATURE_FLAGS: 'manage:feature_flags',
  MANAGE_PLANS: 'manage:plans',
  VERIFY_PROFESSIONALS: 'verify:professionals',
};

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.PUBLIC]: [
    PERMISSIONS.VIEW_LISTINGS,
    PERMISSIONS.VIEW_PUBLIC_PROFILES,
  ],
  [ROLES.BASIC_USER]: [
    PERMISSIONS.VIEW_LISTINGS,
    PERMISSIONS.VIEW_PUBLIC_PROFILES,
    PERMISSIONS.SAVE_PROPERTIES,
    PERMISSIONS.CONTACT_PROFESSIONALS,
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PROFILE,
  ],
  [ROLES.PROFESSIONAL_USER]: [
    PERMISSIONS.VIEW_LISTINGS,
    PERMISSIONS.VIEW_PUBLIC_PROFILES,
    PERMISSIONS.SAVE_PROPERTIES,
    PERMISSIONS.CONTACT_PROFESSIONALS,
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.MANAGE_PROFESSIONAL_PROFILE,
    PERMISSIONS.LIST_PROPERTIES,
    PERMISSIONS.MANAGE_LISTINGS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.ACCESS_PROFESSIONAL_FEATURES,
  ],
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.MANAGE_ALL, // Super admin has all permissions
  ],
};

/**
 * Check if user is authenticated (not public)
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isAuthenticated = (user) => {
  return user && user.role !== ROLES.PUBLIC && user.id;
};

/**
 * Check if user has specific role
 * @param {Object} user - User object from auth context
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export const hasRole = (user, role) => {
  if (!user) return role === ROLES.PUBLIC;
  return user.role === role;
};

/**
 * Check if user is a basic/free user
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isBasicUser = (user) => {
  return user?.role === ROLES.BASIC_USER;
};

/**
 * Check if user is a professional user (paid subscription)
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isProfessional = (user) => {
  return user?.role === ROLES.PROFESSIONAL_USER || user?.role === ROLES.SUPER_ADMIN;
};

/**
 * Check if user is super admin
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isSuperAdmin = (user) => {
  return user?.role === ROLES.SUPER_ADMIN;
};

/**
 * Check if user has minimum role level
 * Role hierarchy: public < basic_user < professional_user < super_admin
 * @param {Object} user - User object from auth context
 * @param {string} minRole - Minimum required role
 * @returns {boolean}
 */
export const hasMinRole = (user, minRole) => {
  const roleHierarchy = {
    [ROLES.PUBLIC]: 0,
    [ROLES.BASIC_USER]: 1,
    [ROLES.PROFESSIONAL_USER]: 2,
    [ROLES.SUPER_ADMIN]: 3,
  };

  const userRoleLevel = roleHierarchy[user?.role] ?? 0;
  const minRoleLevel = roleHierarchy[minRole] ?? 0;

  return userRoleLevel >= minRoleLevel;
};

/**
 * Check if user has specific permission
 * @param {Object} user - User object from auth context
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user?.role) {
    // Check public permissions
    return ROLE_PERMISSIONS[ROLES.PUBLIC]?.includes(permission) || false;
  }

  // Super admin has all permissions
  if (user.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object from auth context
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - User object from auth context
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Get all permissions for a user based on their role
 * @param {Object} user - User object from auth context
 * @returns {string[]}
 */
export const getUserPermissions = (user) => {
  if (!user?.role) {
    return ROLE_PERMISSIONS[ROLES.PUBLIC] || [];
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    // Return all permissions for super admin
    return Object.values(PERMISSIONS);
  }

  return ROLE_PERMISSIONS[user.role] || [];
};

/**
 * Get user's professional type (if applicable)
 * @param {Object} user - User object from auth context
 * @returns {string|null}
 */
export const getProfessionalType = (user) => {
  return user?.professional_type || null;
};

/**
 * Check if user is a specific professional type
 * @param {Object} user - User object from auth context
 * @param {string} type - Professional type to check
 * @returns {boolean}
 */
export const isProfessionalType = (user, type) => {
  return isProfessional(user) && user?.professional_type === type;
};

/**
 * Check if user is an agent
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isAgent = (user) => {
  return isProfessionalType(user, PROFESSIONAL_TYPES.AGENT);
};

/**
 * Check if user is a broker
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isBroker = (user) => {
  return isProfessionalType(user, PROFESSIONAL_TYPES.BROKER);
};

/**
 * Check if user is an investor
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isInvestor = (user) => {
  return isProfessionalType(user, PROFESSIONAL_TYPES.INVESTOR);
};

/**
 * Check if user is a realtor partner
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isRealtorPartner = (user) => {
  return isProfessionalType(user, PROFESSIONAL_TYPES.REALTOR_PARTNER);
};

/**
 * Get user's subscription tier
 * @param {Object} user - User object from auth context
 * @returns {string}
 */
export const getSubscriptionTier = (user) => {
  return user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
};

/**
 * Check if user has active subscription
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const hasActiveSubscription = (user) => {
  if (!user) return false;
  
  // Check subscription status
  if (user.subscription_status !== 'active') {
    return false;
  }
  
  // Check if subscription has expired
  if (user.subscription_expires_at) {
    const expiresAt = new Date(user.subscription_expires_at);
    if (expiresAt < new Date()) {
      return false;
    }
  }
  
  return true;
};

/**
 * Check if user's subscription is expiring soon (within 7 days)
 * @param {Object} user - User object from auth context
 * @returns {boolean}
 */
export const isSubscriptionExpiringSoon = (user) => {
  if (!user?.subscription_expires_at) return false;
  
  const expiresAt = new Date(user.subscription_expires_at);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  return expiresAt <= sevenDaysFromNow && expiresAt > new Date();
};

/**
 * Get available features for user based on subscription and professional type
 * @param {Object} user - User object from auth context
 * @returns {Object}
 */
export const getAvailableFeatures = (user) => {
  const defaultFeatures = {
    agent: { enabled: false },
    broker: { enabled: false },
    investor: { enabled: false },
    realtor_partner: { enabled: false },
  };

  if (!isProfessional(user)) {
    return defaultFeatures;
  }

  // Return user's stored features if available
  if (user.features_enabled && Object.keys(user.features_enabled).length > 0) {
    return { ...defaultFeatures, ...user.features_enabled };
  }

  // Default professional features based on tier
  const tier = getSubscriptionTier(user);
  const professionalType = getProfessionalType(user);

  if (tier === SUBSCRIPTION_TIERS.PREMIUM) {
    return {
      agent: { enabled: true, list_properties: -1, analytics: true, featured_listing: -1, advanced_analytics: true },
      broker: { enabled: true, manage_agents: -1, company_branding: true, analytics: true, white_label: true, api_access: true },
      investor: { enabled: true, portfolio: true, fractional_investing: true, advanced_analytics: true },
      realtor_partner: { enabled: true, api_access: true, white_label: true },
    };
  }

  if (tier === SUBSCRIPTION_TIERS.PROFESSIONAL) {
    return {
      agent: { enabled: true, list_properties: 5, analytics: true, featured_listing: 1 },
      broker: { enabled: true, manage_agents: 5, company_branding: true, analytics: true },
      investor: { enabled: true, portfolio: true, fractional_investing: true },
      realtor_partner: { enabled: true, api_access: false },
    };
  }

  return defaultFeatures;
};

/**
 * Check if user can access a specific feature
 * @param {Object} user - User object from auth context
 * @param {string} professionalType - Professional type (agent, broker, investor)
 * @param {string} feature - Feature to check
 * @returns {boolean}
 */
export const canAccessFeature = (user, professionalType, feature) => {
  const features = getAvailableFeatures(user);
  const typeFeatures = features[professionalType];
  
  if (!typeFeatures?.enabled) {
    return false;
  }
  
  // Check if the specific feature exists and is truthy/has value
  if (feature in typeFeatures) {
    const featureValue = typeFeatures[feature];
    // Handle numeric limits (-1 means unlimited)
    if (typeof featureValue === 'number') {
      return featureValue !== 0;
    }
    return Boolean(featureValue);
  }
  
  return false;
};

/**
 * Get the redirect path based on user's auth state and role
 * @param {Object} user - User object from auth context
 * @param {boolean} hasProfile - Whether user has completed profile
 * @returns {string}
 */
export const getAuthRedirectPath = (user, hasProfile) => {
  if (!isAuthenticated(user)) {
    return '/login';
  }

  if (!hasProfile) {
    return '/create-profile?setup=true';
  }

  // Role-based dashboard routing
  if (isSuperAdmin(user)) {
    return '/admin/dashboard';
  }

  if (isProfessional(user)) {
    return '/dashboard'; // Could be '/professional/dashboard' in future
  }

  return '/dashboard';
};

/**
 * Check if user needs to upgrade for a feature
 * @param {Object} user - User object from auth context
 * @param {string} requiredTier - Minimum tier required
 * @returns {boolean}
 */
export const needsUpgrade = (user, requiredTier = SUBSCRIPTION_TIERS.PROFESSIONAL) => {
  const tierHierarchy = {
    [SUBSCRIPTION_TIERS.FREE]: 0,
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: 1,
    [SUBSCRIPTION_TIERS.PREMIUM]: 2,
  };

  const userTierLevel = tierHierarchy[getSubscriptionTier(user)] ?? 0;
  const requiredTierLevel = tierHierarchy[requiredTier] ?? 0;

  return userTierLevel < requiredTierLevel;
};

/**
 * Map legacy roles to new RBAC system
 * @param {string[]} legacyRoles - Array of legacy role strings
 * @returns {Object} - Object with new role and professional_type
 */
export const mapLegacyRoles = (legacyRoles) => {
  if (!Array.isArray(legacyRoles) || legacyRoles.length === 0) {
    return { role: ROLES.BASIC_USER, professional_type: null };
  }

  // Check for professional roles
  if (legacyRoles.includes('broker')) {
    return { role: ROLES.BASIC_USER, professional_type: PROFESSIONAL_TYPES.BROKER };
  }
  if (legacyRoles.includes('agent')) {
    return { role: ROLES.BASIC_USER, professional_type: PROFESSIONAL_TYPES.AGENT };
  }
  if (legacyRoles.includes('crypto_investor')) {
    return { role: ROLES.BASIC_USER, professional_type: PROFESSIONAL_TYPES.INVESTOR };
  }

  return { role: ROLES.BASIC_USER, professional_type: null };
};

export default {
  // Role constants
  ROLES,
  PROFESSIONAL_TYPES,
  SUBSCRIPTION_TIERS,
  PERMISSIONS,
  
  // Auth checks
  isAuthenticated,
  hasRole,
  isBasicUser,
  isProfessional,
  isSuperAdmin,
  hasMinRole,
  
  // Permission checks
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  
  // Professional type checks
  getProfessionalType,
  isProfessionalType,
  isAgent,
  isBroker,
  isInvestor,
  isRealtorPartner,
  
  // Subscription helpers
  getSubscriptionTier,
  hasActiveSubscription,
  isSubscriptionExpiringSoon,
  getAvailableFeatures,
  canAccessFeature,
  needsUpgrade,
  
  // Routing helpers
  getAuthRedirectPath,
  
  // Migration helpers  
  mapLegacyRoles,
};
