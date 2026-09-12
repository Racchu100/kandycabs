/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kandy: {
          orange: '#F26A21',
          orangeHover: '#D85813',
          orangeLight: '#FFF1E8',
          ink: '#15171C',
          inkLight: '#2C3038',
          bg: '#F1F2F4',
          card: '#FFFFFF',
          border: '#E2E4E8',
          muted: '#6E7480',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        widget: '14px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(21, 23, 28, 0.08)',
        widget: '0 10px 30px -5px rgba(21, 23, 28, 0.15)',
        dropdown: '0 12px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
