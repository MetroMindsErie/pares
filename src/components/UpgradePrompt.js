/**
 * UpgradePrompt Component
 * Shows when user doesn't have access to a feature
 * Prompts them to upgrade subscription or change role
 */

import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import { SUBSCRIPTION_TIERS, PROFESSIONAL_TYPES } from '../lib/authorizationUtils';

/**
 * UpgradePrompt - Displays an upgrade prompt for unavailable features
 */
export default function UpgradePrompt({
  feature,
  reason,
  requiredTier,
  requiredType,
  title = 'Feature Unavailable',
  message,
  ctaText = 'View Plans',
  layout = 'card', // 'card', 'banner', 'modal'
}) {
  const router = useRouter();
  const { user, isProfessional, getSubscriptionTier } = useAuth();
  const currentTier = user?.subscription_tier || SUBSCRIPTION_TIERS.FREE;

  // Generate default message if not provided
  const defaultMessage = getDefaultMessage({
    reason,
    requiredTier,
    requiredType,
    currentTier,
    feature,
  });

  const displayMessage = message || defaultMessage;

  // Helper to get tier display name
  const getTierDisplayName = (tier) => {
    const names = {
      [SUBSCRIPTION_TIERS.FREE]: 'Free',
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: 'Professional',
      [SUBSCRIPTION_TIERS.PREMIUM]: 'Premium',
    };
    return names[tier] || tier;
  };

  if (layout === 'banner') {
    return <BannerPrompt {...{ title, displayMessage, ctaText, router }} />;
  }

  if (layout === 'modal') {
    return <ModalPrompt {...{ title, displayMessage, ctaText, router }} />;
  }

  // Default card layout
  return <CardPrompt {...{ title, displayMessage, ctaText, router, requiredTier }} />;
}

/**
 * CardPrompt - Card-style upgrade prompt
 */
function CardPrompt({ title, displayMessage, ctaText, router, requiredTier }) {
  return (
    <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-lg border border-teal-200 p-8 text-center max-w-md mx-auto">
      <div className="mb-4">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-teal-100">
          <svg
            className="h-6 w-6 text-teal-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-6">{displayMessage}</p>

      {requiredTier === SUBSCRIPTION_TIERS.PROFESSIONAL && (
        <div className="bg-white rounded p-3 mb-6 text-left text-xs">
          <div className="font-semibold text-gray-900 mb-2">Professional Plan includes:</div>
          <ul className="space-y-1 text-gray-600">
            <li>✓ List up to 5 properties</li>
            <li>✓ View analytics</li>
            <li>✓ Professional dashboard</li>
          </ul>
        </div>
      )}

      {requiredTier === SUBSCRIPTION_TIERS.PREMIUM && (
        <div className="bg-white rounded p-3 mb-6 text-left text-xs">
          <div className="font-semibold text-gray-900 mb-2">Premium Plan includes:</div>
          <ul className="space-y-1 text-gray-600">
            <li>✓ Unlimited property listings</li>
            <li>✓ Advanced analytics</li>
            <li>✓ API access & white-label</li>
            <li>✓ Priority support</li>
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
        <button
          onClick={() => router.push('/pricing')}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}

/**
 * BannerPrompt - Banner-style upgrade prompt
 */
function BannerPrompt({ title, displayMessage, ctaText, router }) {
  return (
    <div className="bg-teal-600 text-white px-6 py-4 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-4">
        <svg
          className="h-5 w-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-teal-100 text-sm">{displayMessage}</p>
        </div>
      </div>
      <button
        onClick={() => router.push('/pricing')}
        className="ml-4 px-4 py-2 bg-white text-teal-600 font-medium rounded hover:bg-teal-50 transition-colors whitespace-nowrap"
      >
        {ctaText}
      </button>
    </div>
  );
}

/**
 * ModalPrompt - Modal-style upgrade prompt
 */
function ModalPrompt({ title, displayMessage, ctaText, router }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-teal-100 mb-4">
            <svg
              className="h-6 w-6 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{displayMessage}</p>

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
            >
              {ctaText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate a contextual message based on why the feature is unavailable
 */
function getDefaultMessage({ reason, requiredTier, requiredType, currentTier, feature }) {
  if (reason === 'Feature requires upgrade') {
    if (requiredTier === SUBSCRIPTION_TIERS.PROFESSIONAL) {
      return `Upgrade to Professional plan to unlock this feature and more.`;
    }
    if (requiredTier === SUBSCRIPTION_TIERS.PREMIUM) {
      return `This is a Premium feature. Upgrade to access advanced capabilities.`;
    }
  }

  if (requiredType) {
    return `This feature is available for ${requiredType}s. Switch your professional type or upgrade your plan.`;
  }

  return 'This feature is not available for your current plan. Upgrade to access more features.';
}

/**
 * PricingComparison - Shows a quick pricing comparison
 */
export function PricingComparison() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      features: [
        'Browse listings',
        'Save properties',
        'View public profiles',
      ],
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/month',
      features: [
        'All Free features',
        'List up to 5 properties',
        'View analytics',
        'Professional dashboard',
      ],
      highlighted: true,
    },
    {
      name: 'Premium',
      price: '$99',
      period: '/month',
      features: [
        'All Professional features',
        'Unlimited listings',
        'Advanced analytics',
        'API access & white-label',
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {tiers.map(tier => (
        <div
          key={tier.name}
          className={`rounded-lg border p-6 ${
            tier.highlighted
              ? 'bg-teal-50 border-blue-300 shadow-lg'
              : 'bg-white border-gray-200'
          }`}
        >
          <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
            {tier.period && <span className="text-gray-600">{tier.period}</span>}
          </div>

          <ul className="mt-6 space-y-3">
            {tier.features.map(feature => (
              <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <button
            className={`w-full mt-6 px-4 py-2 rounded font-medium transition-colors ${
              tier.highlighted
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Choose {tier.name}
          </button>
        </div>
      ))}
    </div>
  );
}
