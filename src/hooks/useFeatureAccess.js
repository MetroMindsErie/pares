/**
 * useFeatureAccess Hook
 * Provides feature access control logic for UI components
 */

import { useAuth } from '../context/auth-context';
import { FEATURE_MATRIX, FEATURE_REQUIREMENTS } from '../lib/featureMatrix';
import { ROLES, SUBSCRIPTION_TIERS } from '../lib/authorizationUtils';

/**
 * Hook to check if user can access a specific feature
 * @param {string} feature - Feature name to check
 * @returns {Object} - { canAccess, reason, requiredTier, requiredType }
 */
export function useFeatureAccess(feature) {
  const { user, isProfessional, getSubscriptionTier, isBasicUser } = useAuth();

  if (!feature) {
    return { canAccess: false, reason: 'No feature specified' };
  }

  // Super admin always has access
  if (user?.role === ROLES.SUPER_ADMIN) {
    return { canAccess: true, reason: 'Admin access' };
  }

  // Get user's role, tier, and professional type
  const userRole = user?.role || ROLES.PUBLIC;
  const userTier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
  const userType = user?.professional_type || null;

  // Get feature matrix for this role
  const roleMatrix = FEATURE_MATRIX[userRole];
  if (!roleMatrix) {
    return { canAccess: false, reason: 'Invalid user role' };
  }

  // Get tier matrix
  const tierMatrix = roleMatrix[userTier];
  if (!tierMatrix) {
    return { canAccess: false, reason: 'Subscription tier not found' };
  }

  // Get type-specific matrix
  const typeMatrix = tierMatrix[userType];
  if (!typeMatrix) {
    return { canAccess: false, reason: 'Professional type not supported for this tier' };
  }

  // Check if feature exists in the matrix
  if (typeMatrix['*'] === true) {
    // Admin with wildcard access
    return { canAccess: true, reason: 'Full access' };
  }

  const hasAccess = typeMatrix[feature];

  if (hasAccess === undefined) {
    return {
      canAccess: false,
      reason: 'Feature not found in matrix',
      feature,
    };
  }

  if (hasAccess === true) {
    return { canAccess: true, reason: 'Feature available' };
  }

  // Feature is disabled - provide upgrade info
  const req = FEATURE_REQUIREMENTS[feature];
  
  return {
    canAccess: false,
    reason: 'Feature requires upgrade',
    feature,
    requiredRole: req?.minRole,
    requiredTier: req?.minTier,
    requiredType: req?.type,
    currentTier: userTier,
    currentType: userType,
  };
}

/**
 * Hook to check multiple features at once
 * @param {string[]} features - Array of feature names
 * @returns {Object} - { allAvailable, availableFeatures, missingFeatures }
 */
export function useFeaturesAccess(features) {
  const availableFeatures = [];
  const missingFeatures = [];

  features.forEach(feature => {
    const { canAccess } = useFeatureAccess(feature);
    if (canAccess) {
      availableFeatures.push(feature);
    } else {
      missingFeatures.push(feature);
    }
  });

  return {
    allAvailable: missingFeatures.length === 0,
    availableFeatures,
    missingFeatures,
  };
}

/**
 * Hook to get numeric limits for a feature
 * e.g., max_listings, max_agents, featured_listings
 * @param {string} featureName - Name of the limit feature
 * @returns {number} - Unlimited (-1) or specific number
 */
export function useFeatureLimit(featureName) {
  const { user } = useAuth();
  const userRole = user?.role || ROLES.PUBLIC;
  const userTier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
  const userType = user?.professional_type || null;

  const roleMatrix = FEATURE_MATRIX[userRole];
  if (!roleMatrix) return 0;

  const tierMatrix = roleMatrix[userTier];
  if (!tierMatrix) return 0;

  const typeMatrix = tierMatrix[userType];
  if (!typeMatrix) return 0;

  const limitValue = typeMatrix[featureName];
  return typeof limitValue === 'number' ? limitValue : 0;
}

/**
 * Hook to get all available features for user
 * @returns {Object} - All features and their availability
 */
export function useAllAvailableFeatures() {
  const { user } = useAuth();
  const userRole = user?.role || ROLES.PUBLIC;
  const userTier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
  const userType = user?.professional_type || null;

  const roleMatrix = FEATURE_MATRIX[userRole];
  if (!roleMatrix) return {};

  const tierMatrix = roleMatrix[userTier];
  if (!tierMatrix) return {};

  const typeMatrix = tierMatrix[userType];
  if (!typeMatrix) return {};

  // Filter to only true features
  return Object.entries(typeMatrix)
    .filter(([key, value]) => value === true && key !== '*')
    .reduce((acc, [key]) => {
      acc[key] = true;
      return acc;
    }, {});
}

/**
 * Hook to check if user can upgrade to a feature
 * @param {string} feature - Feature name
 * @returns {Object} - { canUpgrade, targetTier, targetType }
 */
export function useCanUpgradeFeature(feature) {
  const { user, isProfessional } = useAuth();
  const userTier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
  const userType = user?.professional_type || null;
  const req = FEATURE_REQUIREMENTS[feature];

  if (!req) {
    return { canUpgrade: false, reason: 'Feature not found' };
  }

  // Check if current tier matches required tier
  const tierMatch = userTier === req.minTier || req.minTier === undefined;
  const typeMatch = userType === req.type || req.type === undefined;

  if (!tierMatch) {
    return {
      canUpgrade: true,
      reason: 'Upgrade subscription tier',
      currentTier: userTier,
      targetTier: req.minTier,
      upgradeType: 'subscription',
    };
  }

  if (!typeMatch) {
    return {
      canUpgrade: true,
      reason: 'Switch to different professional type',
      currentType: userType,
      targetType: req.type,
      upgradeType: 'role',
    };
  }

  return { canUpgrade: false, reason: 'Already have access to this feature' };
}

export default {
  useFeatureAccess,
  useFeaturesAccess,
  useFeatureLimit,
  useAllAvailableFeatures,
  useCanUpgradeFeature,
};
