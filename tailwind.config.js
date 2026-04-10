// Import CampusPulse design tokens
const campuspulseTokens = require('./src/tokens/campuspulseTokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: campuspulseTokens.colors,
      boxShadow: campuspulseTokens.shadows,
      borderRadius: campuspulseTokens.borderRadius,
      zIndex: campuspulseTokens.zIndex,
      fontFamily: {
        'headline': ['Lexend', 'system-ui', 'sans-serif'],
        'body': ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
        'label': ['Space Grotesk', 'monospace'],
      },
      backgroundImage: {
        'glass': 'radial-gradient(circle at 50% 50%, rgba(252, 223, 70, 0.15) 0%, rgba(246, 246, 246, 1) 100%)',
      },
    },
  },
  plugins: [],
};
