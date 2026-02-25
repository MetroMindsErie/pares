/**
 * Protected Route Components
 * Higher-Order Components (HOCs) and wrapper components for route protection
 * based on authentication, roles, and permissions.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth-context';
import {
  isAuthenticated,
  hasRole,
  hasPermission,
  hasMinRole,
  isProfessional,
  isSuperAdmin,
  ROLES,
  PERMISSIONS,
} from '../lib/authorizationUtils';

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

/**
 * Unauthorized Page Component
 */
function UnauthorizedMessage({ requiredRole, requiredPermission }) {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          You don&apos;t have permission to access this page.
          {requiredRole && ` This page requires ${requiredRole} access.`}
          {requiredPermission && ` This action requires the "${requiredPermission}" permission.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Upgrade Required Component
 */
function UpgradeRequired({ feature }) {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="w-8 h-8 text-yellow-600"
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
        <p className="text-gray-600 mb-6">
          {feature
            ? `Access to ${feature} requires a professional subscription.`
            : 'This feature requires a professional subscription.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * HOC: Protect routes that require authentication
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Options
 * @param {string} options.redirectTo - Redirect path if not authenticated
 * @param {string} options.loadingMessage - Loading message to display
 */
export function withAuthProtection(Component, options = {}) {
  const { redirectTo = '/login', loadingMessage = 'Checking authentication...' } = options;

  return function ProtectedComponent(props) {
    const { user, loading, authChecked } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
      if (authChecked && !loading && !isAuthenticated(user) && !isRedirecting) {
        setIsRedirecting(true);
        // Store the current path to redirect back after login
        const returnUrl = encodeURIComponent(router.asPath);
        router.replace(`${redirectTo}?returnUrl=${returnUrl}`);
      }
    }, [authChecked, loading, user, router, isRedirecting]);

    if (loading || !authChecked) {
      return <LoadingSpinner message={loadingMessage} />;
    }

    if (!isAuthenticated(user)) {
      return <LoadingSpinner message="Redirecting to login..." />;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC: Protect routes that require specific role
 * @param {React.Component} Component - Component to wrap
 * @param {string} requiredRole - Required role
 * @param {Object} options - Options
 */
export function withRoleProtection(Component, requiredRole, options = {}) {
  const { redirectTo = null, showUnauthorized = true } = options;

  return function ProtectedComponent(props) {
    const { user, loading, authChecked } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
      if (authChecked && !loading) {
        // First check if authenticated
        if (!isAuthenticated(user) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace('/login');
          return;
        }

        // Then check role
        if (redirectTo && !hasRole(user, requiredRole) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace(redirectTo);
        }
      }
    }, [authChecked, loading, user, router, isRedirecting]);

    if (loading || !authChecked) {
      return <LoadingSpinner message="Verifying access..." />;
    }

    if (!isAuthenticated(user)) {
      return <LoadingSpinner message="Redirecting to login..." />;
    }

    if (!hasRole(user, requiredRole)) {
      return showUnauthorized ? (
        <UnauthorizedMessage requiredRole={requiredRole} />
      ) : null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC: Protect routes that require minimum role level
 * @param {React.Component} Component - Component to wrap
 * @param {string} minRole - Minimum required role
 * @param {Object} options - Options
 */
export function withMinRoleProtection(Component, minRole, options = {}) {
  const { redirectTo = null, showUnauthorized = true } = options;

  return function ProtectedComponent(props) {
    const { user, loading, authChecked } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
      if (authChecked && !loading) {
        if (!isAuthenticated(user) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace('/login');
          return;
        }

        if (redirectTo && !hasMinRole(user, minRole) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace(redirectTo);
        }
      }
    }, [authChecked, loading, user, router, isRedirecting]);

    if (loading || !authChecked) {
      return <LoadingSpinner message="Verifying access..." />;
    }

    if (!isAuthenticated(user)) {
      return <LoadingSpinner message="Redirecting to login..." />;
    }

    if (!hasMinRole(user, minRole)) {
      return showUnauthorized ? (
        <UnauthorizedMessage requiredRole={minRole} />
      ) : null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC: Protect routes that require specific permission
 * @param {React.Component} Component - Component to wrap
 * @param {string} requiredPermission - Required permission
 * @param {Object} options - Options
 */
export function withPermissionProtection(Component, requiredPermission, options = {}) {
  const { redirectTo = null, showUnauthorized = true } = options;

  return function ProtectedComponent(props) {
    const { user, loading, authChecked } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
      if (authChecked && !loading) {
        if (!isAuthenticated(user) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace('/login');
          return;
        }

        if (redirectTo && !hasPermission(user, requiredPermission) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace(redirectTo);
        }
      }
    }, [authChecked, loading, user, router, isRedirecting]);

    if (loading || !authChecked) {
      return <LoadingSpinner message="Verifying permissions..." />;
    }

    if (!isAuthenticated(user)) {
      return <LoadingSpinner message="Redirecting to login..." />;
    }

    if (!hasPermission(user, requiredPermission)) {
      return showUnauthorized ? (
        <UnauthorizedMessage requiredPermission={requiredPermission} />
      ) : null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC: Protect routes that require professional subscription
 * @param {React.Component} Component - Component to wrap  
 * @param {Object} options - Options
 */
export function withProfessionalProtection(Component, options = {}) {
  const { feature = null, showUpgrade = true } = options;

  return function ProtectedComponent(props) {
    const { user, loading, authChecked } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
      if (authChecked && !loading && !isAuthenticated(user) && !isRedirecting) {
        setIsRedirecting(true);
        router.replace('/login');
      }
    }, [authChecked, loading, user, router, isRedirecting]);

    if (loading || !authChecked) {
      return <LoadingSpinner message="Verifying subscription..." />;
    }

    if (!isAuthenticated(user)) {
      return <LoadingSpinner message="Redirecting to login..." />;
    }

    if (!isProfessional(user)) {
      return showUpgrade ? <UpgradeRequired feature={feature} /> : null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC: Protect admin routes
 * @param {React.Component} Component - Component to wrap
 */
export function withAdminProtection(Component) {
  return function ProtectedComponent(props) {
    const { user, loading, authChecked } = useAuth();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
      if (authChecked && !loading) {
        if (!isAuthenticated(user) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace('/login');
          return;
        }

        if (!isSuperAdmin(user) && !isRedirecting) {
          setIsRedirecting(true);
          router.replace('/dashboard');
        }
      }
    }, [authChecked, loading, user, router, isRedirecting]);

    if (loading || !authChecked) {
      return <LoadingSpinner message="Verifying admin access..." />;
    }

    if (!isAuthenticated(user) || !isSuperAdmin(user)) {
      return <UnauthorizedMessage requiredRole="super_admin" />;
    }

    return <Component {...props} />;
  };
}

// ============================================
// Wrapper Components (for use in JSX)
// ============================================

/**
 * Wrapper component that requires authentication
 */
export function RequireAuth({ children, fallback = null, redirectTo = '/login' }) {
  const { user, loading, authChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authChecked && !loading && !isAuthenticated(user)) {
      router.replace(redirectTo);
    }
  }, [authChecked, loading, user, router, redirectTo]);

  if (loading || !authChecked) {
    return fallback || <LoadingSpinner />;
  }

  if (!isAuthenticated(user)) {
    return fallback || null;
  }

  return children;
}

/**
 * Wrapper component that requires specific role
 */
export function RequireRole({ children, role, fallback = null }) {
  const { user, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return fallback || <LoadingSpinner />;
  }

  if (!hasRole(user, role)) {
    return fallback;
  }

  return children;
}

/**
 * Wrapper component that requires specific permission
 */
export function RequirePermission({ children, permission, fallback = null }) {
  const { user, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return fallback || null;
  }

  if (!hasPermission(user, permission)) {
    return fallback;
  }

  return children;
}

/**
 * Wrapper component that requires professional subscription
 */
export function RequireProfessional({ children, fallback = null }) {
  const { user, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return fallback || null;
  }

  if (!isProfessional(user)) {
    return fallback;
  }

  return children;
}

/**
 * Wrapper component that shows content only to admins
 */
export function RequireAdmin({ children, fallback = null }) {
  const { user, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return fallback || null;
  }

  if (!isSuperAdmin(user)) {
    return fallback;
  }

  return children;
}

/**
 * Component that shows different content based on auth state
 */
export function AuthSwitch({ authenticated, unauthenticated, loading: loadingContent }) {
  const { user, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return loadingContent || null;
  }

  return isAuthenticated(user) ? authenticated : unauthenticated;
}

/**
 * Component that shows different content based on role
 */
export function RoleSwitch({ cases, defaultCase = null }) {
  const { user, loading, authChecked } = useAuth();

  if (loading || !authChecked) {
    return null;
  }

  const userRole = user?.role || ROLES.PUBLIC;
  
  if (cases[userRole]) {
    return cases[userRole];
  }

  return defaultCase;
}

// Export constants for convenience
export { ROLES, PERMISSIONS };
