import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/admin/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
