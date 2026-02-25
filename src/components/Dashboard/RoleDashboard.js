/**
 * Role-Based Dashboard Sections
 * Shows different dashboard content based on user's role, subscription tier, and professional type
 */

import React from 'react';
import { useAuth } from '../../context/auth-context';
import { useFeatureAccess, useFeatureLimit, useAllAvailableFeatures } from '../../hooks/useFeatureAccess';
import FeatureGate, { OptionalFeature, FeatureBadge, DisabledFeature } from '../FeatureGate';
import UpgradePrompt from '../UpgradePrompt';
import { ROLES, SUBSCRIPTION_TIERS, PROFESSIONAL_TYPES } from '../../lib/authorizationUtils';

// ─── Subscription Badge ──────────────────────────────────────────────────────
export function SubscriptionBadge() {
  const { user } = useAuth();
  const tier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
  const role = user?.role || ROLES.BASIC_USER;
  const professionalType = user?.professional_type;

  const tierColors = {
    [SUBSCRIPTION_TIERS.FREE]: 'bg-gray-100 text-gray-700',
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: 'bg-teal-100 text-teal-800',
    [SUBSCRIPTION_TIERS.PREMIUM]: 'bg-purple-100 text-purple-800',
  };

  const tierLabels = {
    [SUBSCRIPTION_TIERS.FREE]: 'Free Plan',
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: 'Professional',
    [SUBSCRIPTION_TIERS.PREMIUM]: 'Premium',
  };

  const typeLabels = {
    [PROFESSIONAL_TYPES.AGENT]: 'Agent',
    [PROFESSIONAL_TYPES.BROKER]: 'Broker',
    [PROFESSIONAL_TYPES.INVESTOR]: 'Investor',
    [PROFESSIONAL_TYPES.REALTOR_PARTNER]: 'Partner',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tierColors[tier] || tierColors[SUBSCRIPTION_TIERS.FREE]}`}>
        {tierLabels[tier] || 'Free Plan'}
      </span>
      {professionalType && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {typeLabels[professionalType] || professionalType}
        </span>
      )}
    </div>
  );
}

// ─── Quick Actions (Role-Aware) ──────────────────────────────────────────────
export function QuickActions({ router }) {
  const { user, isProfessional } = useAuth();
  const { canAccess: canList } = useFeatureAccess('list:properties');
  const { canAccess: canManageAgents } = useFeatureAccess('manage:agents');
  const { canAccess: canViewAnalytics } = useFeatureAccess('view:analytics');
  const { canAccess: canManagePortfolio } = useFeatureAccess('portfolio:management');

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {/* Always available */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('searchResults');
              sessionStorage.removeItem('searchParams');
              sessionStorage.setItem('scrollToTop', 'true');
            }
            window.location.href = '/';
          }}
          className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
        >
          Browse Properties
        </button>
        <button
          onClick={() => router.push('/saved-properties')}
          className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          View Saved Properties
        </button>

        {/* Professional: List Properties */}
        {canList && (
          <button
            onClick={() => router.push('/dashboard/list-property')}
            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            List a Property
          </button>
        )}

        {/* Broker: Manage Agents */}
        {canManageAgents && (
          <button
            onClick={() => router.push('/dashboard/agents')}
            className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
          >
            Manage Agents
          </button>
        )}

        {/* Professional: Analytics */}
        {canViewAnalytics && (
          <button
            onClick={() => router.push('/dashboard/analytics')}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            View Analytics
          </button>
        )}

        {/* Investor: Portfolio */}
        {canManagePortfolio && (
          <button
            onClick={() => router.push('/dashboard/portfolio')}
            className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            My Portfolio
          </button>
        )}

        {/* Always available */}
        <button
          onClick={() => router.push('/profile/settings')}
          className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          Profile Settings
        </button>

        {/* Pricing / Upgrade */}
        {user?.subscription_tier !== SUBSCRIPTION_TIERS.PREMIUM && (
          <button
            onClick={() => router.push('/pricing')}
            className="w-full px-4 py-2.5 border-2 border-teal-500 text-teal-600 rounded-lg hover:bg-teal-50 transition-colors text-sm font-medium"
          >
            Upgrade Plan
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Agent Dashboard Section ─────────────────────────────────────────────────
export function AgentDashboardSection() {
  const maxListings = useFeatureLimit('max_listings');
  const maxFeatured = useFeatureLimit('featured:listings');

  return (
    <FeatureGate feature="list:properties" showPrompt={false}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Agent Dashboard
          </h3>
          <span className="text-xs text-gray-500">
            Listings: {maxListings === -1 ? 'Unlimited' : `0 / ${maxListings}`}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Active Listings</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Views</p>
          </div>
        </div>

        <OptionalFeature feature="view:analytics">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Analytics Overview
              <FeatureBadge feature="advanced:analytics" text="Premium" />
            </h4>
            <div className="text-sm text-gray-500">
              No analytics data yet. List a property to start tracking performance.
            </div>
          </div>
        </OptionalFeature>
      </div>
    </FeatureGate>
  );
}

// ─── Broker Dashboard Section ────────────────────────────────────────────────
export function BrokerDashboardSection() {
  const maxAgents = useFeatureLimit('max_agents');

  return (
    <FeatureGate feature="manage:agents" showPrompt={false}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Broker Dashboard
          </h3>
          <span className="text-xs text-gray-500">
            Agents: {maxAgents === -1 ? 'Unlimited' : `0 / ${maxAgents}`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Agents</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Listings</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Inquiries</p>
          </div>
        </div>

        <OptionalFeature feature="company:branding">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Branding
            </h4>
            <p className="text-sm text-gray-500">
              Customize your company profile, logo, and branding.
            </p>
            <button className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium">
              Manage Branding →
            </button>
          </div>
        </OptionalFeature>

        <OptionalFeature feature="export:contacts">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Management
            </h4>
            <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              Export Contacts →
            </button>
          </div>
        </OptionalFeature>
      </div>
    </FeatureGate>
  );
}

// ─── Investor Dashboard Section ──────────────────────────────────────────────
export function InvestorDashboardSection() {
  return (
    <FeatureGate feature="portfolio:management" showPrompt={false}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Investment Portfolio
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">$0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Portfolio Value</p>
          </div>
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Properties</p>
          </div>
        </div>

        <OptionalFeature feature="fractional:investing">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fractional Investing
            </h4>
            <p className="text-sm text-gray-500">
              Invest in fractional property shares using stablecoins.
            </p>
          </div>
        </OptionalFeature>

        <OptionalFeature feature="advanced:analytics">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Performance Analytics
              <FeatureBadge feature="performance:reports" text="Premium" />
            </h4>
            <p className="text-sm text-gray-500">ROI tracking and performance reports.</p>
          </div>
        </OptionalFeature>
      </div>
    </FeatureGate>
  );
}

// ─── Locked Features Panel (replaces 3 separate UpgradePrompt fallbacks) ─────
export function LockedFeaturesPanel() {
  const { user } = useAuth();
  const tier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;
  const professionalType = user?.professional_type;
  const { canAccess: canList } = useFeatureAccess('list:properties');
  const { canAccess: canManageAgents } = useFeatureAccess('manage:agents');
  const { canAccess: canManagePortfolio } = useFeatureAccess('portfolio:management');
  const { canAccess: canViewAnalytics } = useFeatureAccess('view:analytics');
  const { canAccess: canAdvancedAnalytics } = useFeatureAccess('advanced:analytics');
  const { canAccess: canApiAccess } = useFeatureAccess('api:access');
  const { canAccess: canWhiteLabel } = useFeatureAccess('white_label');
  const { canAccess: canCrm } = useFeatureAccess('crm:access');
  const { canAccess: canFractional } = useFeatureAccess('fractional:investing');
  const { canAccess: canExportContacts } = useFeatureAccess('export:contacts');
  const { canAccess: canCompanyBranding } = useFeatureAccess('company:branding');

  // Build feature groups with unlock status
  const featureGroups = [
    {
      title: 'Agent Features',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      ),
      items: [
        { label: 'List properties', unlocked: canList, tier: 'Professional' },
        { label: 'Manage listings', unlocked: canList, tier: 'Professional' },
        { label: 'Featured listing placement', unlocked: canList, tier: 'Professional' },
        { label: 'CRM & email campaigns', unlocked: canCrm, tier: 'Premium' },
      ],
    },
    {
      title: 'Broker Features',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      ),
      items: [
        { label: 'Manage agent team', unlocked: canManageAgents, tier: 'Professional' },
        { label: 'Company branding', unlocked: canCompanyBranding, tier: 'Professional' },
        { label: 'Export contacts', unlocked: canExportContacts, tier: 'Professional' },
        { label: 'White-label & custom domain', unlocked: canWhiteLabel, tier: 'Premium' },
      ],
    },
    {
      title: 'Investor Features',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      ),
      items: [
        { label: 'Portfolio management', unlocked: canManagePortfolio, tier: 'Professional' },
        { label: 'Fractional investing', unlocked: canFractional, tier: 'Professional' },
        { label: 'Performance reports', unlocked: canAdvancedAnalytics, tier: 'Premium' },
        { label: 'Portfolio export & API', unlocked: canApiAccess, tier: 'Premium' },
      ],
    },
    {
      title: 'Analytics & Tools',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      items: [
        { label: 'Analytics dashboard', unlocked: canViewAnalytics, tier: 'Professional' },
        { label: 'Advanced analytics', unlocked: canAdvancedAnalytics, tier: 'Premium' },
        { label: 'API access', unlocked: canApiAccess, tier: 'Premium' },
      ],
    },
  ];

  // If every single feature is unlocked, don't show this panel
  const allUnlocked = featureGroups.every(g => g.items.every(i => i.unlocked));
  if (allUnlocked) return null;

  // Free-tier included features
  const freeFeatures = [
    { label: 'Browse all property listings', icon: 'search' },
    { label: 'Save up to 10 properties', icon: 'heart' },
    { label: 'View public agent profiles', icon: 'user' },
    { label: 'Basic property search', icon: 'filter' },
    { label: 'Contact professionals', icon: 'mail' },
    { label: 'Personal dashboard', icon: 'layout' },
    { label: 'AI-assisted pricing tool', icon: 'zap' },
    { label: 'Property swiper', icon: 'swipe' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Your Plan &amp; Features
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            See what&apos;s included and what you can unlock
          </p>
        </div>
        <a
          href="/pricing"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          View Plans
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>

      {/* Free tier included features */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-green-50/50 dark:bg-green-900/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Included in Your Free Plan
            </h4>
            <p className="text-xs text-green-600 dark:text-green-400">
              {freeFeatures.length} features active
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {freeFeatures.map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-sm">
              <svg className="h-4 w-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade divider */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Unlock with a paid plan
        </p>
      </div>

      {/* Feature groups grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
        {featureGroups.map((group) => {
          const unlockedCount = group.items.filter(i => i.unlocked).length;
          return (
            <div key={group.title} className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                  <svg className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {group.icon}
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{group.title}</h4>
                  <p className="text-xs text-gray-400">
                    {unlockedCount}/{group.items.length} unlocked
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm">
                    {item.unlocked ? (
                      <svg className="h-4 w-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    <span className={item.unlocked ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
                      {item.label}
                    </span>
                    {!item.unlocked && (
                      <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded ${
                        item.tier === 'Premium'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      }`}>
                        {item.tier}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upgrade CTA Section ─────────────────────────────────────────────────────
