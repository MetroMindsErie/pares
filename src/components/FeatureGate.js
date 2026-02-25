/**
 * FeatureGate Component
 * Conditional rendering based on feature access
 * Shows upgrade prompt if feature is not available
 */

import React from 'react';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import UpgradePrompt from './UpgradePrompt';

/**
 * FeatureGate - Wraps content and shows upgrade prompt if feature isn't available
 * 
 * @param {Object} props
 * @param {string} props.feature - Feature name to check
 * @param {React.ReactNode} props.children - Content to show if feature is available
 * @param {React.ReactNode} props.fallback - Content to show if feature is not available (defaults to upgrade prompt)
 * @param {boolean} props.showPrompt - Whether to show upgrade prompt (default: true)
 * @param {function} props.onAccessDenied - Callback when access is denied
 * @returns {React.ReactNode}
 */
export default function FeatureGate({
  feature,
  children,
  fallback,
  showPrompt = true,
  onAccessDenied,
}) {
  const { canAccess, reason, requiredTier, requiredType } = useFeatureAccess(feature);

  if (canAccess) {
    return children;
  }

  // Call callback if provided
  if (onAccessDenied) {
    onAccessDenied({ reason, requiredTier, requiredType });
  }

  // Show custom fallback if provided
  if (fallback) {
    return fallback;
  }

  // Show upgrade prompt by default
  if (showPrompt) {
    return (
      <UpgradePrompt
        feature={feature}
        reason={reason}
        requiredTier={requiredTier}
        requiredType={requiredType}
      />
    );
  }

  // Neither fallback nor prompt - return null
  return null;
}

/**
 * FeatureSection - A higher-level component that wraps a section with feature restrictions
 */
export function FeatureSection({
  feature,
  title,
  children,
  className = '',
  showBadge = true,
}) {
  const { canAccess, reason, requiredTier } = useFeatureAccess(feature);

  if (!canAccess) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showBadge && requiredTier === 'professional' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
            Pro
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * OptionalFeature - Shows optional content if feature is available
 * This is simpler than FeatureGate - just shows/hides without prompts
 */
export function OptionalFeature({ feature, children, className = '' }) {
  const { canAccess } = useFeatureAccess(feature);

  if (!canAccess) {
    return null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * FeatureBadge - Shows a badge indicating a feature requires upgrade
 */
export function FeatureBadge({ feature, text = 'Pro Feature' }) {
  const { canAccess } = useFeatureAccess(feature);

  if (canAccess) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ml-2">
      {text}
    </span>
  );
}

/**
 * DisabledFeature - Shows disabled UI state for unavailable features
 */
export function DisabledFeature({ feature, children, tooltipText = 'Upgrade required' }) {
  const { canAccess, reason, requiredTier } = useFeatureAccess(feature);

  if (canAccess) {
    return children;
  }

  const tooltipMsg = tooltipText || `${reason} - upgrade to ${requiredTier}`;

  return (
    <div className="relative group">
      <div className="pointer-events-none opacity-50">
        {children}
      </div>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {tooltipMsg}
      </div>
    </div>
  );
}

/**
 * FeatureList - Shows list of features with availability indicators
 */
export function FeatureList({ features, showUnavailable = false }) {
  const { useFeatureAccess } = require('../hooks/useFeatureAccess');

  return (
    <ul className="space-y-2">
      {features.map(feature => {
        const { canAccess } = useFeatureAccess(feature);
        
        // Skip unavailable features unless explicitly showing them
        if (!canAccess && !showUnavailable) {
          return null;
        }

        return (
          <li key={feature} className={`flex items-center ${canAccess ? '' : 'opacity-50'}`}>
            <svg
              className={`h-5 w-5 mr-2 ${canAccess ? 'text-green-500' : 'text-gray-300'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className={canAccess ? 'text-gray-900' : 'text-gray-500'}>
              {feature.replace(/:/g, ' · ').replace(/_/g, ' ')}
            </span>
            {!canAccess && (
              <span className="ml-auto text-xs text-amber-600 font-medium">Upgrade</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
