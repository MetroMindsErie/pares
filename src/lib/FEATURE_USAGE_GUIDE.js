/**
 * Feature Access Control Usage Guide
 * 
 * This file shows examples of how to use the feature matrix and access control system
 * throughout your application.
 */

// ==============================================
// 1. BASIC FEATURE CHECK
// ==============================================

// In a component:
import { useFeatureAccess } from '../hooks/useFeatureAccess';

function PropertyListingForm() {
  const { canAccess, reason, requiredTier } = useFeatureAccess('list:properties');

  if (!canAccess) {
    return <div>You need to upgrade to {requiredTier} to list properties</div>;
  }

  return <form>{/* listing form */}</form>;
}

// ==============================================
// 2. USING FEATURE GATE COMPONENT
// ==============================================

import FeatureGate from '../components/FeatureGate';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show analytics only to professional users */}
      <FeatureGate feature="view:analytics">
        <AnalyticsSection />
      </FeatureGate>

      {/* Show agent features with upgrade prompt */}
      <FeatureGate 
        feature="manage:agents"
        showPrompt={true}
      >
        <AgentManagementPanel />
      </FeatureGate>

      {/* Custom fallback instead of upgrade prompt */}
      <FeatureGate
        feature="api:access"
        fallback={<div>API access is a Premium feature</div>}
      >
        <APIKeysSection />
      </FeatureGate>
    </div>
  );
}

// ==============================================
// 3. CHECKING NUMERIC LIMITS
// ==============================================

import { useFeatureLimit } from '../hooks/useFeatureAccess';

function PropertyListings() {
  const maxListings = useFeatureLimit('max_listings');
  const currentListings = 3;

  return (
    <div>
      <p>
        Properties listed: {currentListings} / {maxListings === -1 ? 'Unlimited' : maxListings}
      </p>

      {currentListings >= maxListings && maxListings > 0 && (
        <UpgradePrompt 
          title="Listing Limit Reached"
          message="Upgrade to list more properties"
        />
      )}

      {maxListings === -1 && <p>Unlimited listings (Premium Plan)</p>}
    </div>
  );
}

// ==============================================
// 4. PROTECTING ROUTES
// ==============================================

import { withProfessionalProtection } from '../components/ProtectedRoute';

function ListPropertiesPage() {
  return <div>{/* Page content */}</div>;
}

export default withProfessionalProtection(ListPropertiesPage, {
  feature: 'list:properties',
  showUpgrade: true,
});

// ==============================================
// 5. OPTIONAL FEATURES (Show/Hide without prompt)
// ==============================================

import { OptionalFeature, FeatureBadge } from '../components/FeatureGate';

function ProfileCard() {
  return (
    <div>
      <h3>
        Profile
        <FeatureBadge feature="advanced:analytics" text="Pro" />
      </h3>

      <OptionalFeature feature="company:branding">
        <div>
          <label>Company Logo</label>
          {/* file upload */}
        </div>
      </OptionalFeature>
    </div>
  );
}

// ==============================================
// 6. FEATURE LIST WITH INDICATORS
// ==============================================

import { FeatureList } from '../components/FeatureGate';

function ComparisonPage() {
  const agentFeatures = [
    'list:properties',
    'manage:listings',
    'view:analytics',
    'advanced:analytics',
    'api:access',
  ];

  return (
    <div>
      <h2>Agent Features</h2>
      <FeatureList features={agentFeatures} showUnavailable={true} />
    </div>
  );
}

// ==============================================
// 7. CHECKING MULTIPLE FEATURES
// ==============================================

import { useFeaturesAccess } from '../hooks/useFeatureAccess';

function BrokerDashboard() {
  const brokerFeatures = ['manage:agents', 'company:branding', 'export:contacts'];
  const { allAvailable, availableFeatures, missingFeatures } = useFeaturesAccess(brokerFeatures);

  if (!allAvailable) {
    return (
      <UpgradePrompt
        title="Incomplete Broker Setup"
        message={`You're missing ${missingFeatures.length} features. Upgrade your plan.`}
      />
    );
  }

  return <div>{/* Full dashboard */}</div>;
}

// ==============================================
// 8. CAN UPGRADE CHECK
// ==============================================

import { useCanUpgradeFeature } from '../hooks/useFeatureAccess';

function FeatureUpgradeButton({ feature }) {
  const { canUpgrade, targetTier, upgradeType } = useCanUpgradeFeature(feature);

  if (!canUpgrade) {
    return <p>You already have access to this feature</p>;
  }

  return (
    <button onClick={() => window.location.href = '/pricing'}>
      Upgrade to {targetTier} to unlock
    </button>
  );
}

// ==============================================
// 9. ROLE & SUBSCRIPTION CHECKS IN AUTH
// ==============================================

import { useAuth } from '../context/auth-context';

function SettingsPage() {
  const auth = useAuth();
  const { canAccess: canManageAgents } = useFeatureAccess('manage:agents');
  const { canAccess: canCustomizeBranding } = useFeatureAccess('company:branding');

  return (
    <div>
      {/* Show different settings based on role */}
      {auth.isProfessional() && (
        <div>
          <h3>Professional Settings</h3>
          
          {canManageAgents && (
            <div>Broker agent management settings</div>
          )}

          {canCustomizeBranding && (
            <div>Company branding settings</div>
          )}
        </div>
      )}

      {auth.isBasicUser() && (
        <UpgradePrompt title="Upgrade to Professional" />
      )}
    </div>
  );
}

// ==============================================
// 10. DATABASE SEEDERS FOR TESTING
// ==============================================

/*
  To test features with different roles, seed test users in Supabase:

  Basic User:
  - role: 'basic_user'
  - subscription_tier: 'free'
  - professional_type: null

  Agent (Professional):
  - role: 'professional_user'
  - subscription_tier: 'professional'
  - professional_type: 'agent'

  Broker (Professional):
  - role: 'professional_user'
  - subscription_tier: 'professional'
  - professional_type: 'broker'

  Agent (Premium):
  - role: 'professional_user'
  - subscription_tier: 'premium'
  - professional_type: 'agent'

  Admin:
  - role: 'super_admin'
  - subscription_tier: 'free'
  - professional_type: null
*/

// ==============================================
// 11. ADDING NEW FEATURES
// ==============================================

/*
  To add a new feature to the system:

  1. Add to featureMatrix.js in the appropriate role/tier/type combinations
  2. Add to FEATURE_CATEGORIES if it's a new category
  3. Add to FEATURE_REQUIREMENTS with tier/type requirements
  4. Use useFeatureAccess('your:new:feature') in components
  5. Wrap with FeatureGate or OptionalFeature components

  Example: Adding 'export:listings' feature

  FEATURE_MATRIX:
    [ROLES.PROFESSIONAL_USER][SUBSCRIPTION_TIERS.PREMIUM][PROFESSIONAL_TYPES.AGENT]: {
      'export:listings': true,
    }

  FEATURE_REQUIREMENTS:
    'export:listings': { minRole: ROLES.PROFESSIONAL_USER, minTier: SUBSCRIPTION_TIERS.PREMIUM }
*/

// ==============================================
// 12. FEATURE ACCESS DENIED CALLBACK
// ==============================================

function ListingsPage() {
  const handleAccessDenied = ({ reason, requiredTier }) => {
    // Track analytics event
    console.log(`Feature access denied: ${reason}, required tier: ${requiredTier}`);
    // Send to analytics
  };

  return (
    <FeatureGate
      feature="export:contacts"
      onAccessDenied={handleAccessDenied}
    >
      <ExportSection />
    </FeatureGate>
  );
}

export default {};
