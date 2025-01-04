// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}', // Ensure this includes all page files
    './src/components/**/*.{js,ts,jsx,tsx}', // Ensure this includes all component files
    './src/layouts/**/*.{js,ts,jsx,tsx}', // If you have a layouts folder, include it here
    './src/styles/**/*.{js,ts,jsx,tsx}', // If you have other folders with files that use Tailwind
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
