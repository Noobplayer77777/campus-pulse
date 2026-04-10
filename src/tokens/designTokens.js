/**
 * Design Tokens - College Events Management System
 * Extracted from Figma design system
 * Neo-brutalism theme with vibrant accent colors
 */

const colors = {
  // Dark Colors for Neo-brutalism
  'brand-black': '#0a0a0a',
  'brand-dark': '#1a1a1a',
  'brand-gray': '#2d2d2d',
  
  // Primary Brand Colors
  'brand-accent': '#ff006e',      // Bold pink/magenta
  'brand-accent-light': '#ff4d94',
  'brand-accent-dark': '#cc0056',
  
  // Secondary Brand Colors
  'brand-secondary': '#00f5ff',   // Cyan
  'brand-secondary-light': '#4dffff',
  'brand-secondary-dark': '#00cccc',
  
  // Success & Status
  'brand-success': '#06d6a0',     // Teal
  'brand-warning': '#ffa500',     // Orange
  'brand-error': '#ef476f',       // Red
  'brand-info': '#0066cc',        // Blue
  
  // Neutral Colors
  'brand-white': '#ffffff',
  'brand-bg': '#fafafa',
  'brand-surface': '#f5f5f5',
  'brand-border': '#e0e0e0',
  'brand-border-dark': '#cccccc',
  
  // Text Colors
  'brand-text': '#1a1a1a',
  'brand-text-secondary': '#666666',
  'brand-text-tertiary': '#999999',
  'brand-text-disabled': '#cccccc',
  
  // Semantic Colors
  'pending': '#ffa500',
  'approved': '#06d6a0',
  'rejected': '#ef476f',
  'cancelled': '#999999',
};

const typography = {
  'heading-xl': {
    fontSize: '2.5rem',      // 40px
    fontWeight: '700',
    lineHeight: '1.2',
    letterSpacing: '-0.02em',
  },
  'heading-lg': {
    fontSize: '2rem',        // 32px
    fontWeight: '700',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  'heading-md': {
    fontSize: '1.5rem',      // 24px
    fontWeight: '600',
    lineHeight: '1.4',
  },
  'heading-sm': {
    fontSize: '1.25rem',     // 20px
    fontWeight: '600',
    lineHeight: '1.4',
  },
  'heading-xs': {
    fontSize: '1.125rem',    // 18px
    fontWeight: '600',
    lineHeight: '1.5',
  },
  'body-lg': {
    fontSize: '1.125rem',    // 18px
    fontWeight: '400',
    lineHeight: '1.6',
  },
  'body-md': {
    fontSize: '1rem',        // 16px
    fontWeight: '400',
    lineHeight: '1.5',
  },
  'body-sm': {
    fontSize: '0.875rem',    // 14px
    fontWeight: '400',
    lineHeight: '1.5',
  },
  'body-xs': {
    fontSize: '0.75rem',     // 12px
    fontWeight: '400',
    lineHeight: '1.4',
  },
  'label': {
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1.5',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  'button-lg': {
    fontSize: '1rem',
    fontWeight: '600',
    lineHeight: '1.5',
  },
  'button-md': {
    fontSize: '0.875rem',
    fontWeight: '600',
    lineHeight: '1.5',
  },
  'button-sm': {
    fontSize: '0.75rem',
    fontWeight: '600',
    lineHeight: '1.4',
  },
};

const spacing = {
  'xs': '0.25rem',   // 4px
  'sm': '0.5rem',    // 8px
  'md': '1rem',      // 16px
  'lg': '1.5rem',    // 24px
  'xl': '2rem',      // 32px
  '2xl': '3rem',     // 48px
  '3xl': '4rem',     // 64px
  '4xl': '5rem',     // 80px
};

const borderRadius = {
  'none': '0px',
  'sm': '0.25rem',   // 4px
  'md': '0.5rem',    // 8px
  'lg': '1rem',      // 16px
  'xl': '1.5rem',    // 24px
  'full': '9999px',
};

const shadows = {
  'none': 'none',
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  // Neo-brutalism bold shadows
  'neo-sm': '3px 3px 0px rgba(0, 0, 0, 0.1)',
  'neo-md': '6px 6px 0px rgba(0, 0, 0, 0.15)',
  'neo-lg': '8px 8px 0px rgba(0, 0, 0, 0.2)',
  'neo-xl': '12px 12px 0px rgba(0, 0, 0, 0.25)',
  // Neon glow shadows
  'neon-pink': '0 0 20px rgba(255, 0, 110, 0.6)',
  'neon-cyan': '0 0 20px rgba(0, 245, 255, 0.6)',
};

const transitionDuration = {
  'fastest': '75ms',
  'faster': '100ms',
  'fast': '150ms',
  'base': '200ms',
  'slow': '300ms',
  'slower': '500ms',
  'slowest': '1000ms',
};

const breakpoints = {
  'xs': '320px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
};

const zIndex = {
  'hide': '-1',
  'auto': 'auto',
  'base': '0',
  'dropdown': '1000',
  'sticky': '1020',
  'fixed': '1030',
  'modal-backdrop': '1040',
  'modal': '1050',
  'popover': '1060',
  'tooltip': '1070',
  'notification': '1080',
};

const buttonSizes = {
  'xs': {
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    height: '1.75rem',
  },
  'sm': {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    height: '2rem',
  },
  'md': {
    padding: '0.625rem 1.25rem',
    fontSize: '1rem',
    height: '2.5rem',
  },
  'lg': {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    height: '3rem',
  },
  'xl': {
    padding: '1rem 2rem',
    fontSize: '1.125rem',
    height: '3.5rem',
  },
};

const componentDefaults = {
  button: {
    borderRadius: borderRadius.md,
    fontWeight: '600',
    transition: `all ${transitionDuration.fast}`,
  },
  card: {
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    backgroundColor: colors['brand-white'],
  },
  input: {
    borderRadius: borderRadius.md,
    fontSize: typography['body-md'].fontSize,
    padding: spacing.md,
  },
  modal: {
    borderRadius: borderRadius.xl,
    boxShadow: shadows['2xl'],
    backgroundColor: colors['brand-white'],
    zIndex: zIndex.modal,
  },
  badge: {
    borderRadius: borderRadius.full,
    fontSize: typography['body-xs'].fontSize,
    fontWeight: '600',
  },
};

// Animation easings
const easing = {
  'linear': 'linear',
  'ease': 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  'cubic-bezier': 'cubic-bezier(0.4, 0, 0.2, 1)',
};

module.exports = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitionDuration,
  breakpoints,
  zIndex,
  buttonSizes,
  componentDefaults,
  easing,
};
