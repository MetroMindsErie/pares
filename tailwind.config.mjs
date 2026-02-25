/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50:  '#e6f7f5',
          100: '#b3eae3',
          200: '#80ddd1',
          300: '#4dd0bf',
          400: '#26c6b0',
          500: '#00897B', // primary teal
          600: '#00796B',
          700: '#00695C',
          800: '#004D40',
          900: '#003D33',
        },
        'brand-blue': {
          500: '#0066CC',
          600: '#0052A5',
          700: '#003D7A',
          800: '#002952',
          900: '#0A1929',
        },
        'brand-green': {
          400: '#66BB6A',
          500: '#43A047',
          600: '#2E7D32',
          700: '#1B5E20',
        },
      },
    },
  },
  plugins: [],
};
