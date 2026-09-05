import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--ario-bg)',
        elevated: 'var(--ario-bg-elevated)',
        ink: 'var(--ario-ink)',
        soft: 'var(--ario-ink-soft)',
        muted: 'var(--ario-muted)',
        accent: 'var(--ario-accent)',
        gold: 'var(--ario-gold)',
        mine: 'var(--ario-mine)',
        theirs: 'var(--ario-theirs)',
      },
      fontFamily: {
        sans: ['var(--ario-font)'],
      },
      borderRadius: {
        ario: 'var(--ario-radius)',
        'ario-lg': 'var(--ario-radius-lg)',
      },
      boxShadow: {
        ario: 'var(--ario-shadow)',
        'ario-lg': 'var(--ario-shadow-lg)',
      },
    },
  },
  plugins: [],
};

export default config;
