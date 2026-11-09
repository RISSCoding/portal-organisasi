import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #000000)',
        'primary-foreground': '#ffffff',
      },
    },
  },
  plugins: [],
};
export default config;
