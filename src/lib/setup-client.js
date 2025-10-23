import { ensureDbSchema } from './database-schema';

/**
 * Initialize client-side environment
 * - Check database schema
 * - Set up error handlers
 */
export const initClient = async () => {
  try {
    // Check database schema
    await ensureDbSchema();
    
    // Set up global error handlers
    setupGlobalErrorHandlers();
    

    return true;
  } catch (error) {
    console.error('Error initializing client:', error);
    return false;
  }
};

/**
 * Set up global error handlers
 */
const setupGlobalErrorHandlers = () => {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Report to error tracking service if available
      if (window.errorReporter) {
        window.errorReporter.captureException(event.reason);
      }
    });
    
    // Handle global errors
    window.addEventListener('error', event => {
      console.error('Global error:', event.error);
      
      // Report to error tracking service if available
      if (window.errorReporter) {
        window.errorReporter.captureException(event.error);
      }
    });
  }
};
