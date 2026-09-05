import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f4efe6',
        ink: '#1a1712',
        accent: '#1f4e46',
        gold: '#b8893a',
        soft: '#5c564c',
      },
      fontFamily: { sans: ['Vazirmatn Variable', 'Vazirmatn', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
