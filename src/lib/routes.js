/**
 * Central route configuration for the application
 * Drives navigation menus, breadcrumbs, and sitemap
 */

export const routes = [
  {
    path: '/',
    name: 'Home',
    description: 'Find your dream home in Pennsylvania',
    icon: 'home',
    prefetch: true,
    auth: false,
  },
  {
    path: '/search',
    name: 'Search',
    description: 'Search properties across Pennsylvania',
    icon: 'search',
    prefetch: true,
    auth: false,
  },
  {
    path: '/property',
    name: 'Properties',
    description: 'View property details',
    icon: 'building',
    prefetch: false,
    auth: false,
    dynamic: true, // Indicates a dynamic route
  },
  {
    path: '/about',
    name: 'About',
    description: 'Learn more about PA Real Estate Solutions',
    icon: 'info',
    prefetch: false,
    auth: false,
  },
  {
    path: '/contact',
    name: 'Contact',
    description: 'Get in touch with our agents',
    icon: 'mail',
    prefetch: false,
    auth: false,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    description: 'Manage your account and preferences',
    icon: 'user',
    prefetch: true,
    auth: true,
  },
  {
    path: '/favorites',
    name: 'Favorites',
    description: 'View your saved properties',
    icon: 'heart',
    prefetch: true,
    auth: true,
  },
  {
    path: '/auth/login',
    name: 'Login',
    description: 'Sign in to your account',
    icon: 'login',
    prefetch: false,
    auth: false,
    showInNav: false,
  },
  {
    path: '/auth/register',
    name: 'Register',
    description: 'Create a new account',
    icon: 'user-plus',
    prefetch: false,
    auth: false,
    showInNav: false,
  },
];

// Utility functions to work with routes
export const getPublicRoutes = () => routes.filter(route => !route.auth && route.showInNav !== false);
export const getAuthRoutes = () => routes.filter(route => route.auth);
export const getNavRoutes = () => routes.filter(route => route.showInNav !== false);
export const getRoute = (path) => routes.find(route => route.path === path);

/**
 * Generate breadcrumbs from current path
 * @param {string} currentPath - Current URL path
 * @returns {Array} - Array of breadcrumb objects
 */
export const generateBreadcrumbs = (currentPath) => {
  // Start with Home
  const breadcrumbs = [{ name: 'Home', path: '/' }];
  
  if (currentPath === '/') return breadcrumbs;
  
  // Split the path
  const pathSegments = currentPath.split('/').filter(segment => segment);
  let currentSegmentPath = '';
  
  // Build breadcrumbs
  pathSegments.forEach((segment, index) => {
    currentSegmentPath += `/${segment}`;
    
    // Check if this is a dynamic route parameter
    const lastSegment = index === pathSegments.length - 1;
    const parentPath = currentSegmentPath.split('/').slice(0, -1).join('/') || '/';
    const parentRoute = routes.find(route => route.path === parentPath);
    
    if (parentRoute?.dynamic && !isNaN(segment)) {
      // This is likely a dynamic ID parameter
      breadcrumbs.push({
        name: `${parentRoute.name} Details`,
        path: currentSegmentPath,
      });
    } else {
      // Find matching route
      const route = routes.find(r => r.path === currentSegmentPath);
      
      if (route) {
        breadcrumbs.push({
          name: route.name,
          path: route.path,
        });
      } else if (lastSegment) {
        // Handle unknown routes in a user-friendly way
        breadcrumbs.push({
          name: segment.charAt(0).toUpperCase() + segment.slice(1),
          path: currentSegmentPath,
        });
      }
    }
  });
  
  return breadcrumbs;
};