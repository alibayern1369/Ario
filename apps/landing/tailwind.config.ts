import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--ario-bg)',
        ink: 'var(--ario-ink)',
        accent: 'var(--ario-accent)',
        gold: 'var(--ario-cyan)',
        soft: 'var(--ario-ink-soft)',
      },
      fontFamily: { sans: ['Vazirmatn Variable', 'Vazirmatn', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
