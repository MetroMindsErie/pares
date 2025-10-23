import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // You can add more sophisticated error logging here
    if (typeof window !== 'undefined' && window.location) {


    }
  }

  handleRefresh = () => {
    // Clear application cache/storage that might be causing issues
    try {
      if (window.sessionStorage) {

        window.sessionStorage.clear();
      }
      if (window.localStorage) {

        // Only clear auth-related items, not all localStorage
        const authKeys = ['supabase.auth.token', 'supabase.auth.refreshToken'];
        authKeys.forEach(key => window.localStorage.removeItem(key));
      }
    } catch (err) {
      console.warn('Failed to clear storage:', err);
    }
    
    // Refresh the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="error-container" style={{
          padding: '20px',
          margin: '0 auto',
          maxWidth: '600px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1>Something went wrong</h1>
          <p>We're sorry, but there was a problem loading this page.</p>
          <button 
            onClick={this.handleRefresh}
            style={{
              padding: '10px 16px',
              fontSize: '16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Refresh the page
          </button>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV !== 'production' && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary>Error Details</summary>
              <p>{this.state.error && this.state.error.toString()}</p>
              <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