export function UpgradeCTA() {
  const { user } = useAuth();
  const tier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;

  // Don't show to premium users or admins
  if (tier === SUBSCRIPTION_TIERS.PREMIUM || user?.role === ROLES.SUPER_ADMIN) {
    return null;
  }

  const ctaConfig = {
    [SUBSCRIPTION_TIERS.FREE]: {
      title: 'Unlock Professional Features',
      message: 'List properties, view analytics, and access AI-powered tools with a Professional plan.',
      cta: 'Start Professional Trial',
      gradient: 'from-teal-500 to-green-600',
    },
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
      title: 'Go Premium',
      message: 'Unlimited listings, advanced analytics, API access, and white-label branding.',
      cta: 'Upgrade to Premium',
      gradient: 'from-teal-600 to-teal-700',
    },
  };

  const config = ctaConfig[tier] || ctaConfig[SUBSCRIPTION_TIERS.FREE];

  return (
    <div className={`bg-gradient-to-r ${config.gradient} rounded-xl shadow-lg p-6 text-white`}>
      <h3 className="text-lg font-bold mb-2">{config.title}</h3>
      <p className="text-sm text-white/80 mb-4">{config.message}</p>
      <a
        href="/pricing"
        className="inline-block px-6 py-2.5 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
      >
        {config.cta}
      </a>
    </div>
  );
}

// ─── Feature Usage Summary ───────────────────────────────────────────────────
export function FeatureUsageSummary() {
  const { user, isProfessional } = useAuth();
  const allFeatures = useAllAvailableFeatures();
  const featureCount = Object.keys(allFeatures).length;

  if (!isProfessional()) return null;

  const maxListings = useFeatureLimit('max_listings');
  const maxAgents = useFeatureLimit('max_agents');

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Plan Usage
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Features Available</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{featureCount}</span>
        </div>
        
        {maxListings > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Listings</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                0 / {maxListings === -1 ? '∞' : maxListings}
              </span>
            </div>
            {maxListings > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            )}
          </div>
        )}

        {maxAgents > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Agents</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                0 / {maxAgents === -1 ? '∞' : maxAgents}
              </span>
            </div>
            {maxAgents > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-green-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
