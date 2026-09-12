/**
 * Kandy Cabs Design Tokens & Theme Specification
 * Shared across Next.js Tailwind configuration and React Native apps.
 */

export const KANDY_THEME = {
  colors: {
    primary: '#F26A21', // Kandy Cabs Orange
    primaryHover: '#D85813',
    primaryLight: '#FFF1E8',
    ink: '#15171C', // Ink Black
    inkLight: '#2C3038',
    bg: '#F1F2F4', // Light Gray background
    white: '#FFFFFF',
    textMuted: '#6E7480',
    border: '#E2E4E8',
    borderDark: '#C9CED6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      heading: 'Plus Jakarta Sans, Inter, sans-serif',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
  },
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.625rem', // 10px (Card default)
    lg: '0.875rem', // 14px (Booking widget / dialogs)
    full: '9999px',
  },
  shadows: {
    card: '0 4px 20px -2px rgba(21, 23, 28, 0.08)',
    widget: '0 10px 30px -5px rgba(21, 23, 28, 0.15)',
    dropdown: '0 12px 32px rgba(0, 0, 0, 0.12)',
  },
};
