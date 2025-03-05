/**
 * Application theme with modern real estate styling
 */
export const theme = {
  colors: {
    // Primary palette
    primary: {
      main: '#2D5F78', // Deep teal blue
      light: '#67a0b7',
      dark: '#1a3e53',
      contrast: '#ffffff',
    },
    // Secondary palette
    secondary: {
      main: '#4B9D64', // Forest green
      light: '#75c48d',
      dark: '#2f7542',
      contrast: '#ffffff',
    },
    // Neutral tones
    neutral: {
      white: '#ffffff',
      lightGrey: '#f7f9fa',
      grey: '#e0e5e9',
      mediumGrey: '#a1a9b3',
      darkGrey: '#4a5568',
      black: '#1a202c',
    },
    // Feedback colors
    feedback: {
      success: '#4B9D64',
      error: '#E53E3E',
      warning: '#F59E0B',
      info: '#3182CE',
    },
    social: {
      facebook: '#1877F2',
    }
  },
  typography: {
    fontFamily: {
      main: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      heading: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    }
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
    lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    elevated: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  spacing: {
    // Spacings in rem
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  transitions: {
    default: 'all 0.2s ease-in-out',
    slow: 'all 0.3s ease-in-out',
    fast: 'all 0.1s ease-in-out',
  }
};

export default theme;
