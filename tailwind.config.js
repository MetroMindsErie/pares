// tailwind.config.js
export const content = [
  './src/pages/**/*.{js,ts,jsx,tsx}', // Ensure this includes all page files
  './src/components/**/*.{js,ts,jsx,tsx}', // Ensure this includes all component files
  './src/layouts/**/*.{js,ts,jsx,tsx}', // If you have a layouts folder, include it here
  './src/styles/**/*.{js,ts,jsx,tsx}', // If you have other folders with files that use Tailwind
];
export const theme = {
  extend: {},
};
export const plugins = [];
