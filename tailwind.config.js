// Import CampusPulse design tokens
const campuspulseTokens = require('./src/tokens/campuspulseTokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
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
      spacing: {
        'safe-top': 'max(1rem, env(safe-area-inset-top))',
        'safe-right': 'max(1rem, env(safe-area-inset-right))',
        'safe-bottom': 'max(1rem, env(safe-area-inset-bottom))',
        'safe-left': 'max(1rem, env(safe-area-inset-left))',
      },
    },
  },
  plugins: [],
};

