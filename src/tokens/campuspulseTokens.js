// CampusPulse Design System - Neo-brutalism Theme
const campuspulseTokens = {
  // Primary Colors - Golden/Brown theme
  colors: {
    primary: '#6a5b00',
    'primary-dim': '#5c4f00',
    'primary-container': '#fcdf46',
    'on-primary': '#fff3c5',
    'on-primary-container': '#5d5000',
    'on-primary-fixed': '#483d00',
    'on-primary-fixed-variant': '#685900',
    'primary-fixed': '#fcdf46',
    'primary-fixed-dim': '#edd139',

    // Secondary Colors - Blue
    secondary: '#0057bd',
    'secondary-dim': '#004ca6',
    'secondary-container': '#bfd1ff',
    'on-secondary': '#f0f2ff',
    'on-secondary-container': '#004496',
    'on-secondary-fixed': '#003271',
    'on-secondary-fixed-variant': '#004da8',
    'secondary-fixed': '#bfd1ff',
    'secondary-fixed-dim': '#a9c4ff',

    // Tertiary Colors - Purple
    tertiary: '#a400a4',
    'tertiary-dim': '#900090',
    'tertiary-container': '#ff81f5',
    'on-tertiary': '#ffeef8',
    'on-tertiary-container': '#5b005b',
    'on-tertiary-fixed': '#320032',
    'on-tertiary-fixed-variant': '#6a006a',
    'tertiary-fixed': '#ff81f5',
    'tertiary-fixed-dim': '#ff61f8',

    // Error - Red/Orange
    error: '#b02500',
    'error-dim': '#b92902',
    'error-container': '#f95630',
    'on-error': '#ffefec',
    'on-error-container': '#520c00',

    // Neutral - Grayscale
    background: '#f6f6f6',
    surface: '#f6f6f6',
    'surface-bright': '#f6f6f6',
    'surface-dim': '#d4d4d4',
    'surface-container-lowest': '#ffffff',
    'surface-container-low': '#f1f1f1',
    'surface-container': '#e8e8e8',
    'surface-container-high': '#e2e2e2',
    'surface-container-highest': '#dddddd',
    'on-surface': '#2f2f2f',
    'on-surface-variant': '#5b5b5b',

    // Inverse
    'inverse-surface': '#0e0e0e',
    'inverse-on-surface': '#9d9d9d',
    'inverse-primary': '#fcdf46',

    // Outlines
    outline: '#777777',
    'outline-variant': '#adadad',

    // Semantic
    'surface-tint': '#6a5b00',

    // Aliases for easier use
    yellow: '#fcdf46',
    blue: '#0057bd',
    purple: '#a400a4',
    black: '#000000',
    white: '#ffffff',
  },

  // Typography
  typography: {
    headline: 'Lexend',
    body: 'Be Vietnam Pro',
    label: 'Space Grotesk',
  },

  // Border Radius
  borderRadius: {
    none: '0',
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },

  // Neo-brutalism Shadows
  shadows: {
    'neo-md': '4px 4px 0px 0px rgba(0,0,0,1)',
    'neo-lg': '6px 6px 0px 0px rgba(0,0,0,1)',
    'neo-xl': '8px 8px 0px 0px rgba(0,0,0,1)',
  },

  // Spacing
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },

  // Font Weights
  fontWeights: {
    regular: '400',
    medium: '500',
    bold: '700',
    black: '900',
  },

  // Font Sizes
  fontSizes: {
    'xs': '0.75rem',
    'sm': '0.875rem',
    'md': '1rem',
    'lg': '1.125rem',
    'xl': '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '6rem',
  },

  // Layer utilities
  zIndex: {
    hide: '-1',
    auto: 'auto',
    base: '0',
    dropdown: '1000',
    sticky: '1020',
    fixed: '1030',
    modal: '1040',
    popover: '1050',
    tooltip: '1060',
  },
};

module.exports = campuspulseTokens;
